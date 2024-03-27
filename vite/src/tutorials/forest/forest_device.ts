/*
Based on 
https://github.com/embree/embree/blob/master/tutorials/forest/
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/forest/forest_device.cpp
*/

import { mat4, vec3, vec4 } from "gl-matrix";
import { Embree, RTC, embree } from "../common/embree";
import { ISPCCamera } from "../common/tutorial/camera";
import { SIZE_OF_TRIANGLE, SIZE_OF_VERTEX, Vertex, wrapArrayAsTriangle, wrapArrayAsVertex } from "../common/tutorial/geometry";
import { TutorialApplication } from "../common/tutorial/tutorial";
import { M_PI, RandomSampler_getFloat, ceil, clamp, cos, min, sin } from "../common/math/math";
import { float, uint } from "../common/types";

import THIS_URL from './forest_device.ts?url';
import { TreeData, TreeStructs } from "./trees";

const g_complexity = 0
export let num_trees_sqrt = 0;

if (g_complexity == 0) { num_trees_sqrt = 250; }
else if (g_complexity == 1) { num_trees_sqrt = 500; }
else if (g_complexity == 2) { num_trees_sqrt = 750; }
else { num_trees_sqrt = 2000; }
let num_trees = num_trees_sqrt * num_trees_sqrt;

const g_trees = [ 0, 1, 2, 3, 4, 5 ];

const data = {
  spp: 2
}

const v = {
  dir: vec3.create(),
  color: vec3.create(),
  lightDir: vec3.create(),
  Ng: vec3.create(),
  diffuse: vec3.create(),

  shadowOrig: vec3.create(),
  shadowDir: vec3.create(),
  shadow_fx: vec3.create(),

  c0: vec3.create(),
  c1: vec3.create(),
  c2: vec3.create(),

  color_accum: vec3.create()
}

export default class ForestTutorial extends TutorialApplication {

  private treeRayHit!: Embree.RTCRayHit;
  private rayHit!: Embree.RTCRayHit;
  private shadow!: Embree.RTCRay;

  protected tree_ids!: Uint32Array;
  protected tree_transforms!: Float32Array;
  protected tree_transform!: Float32Array[];
  protected instance_array!: Embree.Geometry;
  protected trees_selected: number[] = [];
  protected scene_trees_selected!: Uint32Array;

  protected scene_trees: Embree.Scene[] = [];
  protected scene_terrain!: Embree.Scene;

  constructor() {
    super('ForestGeometryTutorial', [], 50, 50);
    vec3.set(this.camera.from, 507.72, 109.37, 1173.20);
    vec3.set(this.camera.to, 504.62, 108.63, 1161.37);
  }
  addTree(scene_i: Embree.Scene, tree_idx: uint): uint {
    /* create a triangulated cube with 12 triangles and 8 vertices */
    const mesh = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_TRIANGLE);

    const vertices = TreeStructs.tree_vertices[tree_idx];
    const colors = TreeStructs.tree_colors[tree_idx];
    const indices = TreeStructs.tree_indices[tree_idx];
    const num_vertices = TreeStructs.tree_num_vertices[tree_idx];
    const num_colors = TreeStructs.tree_num_colors[tree_idx];
    const num_triangles = TreeStructs.tree_num_triangles[tree_idx];

    /* set vertices and vertex colors */
    const vertices_ptr = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, num_vertices);
    const vertex_buffer = wrapArrayAsVertex(embree.wrapTypedArray(vertices_ptr, num_vertices * 4, Float32Array));
    for (let i = 0; i < num_vertices; ++i) {
      vertex_buffer[i].x = vertices[3 * i + 0];
      vertex_buffer[i].y = vertices[3 * i + 1];
      vertex_buffer[i].z = vertices[3 * i + 2];
      vertex_buffer[i].r = 0;
    }

    /* set triangles and face colors */
    const index_buffer_ptr = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT3, SIZE_OF_TRIANGLE, num_triangles);
    const tree_triangles = wrapArrayAsTriangle(embree.wrapTypedArray(index_buffer_ptr, num_triangles * 3, Uint32Array));
    for (let i = 0; i < num_triangles; ++i) {
      tree_triangles[i].v0 = indices[3 * i + 0];
      tree_triangles[i].v1 = indices[3 * i + 1];
      tree_triangles[i].v2 = indices[3 * i + 2];
    }

    /* create vertex color array */
    const color_buffer = embree.allocAlignedTypedArray(colors.length / 3 * 4, 16, Float32Array);
    let j = 0;
    for (let i = 0; i < colors.length; i += 3) {
      color_buffer[j++] = colors[i];
      color_buffer[j++] = colors[i + 2];
      color_buffer[j++] = colors[i + 1];
      color_buffer[j++] = 1;
    }

    RTC.setGeometryVertexAttributeCount(mesh, 1);
    RTC.setSharedGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_VERTEX_ATTRIBUTE, 0, embree.RTC_FORMAT_FLOAT3, color_buffer, 0, 16, num_colors);

    RTC.commitGeometry(mesh);
    const geomID = RTC.attachGeometry(scene_i, mesh);
    RTC.releaseGeometry(mesh);
    return geomID;
  }

  addTerrain(scene_i: Embree.Scene) {
    /* create a triangulated plane with 2 triangles and 4 vertices */
    const geom = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_TRIANGLE);

    const terrain_num_vertices = TreeData.terrain_num_vertices;
    const terrain_vertices = TreeData.terrain_vertices;
    /* set vertices */
    const vertices_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, terrain_num_vertices);
    const vertices = wrapArrayAsVertex(embree.wrapTypedArray(vertices_ptr, TreeData.terrain_num_vertices * 4, Float32Array));
    for (let i = 0; i < terrain_num_vertices; ++i) {
      vertices[i].x = terrain_vertices[3 * i + 0];
      vertices[i].y = terrain_vertices[3 * i + 1];
      vertices[i].z = terrain_vertices[3 * i + 2];
    }

    const terrain_num_triangles = TreeData.terrain_num_triangles;
    const terrain_indices = TreeData.terrain_indices;
    /* set triangles */
    const triangles_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT3, SIZE_OF_TRIANGLE, terrain_num_triangles);
    const terrain_triangles = wrapArrayAsTriangle(embree.wrapTypedArray(triangles_ptr, terrain_num_triangles * 3, Uint32Array));
    for (let i = 0; i < terrain_num_triangles; ++i) {
      terrain_triangles[i].v0 = terrain_indices[3 * i + 0];
      terrain_triangles[i].v1 = terrain_indices[3 * i + 1];
      terrain_triangles[i].v2 = terrain_indices[3 * i + 2];
    }

    RTC.commitGeometry(geom);
    const geomID = RTC.attachGeometry(scene_i, geom);
    RTC.releaseGeometry(geom);
    return geomID;
  }

  createTreeInstance(scene: Embree.Scene, tree: Embree.Scene, matrix: Float32Array): Embree.Geometry {
    const g_instance0 = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_INSTANCE);
    RTC.setGeometryInstancedScene(g_instance0, tree);
    RTC.setGeometryTimeStepCount(g_instance0, 1);
    RTC.attachGeometry(scene, g_instance0);
    RTC.releaseGeometry(g_instance0);
    RTC.setGeometryTransform(g_instance0, 0, embree.RTC_FORMAT_FLOAT4X4_COLUMN_MAJOR, matrix.byteOffset);
    RTC.commitGeometry(g_instance0);
    return g_instance0;
  }

  device_init(): void {
    this.g_device = RTC.newDevice('verbose=0,threads=1,tessellation_cache_size=0');

    this.treeRayHit = embree.allocRTCRayHit();

    for (let i = 0; i < 6; ++i) {
      this.scene_trees[i] = RTC.newScene(this.g_device);
      this.addTree(this.scene_trees[i], i);
      RTC.commitScene(this.scene_trees[i]);
    }
    this.scene_trees_selected = embree.allocAlignedTypedArray(6, 4, Uint32Array);

    /* create scene */
    this.scene_terrain = RTC.newScene(this.g_device);

    /* add ground plane */
    this.addTerrain(this.scene_terrain);

    RTC.commitScene(this.scene_terrain);
    this.device_render(0);
  }

  bounds!: Embree.RTCBounds;
  update_trees(time: float) {
    if (!this.bounds) {
      this.bounds = new embree.RTCBounds();
    }
    const bounds = this.bounds;
    RTC.getSceneBounds(this.scene_terrain, this.bounds);
    const scene = this.scene_terrain;
    const lnum_trees_sqrt = num_trees_sqrt;
    for (let t = 0; t < num_trees; t++) {
      this.tree_ids[t] = min(5, (6 * RandomSampler_getFloat()));

      const j = 0 | (t / lnum_trees_sqrt);
      const i = t % lnum_trees_sqrt;

      let px = bounds.lower_x + (i + RandomSampler_getFloat()) / (lnum_trees_sqrt) * (bounds.upper_x - bounds.lower_x);
      let pz = bounds.lower_z + (j + RandomSampler_getFloat()) / (lnum_trees_sqrt) * (bounds.upper_z - bounds.lower_z);
      let py = bounds.upper_y;


      const dx = bounds.upper_x - bounds.lower_x;
      const dz = bounds.upper_z - bounds.lower_z;

      const phi = 2 * (M_PI) * RandomSampler_getFloat();
      const mx = sin(phi);
      const mz = cos(phi);

      px = px + time * mx;
      if (px < bounds.lower_x) {
        const f = ceil((bounds.lower_x - px) / dx);
        px += f * dx;
      }
      if (px > bounds.upper_x) {
        const f = ceil((bounds.upper_x - px) / dx);
        px += f * dx;
      }
      pz = pz + time * mz;
      if (pz < bounds.lower_z) {
        const f = ceil((bounds.lower_z - pz) / dz);
        pz += f * dz;
      }
      if (pz > bounds.upper_z) {
        const f = ceil((bounds.upper_z - pz) / dz);
        pz += f * dz;
      }

      const rayhit = this.treeRayHit;
      const ray = rayhit.ray;
      const hit = rayhit.hit;
      hit.geomID = hit.primID = -1;
      [ray.org_x, ray.org_y, ray.org_z] = [px, py, pz];
      [ray.dir_x, ray.dir_y, ray.dir_z] = [0, -1, 0];
      [ray.mask, ray.tnear, ray.tfar, ray.flags] = [-1, 0, 1e30, 0];

      RTC.intersect1(scene, rayhit);
      if (rayhit.hit.geomID != -1) {
        py = py - ray.tfar;
        mat4.fromTranslation(this.tree_transform[t], [px, py, pz])
      } else {
        mat4.fromTranslation(this.tree_transform[t], [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY])
      }
    }
  }

  rebuild_trees(old_num_trees: uint, time: float): void {
    if (this.tree_ids) {
      embree._free(this.tree_ids.byteOffset);
    }
    this.tree_ids = embree.allocAlignedTypedArray(num_trees, 16, Uint32Array);
    this.tree_transforms = embree.allocAlignedTypedArray(num_trees * 16, 16, Float32Array);
    this.tree_transform = [];
    for (let i = 0; i < num_trees; i++) {
      this.tree_transform[i] = this.tree_transforms.subarray(i * 16, (i + 1) * 16);
    }
    this.update_trees(time);
  }

  update_instance_scenes(): void {
    RTC.setGeometryInstancedScenes(this.instance_array, this.scene_trees_selected.byteOffset, 6);
    RTC.commitGeometry(this.instance_array);
  }

  update_instance_transforms(): void {
    RTC.updateGeometryBuffer(this.instance_array, embree.RTC_BUFFER_TYPE_TRANSFORM, 0);
    RTC.commitGeometry(this.instance_array);
  }


 rebuild_instances(old_num_trees: number): void
{
    const instance_array = this.instance_array = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_INSTANCE_ARRAY);
    RTC.setGeometryInstancedScenes(instance_array, this.scene_trees_selected.byteOffset,6);
    RTC.setSharedGeometryBuffer(instance_array, embree.RTC_BUFFER_TYPE_INDEX,     0, embree.RTC_FORMAT_UINT,                  
        this.tree_ids.byteOffset, 0, 4,  num_trees);
    RTC.setSharedGeometryBuffer(instance_array, embree.RTC_BUFFER_TYPE_TRANSFORM, 0, embree.RTC_FORMAT_FLOAT4X4_COLUMN_MAJOR,
      this.tree_transforms.byteOffset, 0, 16 * 4, num_trees);
    RTC.attachGeometry(this.g_scene,instance_array);
    RTC.releaseGeometry(instance_array);
    RTC.commitGeometry(instance_array);
}

  renderPixelStandard(outPixel: vec4, x: number, y: number, width: number, height: number, time: number, camera: ISPCCamera): vec4 {
    if (!this.rayHit) {
      this.rayHit = embree.allocRTCRayHit();
      this.shadow = new embree.RTCRay();
    }
    vec3.set(v.color_accum, 0, 0, 0);

    for (let j = 0; j < data.spp; ++j)
    for (let i = 0; i < data.spp; ++i)
    {
      const fx =  x + (i + 0.5) / 3;
      const fy =  y + (j + 0.5) / 3;
      const rayHit = this.rayHit;
      const ray = rayHit.ray;
      const hit = rayHit.hit;
      rayHit.ray = camera.setRayOrigin(rayHit.ray)
      ray.tnear = 0;
      ray.tfar = 1e30;
      ray.mask = -1;
      hit.geomID = hit.primID = -1;

      camera.setRayDir(v.dir, fx, fy);
      [rayHit.ray.dir_x, rayHit.ray.dir_y, rayHit.ray.dir_z] = v.dir;
      RTC.intersect1(this.g_scene, rayHit);

      vec3.set(v.color, 0, 0, 0);
      if (hit.geomID != -1) {

        vec3.set(v.diffuse, 1, 1, 1);
        const diffuse = v.diffuse;
        if(hit.get_instID(0) != -1) {
          let tree_idx = 0;
          if(hit.get_instPrimID(0) != -1) {
            tree_idx = hit.get_instPrimID(0)
          } else {
            tree_idx = hit.get_instID(0) - 1;
          }

          const tree_id = this.trees_selected[this.tree_ids[tree_idx]];
          const tree_indices = TreeStructs.tree_indices[tree_id];
          const offset = hit.primID * 3;
          const [v0, v1, v2] = tree_indices.slice(offset, offset + 3).map(x => x * 3);;
          const tc =  TreeStructs.tree_colors[tree_id];
          const c0 = vec3.set(v.c0, tc[v0], tc[v0+1], tc[v0+2]);
          const c1 = vec3.set(v.c0, tc[v1], tc[v1+1], tc[v1+2]);
          const c2 = vec3.set(v.c0, tc[v2], tc[v2+1], tc[v2+2]);
          const u = hit.u, _v = hit.v, w = 1.0-u-_v;
          vec3.scale(diffuse, c0, w)
          vec3.scaleAndAdd(diffuse, diffuse, c1, u)
          vec3.scaleAndAdd(diffuse, diffuse, c2, _v);
        } else {
          vec3.set(v.diffuse, 0.5, 0.8, 0.0);
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
      vec3.add(v.color_accum, v.color_accum, v.color);
    }

    const r = 255 * clamp(v.color_accum[0]/(data.spp*data.spp), 0, 1)
    const g = 255 * clamp(v.color_accum[1]/(data.spp*data.spp), 0, 1)
    const b = 255 * clamp(v.color_accum[2]/(data.spp*data.spp), 0, 1)
    const a = 255
    return vec4.set(outPixel, r, g, b, a);
  }


  protected g_scene!: Embree.Scene;
  total_time = 0;
  time_last_frame = 0;

  device_render(time: float): void {

    this.total_time += time - this.time_last_frame;
    this.time_last_frame = time;

    let old_num_trees = num_trees;

    if(this.g_scene) {
      RTC.releaseScene(this.g_scene);
    }
    for(let i=0; i < 6; i++) {
      this.trees_selected[i] = g_trees[i];
      this.scene_trees_selected[i] = embree.getPointer(this.scene_trees[i]);
    }
    this.rebuild_trees(old_num_trees, this.total_time);

    this.g_scene = RTC.newScene(this.g_device);
    this.addTerrain(this.g_scene);
    this.rebuild_instances(old_num_trees);
    RTC.commitScene(this.g_scene);
  }

  device_cleanup(): void {

  }
}


const SIZE = 1600;
const WIDTH = SIZE;
const HEIGHT = SIZE;

export function run(START_TIME: number) {
  TutorialApplication.runTutorial(START_TIME, ForestTutorial, 'canvas', WIDTH, HEIGHT);
}

export async function runWithWorker(START_TIME: number) {
  return TutorialApplication.runTutorialWithWorkers(START_TIME, ForestTutorial, THIS_URL, 'canvas', WIDTH, HEIGHT, 7);
}