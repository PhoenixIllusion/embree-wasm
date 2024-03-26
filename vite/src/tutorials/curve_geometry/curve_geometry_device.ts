/*
Based on
https://github.com/embree/embree/tree/master/tutorials/curve_geometry
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/curve_geometry/curve_geometry_device.cpp
*/


import { vec3, vec4 } from "gl-matrix";
import { Embree, RTC, embree } from "../common/embree";
import { ISPCCamera } from "../common/tutorial/camera";
import { SIZE_OF_TRIANGLE, SIZE_OF_VERTEX, wrapArrayAsTriangle, wrapArrayAsVertex } from "../common/tutorial/geometry";
import { TutorialApplication } from "../common/tutorial/tutorial";
import { reflect } from "../common/tutorial/optics";
import { clamp } from "../common/math/math";
import { NUM_CURVES, NUM_VERTICES, static_hair_flags_linear, static_hair_indices, static_hair_indices_linear, static_hair_normals, static_hair_vertex_colors, static_hair_vertices } from "./data";
import { float, uint } from "../common/types";

import THIS_URL from './curve_geometry_device.ts?url';
import { StreamingData, setupRayStreamData } from "../common/tutorial/stream-rayhit";


const v = {
  dir: vec3.create(),
  color: vec3.create(),
  lightDir: vec3.create(),
  Ng: vec3.create(),
  diffuse: vec3.create(),

  shadowOrig: vec3.create(),
  shadowDir: vec3.create(),
  shadow_fx: vec3.create()
}

export default class CurveGeometryTutorial extends TutorialApplication {

  private g_scene!: Embree.Scene;

  private rayHit!: Embree.RTCRayHit;
  private shadow!: Embree.RTCRay;
  private shadowRH!: Embree.RTCRayHit;

  private hair_indices_linear!: Uint32Array;
  private hair_indices!: Uint32Array;
  private hair_normals!: Float32Array;
  private hair_flags_linear!: Uint8Array;
  private hair_vertex_colors!: Float32Array;

  constructor() {
    super('CurveGeometryTutorial',[],50,50);
    vec3.set(this.camera.from, -0.1188741848, 6.87527132, 7.228342533);
    vec3.set(this.camera.to, -0.1268435568, -1.961063862, -0.5809717178);
  }

  addCurve (scene: Embree.Scene, gtype: Embree.RTCGeometryType, pos: vec4 ) {
    const geom = RTC.newGeometry(this.g_device, gtype);
    RTC.setGeometryVertexAttributeCount(geom,1);

    if(gtype == embree.RTC_GEOMETRY_TYPE_CONE_LINEAR_CURVE || gtype == embree.RTC_GEOMETRY_TYPE_ROUND_LINEAR_CURVE || gtype == embree.RTC_GEOMETRY_TYPE_CONE_LINEAR_CURVE) {
      RTC.setSharedGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT,   this.hair_indices_linear.byteOffset,0, 4, NUM_CURVES);
    } else {
      RTC.setSharedGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT,   this.hair_indices.byteOffset,       0, 4, NUM_CURVES);
    }
    const verts_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT4, 16, NUM_VERTICES);
    const verts = embree.wrapTypedArray(verts_ptr, NUM_VERTICES * 4, Float32Array);
    for(let i=0; i< NUM_VERTICES;i++) {
      vec4.add(verts.subarray(i*4,(i+1)*4), pos, static_hair_vertices[i]);
    }
    if (gtype == embree.RTC_GEOMETRY_TYPE_NORMAL_ORIENTED_BEZIER_CURVE ||
        gtype == embree.RTC_GEOMETRY_TYPE_NORMAL_ORIENTED_BSPLINE_CURVE ||
        gtype == embree.RTC_GEOMETRY_TYPE_NORMAL_ORIENTED_CATMULL_ROM_CURVE) {
      RTC.setSharedGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_NORMAL, 0, embree.RTC_FORMAT_FLOAT3, this.hair_normals.byteOffset, 0, 16, NUM_VERTICES);
    }
    if (gtype == embree.RTC_GEOMETRY_TYPE_ROUND_LINEAR_CURVE || gtype == embree.RTC_GEOMETRY_TYPE_CONE_LINEAR_CURVE) {
      RTC.setSharedGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_FLAGS, 0, embree.RTC_FORMAT_UCHAR, this.hair_flags_linear.byteOffset, 0, 1, NUM_CURVES);
    }

    RTC.setSharedGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_VERTEX_ATTRIBUTE, 0, embree.RTC_FORMAT_FLOAT3, this.hair_vertex_colors.byteOffset, 0, 16, NUM_VERTICES);
    RTC.commitGeometry(geom);
    const geomID = RTC.attachGeometry(scene,geom);
    RTC.releaseGeometry(geom);
    return geomID;
  }

  addGroundPlane (scene_i: Embree.Scene)
  {
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
    const geomID = RTC.attachGeometry(scene_i,geom);
    RTC.releaseGeometry(geom);
    return geomID;
  }

  device_init(): void {
    this.g_device = RTC.newDevice('verbose=0,threads=1,tessellation_cache_size=0');
    this.rayHit = embree.allocRTCRayHit();
    this.shadowRH = embree.allocRTCRayHit();
    this.shadow = this.shadowRH.ray;

    this.hair_indices = embree.copyAlignedTypedArray(static_hair_indices, 4, Uint32Array);
    this.hair_indices_linear = embree.copyAlignedTypedArray(static_hair_indices_linear, 4, Uint32Array);

    this.hair_flags_linear = embree.allocTypedArray(static_hair_flags_linear.length, Uint8Array);
    this.hair_flags_linear.set(static_hair_flags_linear);

    const normals = static_hair_normals.map(([x,y,z])=> ([x,y,z,1]) ).flat();
    this.hair_normals = embree.copyAlignedTypedArray(normals, 4, Float32Array);

    const colors = static_hair_vertex_colors.map(([x,y,z])=> ([x,y,z,1]) ).flat();
    this.hair_vertex_colors = embree.copyAlignedTypedArray(colors, 4, Float32Array);

    /* create scene */
    const g_scene = this.g_scene = RTC.newScene(this.g_device);
    
    /* add ground plane */
    this.addGroundPlane(this.g_scene);

      /* add curves */
      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_CONE_LINEAR_CURVE, [-5.5, 0.0, 3., 0.0]);
      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_ROUND_LINEAR_CURVE, [-2.5, 0.0, 3., 0.0]);
      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_FLAT_BSPLINE_CURVE, [0.5, 0.0, 3., 0.0]);
      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_ROUND_BSPLINE_CURVE, [3.5, 0.0, 3., 0.0]);
      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_NORMAL_ORIENTED_BSPLINE_CURVE, [+6.0, 0.0, 3., 0.0]);

      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_FLAT_LINEAR_CURVE, [-4.5, 0.0, -2., 0.0]);
      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_FLAT_CATMULL_ROM_CURVE, [-1.5, 0.0, -2., 0.0]);
      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_ROUND_CATMULL_ROM_CURVE, [1.5, 0.0, -2., 0.0]);
      this.addCurve(g_scene, embree.RTC_GEOMETRY_TYPE_NORMAL_ORIENTED_CATMULL_ROM_CURVE, [+4.5, 0.0, -2., 0.0]);

    RTC.commitScene (this.g_scene);
  }

  device_cleanup(): void {
    
  }

  interpolate_linear(out: vec3, primID: uint, u: float)
  {
    const c0 = static_hair_vertex_colors[primID+1];
    const c1 = static_hair_vertex_colors[primID+2];

    vec3.scale(out, c0, 1-u);
    vec3.scaleAndAdd(out, out, c1, u);
    return out;
  }

interpolate_bspline(out: vec3, primID: uint, u: float)
{
  const c0 = static_hair_vertex_colors[primID+0];
  const c1 = static_hair_vertex_colors[primID+1];
  const c2 = static_hair_vertex_colors[primID+2];
  const c3 = static_hair_vertex_colors[primID+3];
  const t  = u;
  const s  = 1.0 - u;
  const n0 = s*s*s;
  const n1 = (4.0*(s*s*s)+(t*t*t)) + (12.0*((s*t)*s) + 6.0*((t*s)*t));
  const n2 = (4.0*(t*t*t)+(s*s*s)) + (12.0*((t*s)*t) + 6.0*((s*t)*s));
  const n3 = t*t*t;


  vec3.scale(out, c0, n0);
  vec3.scaleAndAdd(out, out, c1, n1);
  vec3.scaleAndAdd(out, out, c2, n2);
  vec3.scaleAndAdd(out, out, c3, n3);
  vec3.scale(out, out, 1/6);

  return out;
}

interpolate_catmull_rom(out: vec3, primID: uint, u: float)
{
  const c0 = static_hair_vertex_colors[primID+0];
  const c1 = static_hair_vertex_colors[primID+1];
  const c2 = static_hair_vertex_colors[primID+2];
  const c3 = static_hair_vertex_colors[primID+3];
  const t  = u;
  const s  = 1.0 - u;
  const n0 = - t * s * s;
  const n1 = 2.0 + t * t * (3.0 * t - 5.0);
  const n2 = 2.0 + s * s * (3.0 * s - 5.0);
  const n3 = - s * t * t;

  vec3.scale(out, c0, n0);
  vec3.scaleAndAdd(out, out, c1, n1);
  vec3.scaleAndAdd(out, out, c2, n2);
  vec3.scaleAndAdd(out, out, c3, n3);
  vec3.scale(out, out, 1/2);

  return out;
}

  renderPixelStandard(outPixel: vec4, x: number, y: number, width: number, height: number, time: number, camera: ISPCCamera): vec4 {
    const rayHit = this.rayHit;
    const ray = rayHit.ray;
    const hit = rayHit.hit;
    rayHit.ray = camera.setRayOrigin(rayHit.ray)
    ray.tnear = 0;
    ray.tfar = 1e30;
    ray.mask = -1;
    hit.geomID = hit.primID = -1;

    camera.setRayDir(v.dir, x, y);
    [rayHit.ray.dir_x, rayHit.ray.dir_y,rayHit.ray.dir_z] = v.dir;
    RTC.intersect1(this.g_scene, rayHit);


    vec3.set(v.color, 0, 0, 0);
    if(hit.geomID != -1) {
      vec3.set(v.diffuse, 1, 0, 0)

      if (hit.geomID > 0)
      {
        switch (hit.geomID) {
        case 1: case 2: case 6: this.interpolate_linear(v.diffuse, hit.primID, hit.u); break;
        case 3: case 4: case 5: this.interpolate_bspline(v.diffuse,hit.primID,hit.u); break;
        case 7: case 8: case 9: this.interpolate_catmull_rom(v.diffuse,hit.primID,hit.u); break;
        }
  
        vec3.scale(v.diffuse, v.diffuse, 0.5);
      }


      vec3.set(v.Ng, hit.Ng_x, hit.Ng_y, hit.Ng_z);
      vec3.normalize(v.Ng, v.Ng);
      vec3.scaleAndAdd(v.color, v.color, v.diffuse, 0.5);
      vec3.normalize(v.lightDir, vec3.set(v.lightDir, -1, -1, -1));

      vec3.scaleAndAdd(v.shadowOrig, camera.xfm.p, v.dir, ray.tfar);
      vec3.negate(v.shadowDir, v.lightDir);
      const shadow = this.shadow;
      shadow.mask = -1;
      [shadow.org_x, shadow.org_y, shadow.org_z] = v.shadowOrig;
      [shadow.dir_x, shadow.dir_y, shadow.dir_z] = v.shadowDir;
      [shadow.tnear, shadow.tfar] = [0.001, 1e30];

      RTC.occluded1(this.g_scene, shadow);

      if(shadow.tfar >= 0) {
        vec3.normalize(v.shadow_fx, reflect(v.shadow_fx, v.dir, v.Ng))
        const s = Math.pow(clamp(vec3.dot(v.shadow_fx, v.lightDir), 0, 1), 10);
        const d = clamp(-vec3.dot(v.lightDir, v.Ng), 0, 1);

        vec3.set(v.shadow_fx, s, s, s);
        vec3.scaleAndAdd(v.color, v.color, v.diffuse, d);
        vec3.scaleAndAdd(v.color, v.color, v.shadow_fx, 0.5);
      }
    }

    const r = 255 * clamp(v.color[0], 0, 1)
    const g = 255 * clamp(v.color[1], 0, 1)
    const b = 255 * clamp(v.color[2], 0, 1)
    const a = 255
    return vec4.set(outPixel, r,g,b,a);
  }
  
  private streamData!: StreamingData;

  renderTileStandard(taskIndex: uint,
    _threadIndex: uint,
    pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    _numTilesY: uint, dX: number = 0, dY: number = 0, stride: number = 0) {
      if(this.streamData == undefined) {
        this.streamData = setupRayStreamData(embree, camera, this.TILE_SIZE_X, this.TILE_SIZE_Y)
      }

      const stream = this.streamData;
      const SHADOW_ENABLED = true;

      const tileY = Math.floor(taskIndex / numTilesX);
      const tileX = taskIndex - tileY * numTilesX;
      const x0 = tileX * this.TILE_SIZE_X;
      const x1 = Math.min(x0 + this.TILE_SIZE_X, width);
      const y0 = tileY * this.TILE_SIZE_Y;
      const y1 = Math.min(y0 + this.TILE_SIZE_Y, height);
      stride = stride || width;
      
      vec3.normalize(v.lightDir, vec3.set(v.lightDir, -1, -1, -1));

      let i = 0;
      for (let y=y0; y<y1; y++) for (let  x=x0; x<x1; x++)
      {
        embree.HEAPU8.set(stream.rayStreamCacheData, stream.rayStreamPtr[i]);
        camera.setRayDir(stream.rayStream[i++].ray.dir, x, y);
      }
      const STREAM_COUNT = stream.rayStreamPtr.length;
      RTC.intersect1M(this.g_scene, stream.rayStreamPtr.byteOffset, STREAM_COUNT, stream.rayStreamContext);
      let shadowCount = 0;
      for(let i=0;i<STREAM_COUNT;i++) {
        const color = stream.rayColorResults[i];
        vec3.set(color, 0, 0, 0);
        const hit = stream.rayStream[i].hit;
        if(hit.geomID[0] != -1 ) {
          const ray = stream.rayStream[i].ray;
          const diffuse = stream.rayDiffuseResults[i];

          vec3.set(diffuse, 1, 0, 0)

          if (hit.geomID[0] > 0)
          {
            switch (hit.geomID[0]) {
            case 1: case 2: case 6: this.interpolate_linear(diffuse, hit.primID[0], hit.UV[0]); break;
            case 3: case 4: case 5: this.interpolate_bspline(diffuse,hit.primID[0],hit.UV[0]); break;
            case 7: case 8: case 9: this.interpolate_catmull_rom(diffuse,hit.primID[0],hit.UV[0]); break;
            }
            vec3.scale(diffuse, diffuse, 0.5);
          }

          vec3.scaleAndAdd(color, color, diffuse, 0.5);


          
          if(SHADOW_ENABLED) {
            vec3.normalize(hit.Ng, hit.Ng);

            const shadowIndex = shadowCount++;
            stream.shadowIndex[shadowIndex] = i;
            const shadow = stream.shadowStream[shadowIndex];
  
            embree.HEAPU8.set(stream.shadowCache, stream.shadowStreamPtr[shadowIndex]);
  
            vec3.scaleAndAdd(shadow.orig, camera.xfm.p, ray.dir, ray.tfar[0]);
            vec3.negate(shadow.dir, v.lightDir);
            shadow.tnear[0] = 0.001;
          } else {
            const r = 255 * clamp(color[0], 0, 1)
            const g = 255 * clamp(color[1], 0, 1)
            const b = 255 * clamp(color[2], 0, 1)
            vec3.set(color, r, g, b);
          }
        }
      }
      if(SHADOW_ENABLED && shadowCount > 0) {
        RTC.occluded1M(this.g_scene, stream.shadowStreamPtr.byteOffset, shadowCount, stream.shadowStreamContext);
        for(let i=0;i<shadowCount;i++) {
          const rayIndex = stream.shadowIndex[i];
          const shadow = stream.shadowStream[i];
          const color = stream.rayColorResults[rayIndex];
          const diffuse = stream.rayDiffuseResults[rayIndex];
          if(shadow.tfar[0] >= 0) {
            const ray = stream.rayStream[rayIndex];
            vec3.normalize(v.shadow_fx, reflect(v.shadow_fx, ray.ray.dir, ray.hit.Ng))
            const s = Math.pow(clamp(vec3.dot(v.shadow_fx, v.lightDir), 0, 1), 10);
            const d = clamp(-vec3.dot(v.lightDir, ray.hit.Ng), 0, 1);
    
            vec3.set(v.shadow_fx, s, s, s);
            vec3.scaleAndAdd(color, color, diffuse, d);
            vec3.scaleAndAdd(color, color, v.shadow_fx, 0.5);
          }
          const r = 255 * clamp(color[0], 0, 1)
          const g = 255 * clamp(color[1], 0, 1)
          const b = 255 * clamp(color[2], 0, 1)
          vec3.set(color, r, g, b);
        }
      }

      i = 0;
      for (let y=y0; y<y1; y++) for (let  x=x0; x<x1; x++)
      {
        const index = ((x-dX) + (y-dY) * stride)*4;
        pixels.set(stream.rayColorResults[i++], index);
      }
    }
}


const SIZE = 1200;
const WIDTH = SIZE;
const HEIGHT = SIZE;

export function run(START_TIME: number) {
  TutorialApplication.runTutorial(START_TIME, CurveGeometryTutorial, 'canvas', WIDTH, HEIGHT);
}

export async function runWithWorker(START_TIME: number) {
  return TutorialApplication.runTutorialWithWorkers(START_TIME, CurveGeometryTutorial, THIS_URL, 'canvas', WIDTH, HEIGHT, 6);
}