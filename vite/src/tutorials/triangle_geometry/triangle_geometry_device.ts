/*
Based on 
https://github.com/embree/embree/tree/master/tutorials/triangle_geometry
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/triangle_geometry/triangle_geometry_device.cpp
*/

import { vec3, vec4 } from "gl-matrix";
import { Embree, RTC, embree } from "../common/embree";
import { ISPCCamera } from "../common/tutorial/camera";
import { SIZE_OF_TRIANGLE, SIZE_OF_VERTEX, Vertex, wrapArrayAsTriangle, wrapArrayAsVertex } from "../common/tutorial/geometry";
import { TutorialApplication } from "../common/tutorial/tutorial";
import { clamp } from "../common/math/math";
import { float, uint } from "../common/types";

import THIS_URL from './triangle_geometry_device.ts?url';


export const USE_VERTEX_COLOR = false;

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

interface TutorialData {
  face_colors: [float, float, float][],
  vertex_colors: [float, float, float][]
}

export default class TriangleGeometryTutorial extends TutorialApplication {

  protected g_scene!: Embree.Scene;

  protected rayHit!: Embree.RTCRayHit;
  private shadow!: Embree.RTCRay;

  protected interpolate!: Float32Array;

  protected data!: TutorialData;

  constructor(tileWidth: number = 50, tileHeight: number = 50) {
    super('CurveGeometryTutorial', [], tileWidth, tileHeight);
    vec3.set(this.camera.from, 1.5, 1.5, -1.5);
    vec3.set(this.camera.to, 0, 0, 0);
  }

  addCube(scene_i: Embree.Scene): uint {
    /* create a triangulated cube with 12 triangles and 8 vertices */
    const mesh = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_TRIANGLE);

    /* create face and vertex color arrays */
    const data: TutorialData = {
      face_colors: [],
      vertex_colors: []
    }

    /* set vertices and vertex colors */
    const vertices_ptr = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, 8);
    const vertices = wrapArrayAsVertex(embree.wrapTypedArray(vertices_ptr, 8 * 4, Float32Array));
    data.vertex_colors[0] = [0, 0, 0]; vertices[0].x = -1; vertices[0].y = -1; vertices[0].z = -1;
    data.vertex_colors[1] = [0, 0, 1]; vertices[1].x = -1; vertices[1].y = -1; vertices[1].z = +1;
    data.vertex_colors[2] = [0, 1, 0]; vertices[2].x = -1; vertices[2].y = +1; vertices[2].z = -1;
    data.vertex_colors[3] = [0, 1, 1]; vertices[3].x = -1; vertices[3].y = +1; vertices[3].z = +1;
    data.vertex_colors[4] = [1, 0, 0]; vertices[4].x = +1; vertices[4].y = -1; vertices[4].z = -1;
    data.vertex_colors[5] = [1, 0, 1]; vertices[5].x = +1; vertices[5].y = -1; vertices[5].z = +1;
    data.vertex_colors[6] = [1, 1, 0]; vertices[6].x = +1; vertices[6].y = +1; vertices[6].z = -1;
    data.vertex_colors[7] = [1, 1, 1]; vertices[7].x = +1; vertices[7].y = +1; vertices[7].z = +1;

    /* set triangles and face colors */
    let tri = 0;
    const triangles_ptr = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT3, SIZE_OF_TRIANGLE, 12);
    const triangles = wrapArrayAsTriangle(embree.wrapTypedArray(triangles_ptr, 36, Uint32Array));

    // left side
    data.face_colors[tri] = [1, 0, 0]; triangles[tri].v0 = 0; triangles[tri].v1 = 1; triangles[tri].v2 = 2; tri++;
    data.face_colors[tri] = [1, 0, 0]; triangles[tri].v0 = 1; triangles[tri].v1 = 3; triangles[tri].v2 = 2; tri++;

    // right side
    data.face_colors[tri] = [0, 1, 0]; triangles[tri].v0 = 4; triangles[tri].v1 = 6; triangles[tri].v2 = 5; tri++;
    data.face_colors[tri] = [0, 1, 0]; triangles[tri].v0 = 5; triangles[tri].v1 = 6; triangles[tri].v2 = 7; tri++;

    // bottom side
    data.face_colors[tri] = [0.5, 0.5, 0.5]; triangles[tri].v0 = 0; triangles[tri].v1 = 4; triangles[tri].v2 = 1; tri++;
    data.face_colors[tri] = [0.5, 0.5, 0.5]; triangles[tri].v0 = 1; triangles[tri].v1 = 4; triangles[tri].v2 = 5; tri++;

    // top side
    data.face_colors[tri] = [1, 1, 1]; triangles[tri].v0 = 2; triangles[tri].v1 = 3; triangles[tri].v2 = 6; tri++;
    data.face_colors[tri] = [1, 1, 1]; triangles[tri].v0 = 3; triangles[tri].v1 = 7; triangles[tri].v2 = 6; tri++;

    // front side
    data.face_colors[tri] = [0, 0, 1]; triangles[tri].v0 = 0; triangles[tri].v1 = 2; triangles[tri].v2 = 4; tri++;
    data.face_colors[tri] = [0, 0, 1]; triangles[tri].v0 = 2; triangles[tri].v1 = 6; triangles[tri].v2 = 4; tri++;

    // back side
    data.face_colors[tri] = [1, 1, 0]; triangles[tri].v0 = 1; triangles[tri].v1 = 5; triangles[tri].v2 = 3; tri++;
    data.face_colors[tri] = [1, 1, 0]; triangles[tri].v0 = 3; triangles[tri].v1 = 5; triangles[tri].v2 = 7; tri++;
    this.data = data;
    RTC.setGeometryVertexAttributeCount(mesh, 1);
    const vertex_colors = embree.allocTypedArray(data.vertex_colors.length * 4, Float32Array);
    vertex_colors.set(data.vertex_colors.map(([r, g, b]) => ([r, g, b, 1])).flat());
    RTC.setSharedGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_VERTEX_ATTRIBUTE, 0, embree.RTC_FORMAT_FLOAT3, vertex_colors.byteOffset, 0, 16, 8);

    RTC.commitGeometry(mesh);
    const geomID = RTC.attachGeometry(scene_i, mesh);
    RTC.releaseGeometry(mesh);
    return geomID;
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
    this.g_device = RTC.newDevice('verbose=0,threads=1,tessellation_cache_size=0');
    this.interpolate = embree.allocTypedArray(4, Float32Array);

    /* create scene */
    this.g_scene = RTC.newScene(this.g_device);

    /* add ground plane */
    this.addGroundPlane(this.g_scene);

    this.addCube(this.g_scene);

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

    camera.setRayDir(v.dir, x, y);
    [rayHit.ray.dir_x, rayHit.ray.dir_y, rayHit.ray.dir_z] = v.dir;
    RTC.intersect1(this.g_scene, rayHit);

    vec3.set(v.color, 0, 0, 0);
    if (hit.geomID != -1) {
      if (USE_VERTEX_COLOR && hit.geomID > 0) { // Floor has no colors, so can't sample
        RTC.interpolate0(RTC.getGeometry(this.g_scene, hit.geomID), hit.primID, hit.u, hit.v, embree.RTC_BUFFER_TYPE_VERTEX_ATTRIBUTE, 0, this.interpolate.byteOffset, 3)
        vec3.copy(v.diffuse, this.interpolate);
      } else {
        vec3.set(v.diffuse, ... this.data.face_colors[hit.primID])
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
  TutorialApplication.runTutorial(START_TIME, TriangleGeometryTutorial, 'canvas', WIDTH, HEIGHT);
}

export async function runWithWorker(START_TIME: number) {
  return TutorialApplication.runTutorialWithWorkers(START_TIME, TriangleGeometryTutorial, THIS_URL, 'canvas', WIDTH, HEIGHT, 6);
}