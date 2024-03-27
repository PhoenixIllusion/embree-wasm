import { vec3 } from "gl-matrix";
import { embree, RTC } from "../common/embree";
import { clamp, floor, min } from "../common/math/math";
import { ISPCCamera } from "../common/tutorial/camera";
import { StreamingData, setupRayStreamData } from "../common/tutorial/stream-rayhit";
import { uint, float } from "../common/types";
import GridGeometryTutorial, { mylerp } from "./grid_geometry_device";

import THIS_URL from './grid_geometry_stream.ts?url';
import { TutorialApplication } from "../common/tutorial/tutorial";

const v3 = {
  N0: vec3.create(),
  N1: vec3.create(),
  lightDir: vec3.create()
}

export default class GridGeometryStreamTutorial extends GridGeometryTutorial {

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
      
      vec3.normalize(v3.lightDir, vec3.set(v3.lightDir, -1, -1, -1));

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
          const color = stream.rayColorResults[i];


          if(hit.geomID[0] != 0) {
            vec3.set(diffuse, 0.9,0.6,0.5);
          } else {
            vec3.set(diffuse, 0.8,0.0,0.0);
          }
    
          if (hit.geomID[0] == 1) {
            const ray = hit; //code often switches to this, even though not true
            const egrid = this.gmesh.egrids[ray.primID[0]];
            const startVertexID = egrid.startVertexID;
            const width         = egrid.width;
            const height        = egrid.height;
            const stride        = egrid.stride;
            const U = ray.UV[0]*(width-1);
            const V = ray.UV[1]*(height-1);
            const x = min(floor(U),width -2);
            const y = min(floor(V),height-2);
            const u = U-x;
            const v = V-y;
            const N00 = this.gmesh.normals[startVertexID+(y+0)*stride+(x+0)];
            const N01 = this.gmesh.normals[startVertexID+(y+0)*stride+(x+1)];
            const N10 = this.gmesh.normals[startVertexID+(y+1)*stride+(x+0)];
            const N11 = this.gmesh.normals[startVertexID+(y+1)*stride+(x+1)];
            mylerp(v3.N0, u, N00.vec3,N01.vec3);
            mylerp(v3.N1, u, N10.vec3,N11.vec3);
            vec3.normalize(hit.Ng, mylerp(hit.Ng, v, v3.N0, v3.N1));
          }
          vec3.scaleAndAdd(color, color, diffuse, 0.5);
          
          if(SHADOW_ENABLED) {
            vec3.normalize(hit.Ng, hit.Ng);

            const shadowIndex = shadowCount++;
            stream.shadowIndex[shadowIndex] = i;
            const shadow = stream.shadowStream[shadowIndex];
  
            embree.HEAPU8.set(stream.shadowCache, stream.shadowStreamPtr[shadowIndex]);
  
            vec3.scaleAndAdd(shadow.orig, camera.xfm.p, ray.dir, ray.tfar[0]);
            vec3.negate(shadow.dir, v3.lightDir);
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
            const d = clamp(-vec3.dot(v3.lightDir, ray.hit.Ng), 0, 1);
            vec3.scaleAndAdd(color, color, diffuse, d);
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
  TutorialApplication.runTutorial(START_TIME, GridGeometryStreamTutorial, 'canvas', WIDTH, HEIGHT);
}

export async function runWithWorker(START_TIME: number) {
  return TutorialApplication.runTutorialWithWorkers(START_TIME, GridGeometryStreamTutorial, THIS_URL, 'canvas', WIDTH, HEIGHT, 6);
}