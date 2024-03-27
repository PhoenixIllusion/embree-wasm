import { vec3 } from "gl-matrix";
import { embree, RTC } from "../common/embree";
import { clamp } from "../common/math/math";
import { ISPCCamera } from "../common/tutorial/camera";
import { reflect } from "../common/tutorial/optics";
import { StreamingData, setupRayStreamData } from "../common/tutorial/stream-rayhit";
import { uint, float } from "../common/types";
import CurveGeometryTutorial from "./curve_geometry_device";
import { TutorialApplication } from "../common/tutorial/tutorial";

import THIS_URL from './curve_geometry_stream.ts?url';

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

export default class CurveGeometryStreamTutorial extends CurveGeometryTutorial {

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
    if (this.streamData == undefined) {
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
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      embree.HEAPU8.set(stream.rayStreamCacheData, stream.rayStreamPtr[i]);
      camera.setRayDir(stream.rayStream[i++].ray.dir, x, y);
    }
    const STREAM_COUNT = stream.rayStreamPtr.length;
    RTC.intersect1M(this.g_scene, stream.rayStreamPtr.byteOffset, STREAM_COUNT, stream.rayStreamContext);
    let shadowCount = 0;
    for (let i = 0; i < STREAM_COUNT; i++) {
      const color = stream.rayColorResults[i];
      vec3.set(color, 0, 0, 0);
      const hit = stream.rayStream[i].hit;
      if (hit.geomID[0] != -1) {
        const ray = stream.rayStream[i].ray;
        const diffuse = stream.rayDiffuseResults[i];

        vec3.set(diffuse, 1, 0, 0)

        if (hit.geomID[0] > 0) {
          switch (hit.geomID[0]) {
            case 1: case 2: case 6: this.interpolate_linear(diffuse, hit.primID[0], hit.UV[0]); break;
            case 3: case 4: case 5: this.interpolate_bspline(diffuse, hit.primID[0], hit.UV[0]); break;
            case 7: case 8: case 9: this.interpolate_catmull_rom(diffuse, hit.primID[0], hit.UV[0]); break;
          }
          vec3.scale(diffuse, diffuse, 0.5);
        }

        vec3.scaleAndAdd(color, color, diffuse, 0.5);



        if (SHADOW_ENABLED) {
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
    if (SHADOW_ENABLED && shadowCount > 0) {
      RTC.occluded1M(this.g_scene, stream.shadowStreamPtr.byteOffset, shadowCount, stream.shadowStreamContext);
      for (let i = 0; i < shadowCount; i++) {
        const rayIndex = stream.shadowIndex[i];
        const shadow = stream.shadowStream[i];
        const color = stream.rayColorResults[rayIndex];
        const diffuse = stream.rayDiffuseResults[rayIndex];
        if (shadow.tfar[0] >= 0) {
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
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const index = ((x - dX) + (y - dY) * stride) * 4;
      pixels.set(stream.rayColorResults[i++], index);
    }
  }
}

const SIZE = 1200;
const WIDTH = SIZE;
const HEIGHT = SIZE;

export function run(START_TIME: number) {
  TutorialApplication.runTutorial(START_TIME, CurveGeometryStreamTutorial, 'canvas', WIDTH, HEIGHT);
}

export async function runWithWorker(START_TIME: number) {
  return TutorialApplication.runTutorialWithWorkers(START_TIME, CurveGeometryStreamTutorial, THIS_URL, 'canvas', WIDTH, HEIGHT, 6);
}