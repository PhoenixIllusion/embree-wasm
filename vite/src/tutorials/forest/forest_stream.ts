/*
Based on 
https://github.com/embree/embree/blob/master/tutorials/forest/
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/forest/forest_device.cpp
*/

import { vec3 } from "gl-matrix";
import { embree, RTC } from "../common/embree";
import { clamp } from "../common/math/math";
import { ISPCCamera } from "../common/tutorial/camera";
import { StreamingData, setupRayStreamData } from "../common/tutorial/stream-rayhit";
import { uint, float } from "../common/types";
import ForestTutorial from "./forest_device";

import THIS_URL from './forest_stream.ts?url';
import { TutorialApplication } from "../common/tutorial/tutorial";
import { TreeStructs } from "./trees";

const v = {
  lightDir: vec3.create(),

  c0: vec3.create(),
  c1: vec3.create(),
  c2: vec3.create(),

  color_accum: vec3.create()
}
const data = {
  spp: 2
}
export default class ForestStreamTutorial extends ForestTutorial {
  
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

      for (let _j = 0; _j < data.spp; ++_j)
      for (let _i = 0; _i < data.spp; ++_i)
      {


          let i = 0;
          for (let y=y0; y<y1; y++) for (let  x=x0; x<x1; x++)
          { 
            const fx =  x + (_i + 0.5) / 3;
            const fy =  y + (_j + 0.5) / 3;
            embree.HEAPU8.set(stream.rayStreamCacheData, stream.rayStreamPtr[i]);
            camera.setRayDir(stream.rayStream[i++].ray.dir, fx, fy);
          }
          const STREAM_COUNT = stream.rayStreamPtr.length;
          RTC.intersect1M(this.g_scene, stream.rayStreamPtr.byteOffset, STREAM_COUNT, stream.rayStreamContext);
          let shadowCount = 0;
          for(let i=0;i<STREAM_COUNT;i++) {
            const color = stream.rayColorResults[i];
            if(_j == 0 && _i == 0) {
              vec3.set(color, 0, 0, 0);
            }
            const hit = stream.rayStream[i].hit;
            if(hit.geomID[0] != -1 ) {
              const ray = stream.rayStream[i].ray;
              const diffuse = stream.rayDiffuseResults[i];
              
              if(hit.instID[0] != -1) {
                let tree_idx = 0;   

                if(hit.instPrimID[0] != -1) {
                  tree_idx = hit.instPrimID[0]
                } else {
                  tree_idx = hit.instID[0] - 1;
                }
                const tree_id = this.trees_selected[this.tree_ids[tree_idx]];
                const tree_indices = TreeStructs.tree_indices[tree_id];
                const offset = hit.primID[0] * 3;
                const [v0, v1, v2] = tree_indices.slice(offset, offset + 3).map(x => x * 3);
                const tc =  TreeStructs.tree_colors[tree_id];
                const c0 = vec3.set(v.c0, tc[v0], tc[v0+1], tc[v0+2]);
                const c1 = vec3.set(v.c1, tc[v1], tc[v1+1], tc[v1+2]);
                const c2 = vec3.set(v.c2, tc[v2], tc[v2+1], tc[v2+2]);
                const u = hit.UV[0], _v = hit.UV[1], w = 1.0-u-_v;
                vec3.scale(diffuse, c0, w)
                vec3.scaleAndAdd(diffuse, diffuse, c1, u)
                vec3.scaleAndAdd(diffuse, diffuse, c2, _v);
              } else {
                vec3.set(diffuse, 0.5, 0.8, 0.0);
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
                const d = clamp(-vec3.dot(v.lightDir, ray.hit.Ng), 0, 1);
                vec3.scaleAndAdd(color, color, diffuse, d);
              }
            }
          }
      }

      const spp2 = data.spp * data.spp;
      let i = 0;
      for (let y=y0; y<y1; y++) for (let  x=x0; x<x1; x++)
      {
        const index = ((x-dX) + (y-dY) * stride)*4;

        const color = stream.rayColorResults[i++];
        const r = 255 * clamp(color[0]/spp2, 0, 1)
        const g = 255 * clamp(color[1]/spp2, 0, 1)
        const b = 255 * clamp(color[2]/spp2, 0, 1)
        vec3.set(color, r, g, b);
        pixels.set(color, index);
      }
  }
}

const SIZE = 2200;
const WIDTH = SIZE;
const HEIGHT = SIZE;

export function run(START_TIME: number) {
  TutorialApplication.runTutorial(START_TIME, ForestStreamTutorial, 'canvas', WIDTH, HEIGHT);
}

export async function runWithWorker(START_TIME: number) {
  return TutorialApplication.runTutorialWithWorkers(START_TIME, ForestStreamTutorial, THIS_URL, 'canvas', WIDTH, HEIGHT, 7);
}