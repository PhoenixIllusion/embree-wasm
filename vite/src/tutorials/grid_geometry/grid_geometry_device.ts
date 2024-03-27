/*
Based on
https://github.com/embree/embree/blob/master/tutorials/grid_geometry/
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/grid_geometry/grid_geometry_device.cpp
*/


import { vec3, vec4 } from "gl-matrix";
import { Embree, RTC, embree } from "../common/embree";
import { ISPCCamera } from "../common/tutorial/camera";
import { Grid, SIZE_OF_GRID, SIZE_OF_TRIANGLE, SIZE_OF_VERTEX, Vertex, wrapArrayAsGrid, wrapArrayAsTriangle, wrapArrayAsVertex } from "../common/tutorial/geometry";
import { TutorialApplication } from "../common/tutorial/tutorial";
import { M_PI, clamp, cos, floor, min, sin } from "../common/math/math";
import { float } from "../common/types";
import Noise from 'noise-ts'

import THIS_URL from './grid_geometry_device.ts?url';
import { GRID_RESOLUTION_X, GRID_RESOLUTION_Y, NUM_FACES, NUM_INDICES, NUM_VERTICES, sphere_faces, sphere_indices } from "./data";


interface GridMesh {
  geom: Embree.Geometry;
  geomNormals?: Embree.Geometry;
  egrids: Grid[];
  vertices: Vertex[];
  normals: Vertex[];
};

interface HGrid {
  startVertexID: number,
  strideX: number,
  strideY: number,
  width: number,
  height: number
}

const V = {
  dir: vec3.create(),
  color: vec3.create(),
  lightDir: vec3.create(),
  Ng: vec3.create(),
  diffuse: vec3.create(),

  shadowOrig: vec3.create(),
  shadowDir: vec3.create(),
  shadow_fx: vec3.create(),

  N0: vec3.create(),
  N1: vec3.create()
}
const noise = new Noise(Math.E);

export function mylerp(out: vec3, f: float, a: vec3, b: vec3): vec3 {
  vec3.scale(out, a, 1 - f);
  vec3.scaleAndAdd(out, out, b, f);
  return out;
}

function displacement(P: vec3): float {
  let [x, y, z] = P;

  const scale = 0.5
  const freq = 5;

  x *= freq;
  y *= freq;
  z *= freq;
  /*
  const dx = cos(x*freq)*scale + (1-scale);
  const dy = cos(y*freq)*scale + (1-scale);
  const dz = sin(z*freq)*scale + (1-scale);*/
  return noise.perlin3(x, y, z) * scale + 1 - scale;
}

function _getVertex(gmesh: GridMesh, grid: HGrid, x: number, y: number): vec3 {
  y = Math.floor(y);
  x = Math.floor(x);
  const startVertexID = grid.startVertexID;
  const strideX = grid.strideX;
  const strideY = grid.strideY;
  return gmesh.vertices[startVertexID + y * strideY + x * strideX].vec3;
}

function getVertex(gmesh: GridMesh, subdiv: Embree.Geometry, hgrids: HGrid[], firstHalfEdge: number, f: number, i: number, x: number, y: number, opt: vec3): vec3 {
  const width = 0 | hgrids[firstHalfEdge].width;
  const height = 0 | hgrids[firstHalfEdge].height;
  if (x < 0) {
    const edge = RTC.getGeometryPreviousHalfEdge(subdiv, firstHalfEdge);
    const oedge = RTC.getGeometryOppositeHalfEdge(subdiv, 0, edge);
    if (oedge == edge) return opt; // return alternative vertex when requested vertex does not exist
    return _getVertex(gmesh, hgrids[oedge], y, 1);
  }
  else if (y < 0) {
    const oedge = RTC.getGeometryOppositeHalfEdge(subdiv, 0, firstHalfEdge);
    if (oedge == firstHalfEdge) return opt; // return alternative vertex when requested vertex does not exist
    const noedge = RTC.getGeometryNextHalfEdge(subdiv, oedge);
    return _getVertex(gmesh, hgrids[noedge], 1, x);
  }
  else if (x >= width) {
    const nedge = RTC.getGeometryNextHalfEdge(subdiv, firstHalfEdge);
    return _getVertex(gmesh, hgrids[nedge], y, hgrids[nedge].height - 2);
  }
  else if (y >= height) {
    const pedge = RTC.getGeometryPreviousHalfEdge(subdiv, firstHalfEdge);
    return _getVertex(gmesh, hgrids[pedge], hgrids[pedge].height - 2, x);
  }
  else {
    return _getVertex(gmesh, hgrids[firstHalfEdge], x, y);
  }
}


export default class GridGeometryTutorial extends TutorialApplication {

  protected g_scene!: Embree.Scene;

  private rayHit!: Embree.RTCRayHit;
  private shadow!: Embree.RTCRay;
  private shadowRH!: Embree.RTCRayHit;

  protected gmesh!: GridMesh;

  constructor() {
    super('CurveGeometryTutorial', [], 50, 50);
    vec3.set(this.camera.from, 2, 3, -2);
    vec3.set(this.camera.to, 0, 0, 0);
  }


  createGridGeometry(g_scene: Embree.Scene) {
    const sphere_vertices_ptr = embree.allocAlignedTypedArray(4 * 20, 16, Float32Array);
    sphere_vertices_ptr.fill(1);
    const sphere_vertices = wrapArrayAsVertex(sphere_vertices_ptr);

    /* calculates top vertex ring */
    for (let i = 0; i < 5; i++) {
      const theta = 45.0 * (M_PI) / 180.0;
      const phi = 72.0 * i * (M_PI) / 180.0;
      vec3.set(sphere_vertices[i].vec3, sin(theta) * sin(phi), cos(theta), sin(theta) * cos(phi));
    }

    /* calculates center vertex ring */
    for (let i = 0; i < 10; i++) {
      const theta = 90.0 * (M_PI) / 180.0;
      const phi = (18.0 + 36.0 * i) * (M_PI) / 180.0;
      vec3.set(sphere_vertices[5 + i].vec3, sin(theta) * sin(phi), cos(theta), sin(theta) * cos(phi));
    }

    /* calculates bottom vertex ring */
    for (let i = 0; i < 5; i++) {
      const theta = 135.0 * (M_PI) / 180.0;
      const phi = 72.0 * i * (M_PI) / 180.0;
      vec3.set(sphere_vertices[5 + 10 + i].vec3, sin(theta) * sin(phi), cos(theta), sin(theta) * cos(phi));
    }

    const sphere_indices_p = embree.copyAlignedTypedArray(sphere_indices, 16, Uint32Array);
    const sphere_faces_p = embree.copyAlignedTypedArray(sphere_faces, 16, Uint32Array);

    /* temporary subdivision geometry to evaluate base surface */
    const geomSubdiv = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_SUBDIVISION);
    RTC.setSharedGeometryBuffer(geomSubdiv, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, sphere_vertices_ptr.byteOffset, 0, SIZE_OF_VERTEX, NUM_VERTICES);
    RTC.setSharedGeometryBuffer(geomSubdiv, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT, sphere_indices_p.byteOffset, 0, 4, NUM_INDICES);
    RTC.setSharedGeometryBuffer(geomSubdiv, embree.RTC_BUFFER_TYPE_FACE, 0, embree.RTC_FORMAT_UINT, sphere_faces_p.byteOffset, 0, 4, NUM_FACES);
    RTC.commitGeometry(geomSubdiv);

    const SUB_GRID_RESOLUTION_X = Math.floor(GRID_RESOLUTION_X / 2) + 1;
    const SUB_GRID_RESOLUTION_Y = Math.floor(GRID_RESOLUTION_Y / 2) + 1;

    /* grid resolution for quads */
    const QUAD_GRID_RESOLUTION_X = GRID_RESOLUTION_X;
    const QUAD_GRID_RESOLUTION_Y = GRID_RESOLUTION_Y;

    /* each quad becomes one grid, other faces become multiple grids */
    let numGrids = 0;
    let numVertices = 0;
    for (let f = 0; f < NUM_FACES; f++) {
      if (sphere_faces[f] == 4) {
        numGrids++;
        numVertices += QUAD_GRID_RESOLUTION_X * QUAD_GRID_RESOLUTION_Y;
      }
      else {
        numGrids += sphere_faces[f];
        numVertices += sphere_faces[f] * SUB_GRID_RESOLUTION_X * SUB_GRID_RESOLUTION_Y;
      }
    }

    const geom = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_GRID);
    const vertices_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, numVertices);
    const vertices_p = embree.wrapTypedArray(vertices_ptr, numVertices * 4, Float32Array);
    vertices_p.fill(1);
    const vertices = wrapArrayAsVertex(vertices_p);
    const normals_p = embree.allocAlignedTypedArray(numVertices * 4, 16, Float32Array);
    normals_p.fill(1);
    const normals = wrapArrayAsVertex(normals_p);
    const egrids_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_GRID, 0, embree.RTC_FORMAT_GRID, SIZE_OF_GRID, numGrids);
    const egrids_p = embree.wrapTypedArray(egrids_ptr, numGrids * 3, Uint32Array);
    egrids_p.fill(1);
    const egrids = wrapArrayAsGrid(egrids_p);

    const gmesh: GridMesh = this.gmesh = {
      geom,
      vertices,
      normals,
      egrids
    }

    const hgrids: HGrid[] = [];

    const interpolate_ptr = embree.allocAlignedTypedArray(12, 4, Float32Array);
    const P = interpolate_ptr.subarray(0, 4);
    const dPdu = interpolate_ptr.subarray(4, 8);
    const dPdv = interpolate_ptr.subarray(8, 12);

    let g = 0; // grid index for embree grids
    let h = 0; // grid index for helper grids
    let startVertexIndex = 0;

    const crossV = vec3.create();

    for (let f = 0; f < NUM_FACES; f++) {
      if (sphere_faces[f] == 4) {
        egrids[g].startVertexID = startVertexIndex;
        egrids[g].stride = QUAD_GRID_RESOLUTION_X;
        egrids[g].width = QUAD_GRID_RESOLUTION_X;
        egrids[g].height = QUAD_GRID_RESOLUTION_Y;

        hgrids[h] = {} as HGrid;
        hgrids[h].startVertexID = startVertexIndex;
        hgrids[h].strideX = 1;
        hgrids[h].strideY = QUAD_GRID_RESOLUTION_X;
        hgrids[h].width = QUAD_GRID_RESOLUTION_X / 2 + 1;
        hgrids[h].height = QUAD_GRID_RESOLUTION_Y / 2 + 1;
        h++;

        hgrids[h] = {} as HGrid;
        hgrids[h].startVertexID = startVertexIndex + QUAD_GRID_RESOLUTION_X - 1;
        hgrids[h].strideX = QUAD_GRID_RESOLUTION_X;
        hgrids[h].strideY = -1;
        hgrids[h].width = QUAD_GRID_RESOLUTION_X / 2 + 1;
        hgrids[h].height = QUAD_GRID_RESOLUTION_Y / 2 + 1;
        h++;

        hgrids[h] = {} as HGrid;
        hgrids[h].startVertexID = startVertexIndex + QUAD_GRID_RESOLUTION_X * QUAD_GRID_RESOLUTION_Y - 1;
        hgrids[h].strideX = -1;
        hgrids[h].strideY = -(0 | QUAD_GRID_RESOLUTION_X);
        hgrids[h].width = QUAD_GRID_RESOLUTION_X / 2 + 1;
        hgrids[h].height = QUAD_GRID_RESOLUTION_Y / 2 + 1;
        h++;

        hgrids[h] = {} as HGrid;
        hgrids[h].startVertexID = startVertexIndex + (QUAD_GRID_RESOLUTION_X - 1) * QUAD_GRID_RESOLUTION_Y;
        hgrids[h].strideX = -(0 | QUAD_GRID_RESOLUTION_X);
        hgrids[h].strideY = 1;
        hgrids[h].width = QUAD_GRID_RESOLUTION_X / 2 + 1;
        hgrids[h].height = QUAD_GRID_RESOLUTION_Y / 2 + 1;
        h++;

        /* calculate displaced vertices for quad-face */
        for (let y = 0; y < QUAD_GRID_RESOLUTION_Y; y++) {
          for (let x = 0; x < QUAD_GRID_RESOLUTION_X; x++) {
            const u = x / (QUAD_GRID_RESOLUTION_X - 1);
            const v = y / (QUAD_GRID_RESOLUTION_Y - 1);

            /* evaluate subdiv surface and displace points */
            RTC.interpolate1(geomSubdiv, f, u, v, embree.RTC_BUFFER_TYPE_VERTEX, 0, P.byteOffset, dPdu.byteOffset, dPdv.byteOffset, 3);

            vec3.cross(crossV, dPdu, dPdv);
            vec3.normalize(crossV, crossV);
            vec3.scaleAndAdd(P, P, crossV, displacement(P))

            /* write result to vertex buffer */
            vec3.copy(vertices[startVertexIndex + y * QUAD_GRID_RESOLUTION_X + x].vec3, P);
            vec3.set(normals[startVertexIndex + y * QUAD_GRID_RESOLUTION_X + x].vec3, 0, 0, 0); // calculated later
          }
        }
        startVertexIndex += QUAD_GRID_RESOLUTION_X * QUAD_GRID_RESOLUTION_Y;
        g++;
      }
      else {
        /* iterate over all sub-faces */
        for (let i = 0; i < sphere_faces[f]; i++) {
          egrids[g].startVertexID = startVertexIndex;
          egrids[g].stride = SUB_GRID_RESOLUTION_X;
          egrids[g].width = SUB_GRID_RESOLUTION_X;
          egrids[g].height = SUB_GRID_RESOLUTION_Y;

          hgrids[h] = {} as HGrid;
          hgrids[h].startVertexID = startVertexIndex;
          hgrids[h].strideX = 1;
          hgrids[h].strideY = SUB_GRID_RESOLUTION_X;
          hgrids[h].width = SUB_GRID_RESOLUTION_X;
          hgrids[h].height = SUB_GRID_RESOLUTION_Y;
          h++;

          /* calculate displaced vertices for sub-face */
          for (let y = 0; y < SUB_GRID_RESOLUTION_Y; y++) {
            for (let x = 0; x < SUB_GRID_RESOLUTION_X; x++) {
              const u = x / (SUB_GRID_RESOLUTION_X - 1);
              const v = y / (SUB_GRID_RESOLUTION_Y - 1);

              /* encode UVs */
              const h = (i >> 2) & 3, l = i & 3;
              const U = 2.0 * l + 0.5 + u;
              const V = 2.0 * h + 0.5 + v;

              /* evaluate subdiv surface and displace points */
              //TODO: Note, the below line is the correct version, the one below was a typo that looks cooler
              RTC.interpolate1(geomSubdiv, f, U, V, embree.RTC_BUFFER_TYPE_VERTEX, 0, P.byteOffset, dPdu.byteOffset, dPdv.byteOffset, 3);
              //RTC.interpolate1(geomSubdiv,f,u,v, embree.RTC_BUFFER_TYPE_VERTEX,0,P.byteOffset,dPdu.byteOffset,dPdv.byteOffset,3);

              vec3.cross(crossV, dPdu, dPdv);
              vec3.normalize(crossV, crossV);
              vec3.scaleAndAdd(P, P, crossV, displacement(P))

              /* write result to vertex buffer */
              vec3.copy(vertices[startVertexIndex + y * SUB_GRID_RESOLUTION_X + x].vec3, P);
              vec3.set(normals[startVertexIndex + y * SUB_GRID_RESOLUTION_X + x].vec3, 0, 0, 0); // calculated later
            }
          }
          startVertexIndex += SUB_GRID_RESOLUTION_X * SUB_GRID_RESOLUTION_Y;
          g++;
        }
      }
    }
    const Ng = vec3.create();

    const a = vec3.create();
    const b = vec3.create();
    const c = vec3.create();

    function crossSub(v0: vec3, v1: vec3, v2: vec3, v3: vec3): vec3 {
      vec3.sub(a, v0, v1);
      vec3.sub(b, v2, v3);
      return vec3.cross(c, a, b);
    }

    /* calculate normals by averaging normals of neighboring faces */
    h = 0;
    for (let f = 0; f < NUM_FACES; f++) {
      for (let i = 0; i < sphere_faces[f]; i++) {
        for (let y = 0; y < SUB_GRID_RESOLUTION_Y; y++) {
          for (let x = 0; x < SUB_GRID_RESOLUTION_X; x++) {
            const p = _getVertex(gmesh, hgrids[h + i], x, y);
            const pr = getVertex(gmesh, geomSubdiv, hgrids, h + i, f, i, x + 1, y, p);
            const pl = getVertex(gmesh, geomSubdiv, hgrids, h + i, f, i, x - 1, y, p);
            const pt = getVertex(gmesh, geomSubdiv, hgrids, h + i, f, i, x, y + 1, p);
            const pb = getVertex(gmesh, geomSubdiv, hgrids, h + i, f, i, x, y - 1, p);
            vec3.set(Ng, 0, 0, 0);
            vec3.add(Ng, Ng, crossSub(p, pr, p, pt));
            vec3.add(Ng, Ng, crossSub(p, pt, p, pl));
            vec3.add(Ng, Ng, crossSub(p, pl, p, pb));
            vec3.add(Ng, Ng, crossSub(p, pb, p, pr));
            vec3.normalize(Ng, Ng);
            const grid = hgrids[h + i];
            const index = grid.startVertexID + y * grid.strideY + x * grid.strideX;
            vec3.copy(gmesh.normals[index].vec3, Ng);
          }
        }
      }
      /* First special corner at (0,0). A different number than 4 faces may be 
       connected to this vertex. We need to walk all neighboring faces to 
       calculate a consistent normal. */
      for (let i = 0; i < sphere_faces[f]; i++) {
        /* find start of ring */
        let first = true;
        let startEdge = h + i;
        while (first || startEdge != h + i) {
          first = false;
          const oedge = RTC.getGeometryOppositeHalfEdge(geomSubdiv, 0, startEdge);
          if (oedge == startEdge) break;
          startEdge = RTC.getGeometryNextHalfEdge(geomSubdiv, oedge);
        }

        /* walk ring beginning at start */
        first = true;
        let edge = startEdge;
        vec3.set(Ng, 0, 0, 0);
        const p = _getVertex(gmesh, hgrids[edge], 0, 0);
        while (first || edge != startEdge) {
          first = false;
          const nedge = RTC.getGeometryNextHalfEdge(geomSubdiv, edge);
          const pedge = RTC.getGeometryPreviousHalfEdge(geomSubdiv, edge);
          const p0 = _getVertex(gmesh, hgrids[nedge], 0, 0);
          const p1 = _getVertex(gmesh, hgrids[pedge], 0, 0);
          vec3.add(Ng, Ng, crossSub(p, p0, p, p1));

          const oedge = RTC.getGeometryOppositeHalfEdge(geomSubdiv, 0, pedge);
          if (oedge == pedge) break;
          edge = oedge;
        }

        vec3.normalize(Ng, Ng);
        vec3.copy(gmesh.normals[hgrids[h + i].startVertexID].vec3, Ng);
      }

      /* Last special corner at (width-1,height-1). This fixes the center corner 
         for non-quad faces. We need to walk all sub-faces to calculate a 
         consistent normal. */

      vec3.set(Ng, 0, 0, 0);
      for (let i = 0; i < sphere_faces[f]; i++) {
        const grid = hgrids[h + i];
        const p = _getVertex(gmesh, grid, grid.width - 1, grid.height - 1);
        const pl = _getVertex(gmesh, grid, grid.width - 2, grid.height - 1);
        const pr = _getVertex(gmesh, grid, grid.width - 1, grid.height - 2);
        vec3.add(Ng, Ng, crossSub(p, pl, p, pr));
      }
      vec3.normalize(Ng, Ng);

      for (let i = 0; i < sphere_faces[f]; i++) {
        const grid = hgrids[h + i];
        vec3.copy(gmesh.normals[grid.startVertexID + (grid.height - 1) * grid.strideY + (grid.width - 1) * grid.strideX].vec3, Ng);
      }

      h += sphere_faces[f];
    }


    /* we do not need this temporary data anymore */
    RTC.releaseGeometry(geomSubdiv);

    RTC.commitGeometry(gmesh.geom);
    RTC.attachGeometry(this.g_scene, gmesh.geom);
  }

  addGroundPlane(scene_i: Embree.Scene) {
    /* create a triangulated plane with 2 triangles and 4 vertices */
    const geom = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_TRIANGLE);

    /* set vertices */
    const vertices_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, 4);
    const vertices = wrapArrayAsVertex(embree.wrapTypedArray(vertices_ptr, 16, Float32Array));
    vertices[0].x = -15; vertices[0].y = -2; vertices[0].z = -15;
    vertices[1].x = -15; vertices[1].y = -2; vertices[1].z = +15;
    vertices[2].x = +15; vertices[2].y = -2; vertices[2].z = -15;
    vertices[3].x = +15; vertices[3].y = -2; vertices[3].z = +15;

    /* set triangles */
    const triangles_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT3, SIZE_OF_TRIANGLE, 2);
    const triangles = wrapArrayAsTriangle(embree.wrapTypedArray(triangles_ptr, 6, Uint32Array));
    triangles[0].v0 = 0; triangles[0].v1 = 1; triangles[0].v2 = 2;
    triangles[1].v0 = 1; triangles[1].v1 = 3; triangles[1].v2 = 2;

    RTC.commitGeometry(geom);
    const geomID = RTC.attachGeometry(scene_i, geom);
    RTC.releaseGeometry(geom);
    return geomID;
  }

  device_init(): void {
    this.g_device = RTC.newDevice('verbose=0,threads=1,tessellation_cache_size=1');
    this.rayHit = embree.allocRTCRayHit();
    this.shadowRH = embree.allocRTCRayHit();
    this.shadow = this.shadowRH.ray;
    /* create scene */
    const g_scene = this.g_scene = RTC.newScene(this.g_device);

    /* add ground plane */
    this.addGroundPlane(this.g_scene);

    this.createGridGeometry(g_scene);

    RTC.commitScene(this.g_scene);
  }

  device_cleanup(): void {

  }

  renderPixelStandard(outPixel: vec4, x: number, y: number, width: number, height: number, time: number, camera: ISPCCamera): vec4 {
    if (!this.rayHit) {
      this.rayHit = embree.allocRTCRayHit();
      this.shadow = new embree.RTCRay();
    }
    const rayHit = this.rayHit;
    const ray = rayHit.ray;
    const hit = rayHit.hit;
    rayHit.ray = camera.setRayOrigin(rayHit.ray)
    ray.tnear = 0;
    ray.tfar = 1e30;
    ray.mask = -1;
    hit.geomID = hit.primID = -1;
    const v = V;
    camera.setRayDir(v.dir, x, y);
    [rayHit.ray.dir_x, rayHit.ray.dir_y, rayHit.ray.dir_z] = v.dir;
    RTC.intersect1(this.g_scene, rayHit);

    vec3.set(v.color, 0, 0, 0);
    if (hit.geomID != -1) {

      if (hit.geomID != 0) {
        vec3.set(v.diffuse, 0.9, 0.6, 0.5);
      } else {
        vec3.set(v.diffuse, 0.8, 0.0, 0.0);
      }
      vec3.normalize(v.lightDir, vec3.set(v.lightDir, -1, -1, -1));

      const v3 = V;
      if (hit.geomID == 1) {
        const ray = hit; //code often switches to this, even though not true
        const egrid = this.gmesh.egrids[ray.primID];
        const startVertexID = egrid.startVertexID;
        const width = egrid.width;
        const height = egrid.height;
        const stride = egrid.stride;
        const U = ray.u * (width - 1);
        const V = ray.v * (height - 1);
        const x = min(floor(U), width - 2);
        const y = min(floor(V), height - 2);
        const u = U - x;
        const v = V - y;
        const N00 = this.gmesh.normals[startVertexID + (y + 0) * stride + (x + 0)];
        const N01 = this.gmesh.normals[startVertexID + (y + 0) * stride + (x + 1)];
        const N10 = this.gmesh.normals[startVertexID + (y + 1) * stride + (x + 0)];
        const N11 = this.gmesh.normals[startVertexID + (y + 1) * stride + (x + 1)];
        mylerp(v3.N0, u, N00.vec3, N01.vec3);
        mylerp(v3.N1, u, N10.vec3, N11.vec3);
        vec3.normalize(v3.Ng, mylerp(v3.Ng, v, v3.N0, v3.N1));
      } else {
        vec3.set(v3.Ng, hit.Ng_x, hit.Ng_y, hit.Ng_z);
      }
      vec3.scaleAndAdd(v.color, v.color, v.diffuse, 0.5);


      vec3.scaleAndAdd(v.shadowOrig, camera.xfm.p, v.dir, ray.tfar);
      vec3.negate(v.shadowDir, v.lightDir);
      const shadow = this.shadow;
      shadow.mask = -1;
      [shadow.org_x, shadow.org_y, shadow.org_z] = v.shadowOrig;
      [shadow.dir_x, shadow.dir_y, shadow.dir_z] = v.shadowDir;
      [shadow.tnear, shadow.tfar] = [0.001, 1e30];

      RTC.occluded1(this.g_scene, shadow);

      if (shadow.tfar >= 0) {
        const d = clamp(-vec3.dot(v.lightDir, v.Ng), 0, 1);
        vec3.scaleAndAdd(v.color, v.color, v.diffuse, d);
      }
    }

    const r = 255 * clamp(v.color[0], 0, 1)
    const g = 255 * clamp(v.color[1], 0, 1)
    const b = 255 * clamp(v.color[2], 0, 1)
    const a = 255
    return vec4.set(outPixel, r, g, b, a);
  }
}


const SIZE = 1200;
const WIDTH = SIZE;
const HEIGHT = SIZE;

export function run(START_TIME: number) {
  TutorialApplication.runTutorial(START_TIME, GridGeometryTutorial, 'canvas', WIDTH, HEIGHT);
}

export async function runWithWorker(START_TIME: number) {
  return TutorialApplication.runTutorialWithWorkers(START_TIME, GridGeometryTutorial, THIS_URL, 'canvas', WIDTH, HEIGHT, 6);
}