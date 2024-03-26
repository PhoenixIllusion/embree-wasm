import { vec3 } from 'gl-matrix';
import { Embree, RTC } from '../embree';
import { ISPCCamera } from './camera';


export class Ray {
  orig: Float32Array;
  dir: Float32Array;
  tnear: Float32Array;
  time: Float32Array;
  tfar: Float32Array;

  mask: Uint32Array;
  id: Uint32Array;
  flags: Uint32Array;
  constructor( embree: typeof Embree, ptr: number) {
    const buffer = embree.HEAP8.buffer;
    let i = 0;
    this.orig = new Float32Array(buffer, ptr, 3); i+=12;
    this.tnear = new Float32Array(buffer, ptr+i, 1); i+=4;
    this.dir = new Float32Array(buffer,  ptr+i, 3); i+=12;
    this.time = new Float32Array(buffer, ptr+i, 1); i+=4;

    this.tfar = new Float32Array(buffer, ptr+i, 1); i+=4;
    this.mask = new Uint32Array(buffer, ptr+i, 1); i+=4;
    this.id = new Uint32Array(buffer, ptr+i, 1); i+=4;
    this.flags = new Uint32Array(buffer, ptr+i, 1); i+=4;

  }
}

export class Hit {
  Ng: Float32Array;
  UV: Float32Array;
  geomID: Int32Array;
  primID: Int32Array;
  instID: Int32Array;
  instPrimID: Int32Array;
  constructor( embree: typeof Embree, ptr: number) {
    const buffer = embree.HEAP8.buffer;
    let i = 0;
    this.Ng = new Float32Array(buffer, ptr, 3); i += 12;
    this.UV = new Float32Array(buffer, ptr + i, 2); i += 8;
    this.primID = new Int32Array(buffer, ptr+i, 1); i += 4;
    this.geomID = new Int32Array(buffer, ptr+i, 1); i += 4;
    this.instID = new Int32Array(buffer, ptr+i, 1); i += 4;
    this.instPrimID = new Int32Array(buffer, ptr+i, 1); i += 4;
  }
}

export interface StreamingData {
  rayColorResults: Float32Array[];
  rayDiffuseResults: Float32Array[];
  shadowIndex: Uint16Array;
  
  rayStreamCacheData: Uint8Array;
  shadowCache: Uint8Array;
  
  rayStreamContext: Embree.RTCIntersectArguments;
  shadowStreamContext: Embree.RTCOccludedArguments;
  rayStream: {ray: Ray, hit: Hit}[];
  shadowStream: Ray[]
  rayStreamPtr: Uint32Array;
  shadowStreamPtr: Uint32Array;
}


export function setupRayStreamData(embree: typeof Embree, camera: ISPCCamera, TILE_SIZE_X: number, TILE_SIZE_Y: number): StreamingData {
  const rayStreamPtr = embree.allocTypedArray(TILE_SIZE_X * TILE_SIZE_Y, Uint32Array);
  const shadowStreamPtr = embree.allocTypedArray(TILE_SIZE_X * TILE_SIZE_Y, Uint32Array);
  const shadowIndex = new Uint16Array(TILE_SIZE_X * TILE_SIZE_Y);

  const rayStream: {ray: Ray, hit: Hit}[] = [];
  const shadowStream: Ray[] = [];

  const rayColorResults: Float32Array[] = [];
  const rayDiffuseResults: Float32Array[] = [];

  const rayStreamContext = new embree.RTCIntersectArguments();
  RTC.initIntersectArguments(rayStreamContext);
  rayStreamContext.flags |= embree.RTC_RAY_QUERY_FLAG_COHERENT;
  const shadowStreamContext = new embree.RTCOccludedArguments();
  RTC.initOccludedArguments(shadowStreamContext);
  shadowStreamContext.flags |= embree.RTC_RAY_QUERY_FLAG_INCOHERENT;

  const SIZE_OF_RAYHIT = RTC.sizeOfRTCRayHit();
  const SIZE_OF_RAY = RTC.sizeOfRTCRay();

  for(let i=0;i<TILE_SIZE_X*TILE_SIZE_Y;i++) {
    const rayHit = embree.allocRTCRayHit();
    const sPtr = rayStreamPtr[i] = embree.getPointer(rayHit)
    rayStream[i] = { ray: new Ray(embree, sPtr), hit: new Hit(embree, sPtr + SIZE_OF_RAY)};
    const shadow = new embree.RTCRay();
    shadowStreamPtr[i] = embree.getPointer(shadow);
    shadowStream[i] = new Ray(embree, shadowStreamPtr[i])

    rayColorResults[i] = new Float32Array([0,0,0,255]);
    rayDiffuseResults[i] = new Float32Array(3);
  }
  const rayStreamCacheData = new Uint8Array(SIZE_OF_RAYHIT);
  {
    const rayHit = rayStream[0]
    vec3.copy(rayHit.ray.orig, camera.xfm.p);
    rayHit.ray.tnear[0] = 0;
    rayHit.ray.tfar[0] = 1e30;
    rayHit.ray.mask[0] = -1;
    rayHit.ray.flags[0] = 0;
    rayHit.ray.time[0] = 0;
    rayHit.ray.id[0] = 1;
    rayHit.hit.geomID[0] = rayHit.hit.primID[0] = -1;
  }
  rayStreamCacheData.set(embree.HEAPU8.subarray(rayStreamPtr[0], rayStreamPtr[0] + SIZE_OF_RAYHIT));
  const shadowCache = rayStreamCacheData.subarray(0,SIZE_OF_RAY);

  return {
    rayColorResults,
    rayDiffuseResults,
    shadowIndex,

    rayStreamCacheData,
    shadowCache,

    rayStreamContext,
    shadowStreamContext,

    rayStream,
    shadowStream,

    rayStreamPtr,
    shadowStreamPtr
  }
}