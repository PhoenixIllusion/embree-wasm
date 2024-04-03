import { embree, RTC, Embree } from "../common/embree";
import { ISPCCamera } from "../common/tutorial/camera";
import { uint, float } from "../common/types";
import TriangleGeometryTutorial from "./triangle_geometry_device";

import THIS_URL from './triangle_geometry_z_only.ts?url';
import { TutorialApplication } from "../common/tutorial/tutorial";
import { PerfLogger } from "../common/perf";

const POOL_SIZE = 4;

export default class TriangleGeometryZTutorial extends TriangleGeometryTutorial {
  private xfm!: Embree.AffineSpace3fa;
  outBuffer!: Float32Array;
  private rayHit16!: Embree.RTCRayHit16;
  intersectArguments!: Embree.RTCIntersectArguments;
  pool: Embree.RenderThreadPool;
  constructor() {
    super(32, 32);
    this.pool = embree.initRenderThreadPool(POOL_SIZE, 1024*1024);
  }

  renderTileStandard(taskIndex: uint,
    _threadIndex: uint,
    pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    _numTilesY: uint, dX: number = 0, dY: number = 0, stride: number = 0) {
      if(!this.outBuffer) {
        this.outBuffer = embree.allocTypedArray(this.TILE_SIZE_X * this.TILE_SIZE_Y, Float32Array);
        this.rayHit16 = embree.allocRTCRayHit16();
        const rayHit = this.rayHit16;
        const [ org_x, org_y, org_z ]  = camera.xfm.p;
        for(let i=0;i<16;i++) {
          rayHit.ray.set_org_x(i, org_x);
          rayHit.ray.set_org_y(i, org_y);
          rayHit.ray.set_org_z(i, org_z);
          rayHit.ray.set_tnear(i, 0);
          rayHit.ray.set_tfar(i, 1e30);
          rayHit.ray.set_flags(i, 0);
          rayHit.ray.set_mask(i, -1);
          rayHit.hit.set_geomID(i, -1);
          rayHit.hit.set_primID(i, -1);
        }
        const xfm = embree.allocTypedArray(4*4, Float32Array);
        this.xfm = embree.wrapPointer(xfm.byteOffset, embree.AffineSpace3fa);
        xfm.set(camera.xfm.l.vx, 0);
        xfm.set(camera.xfm.l.vy, 4);
        xfm.set(camera.xfm.l.vz, 8);
        xfm.set(camera.xfm.p, 12);


        this.intersectArguments = new embree.RTCIntersectArguments();
        RTC.initIntersectArguments(this.intersectArguments);
        this.intersectArguments.flags |= embree.RTC_RAY_QUERY_FLAG_COHERENT;
      }

      const tileY = Math.floor(taskIndex / numTilesX);
      const tileX = taskIndex - tileY * numTilesX;
      const x0 = tileX * this.TILE_SIZE_X;
      const x1 = Math.min(x0 + this.TILE_SIZE_X, width);
      const y0 = tileY * this.TILE_SIZE_Y;
      const y1 = Math.min(y0 + this.TILE_SIZE_Y, height);
      stride = stride || width;

      const tileW = x1-x0;
      const tileH = y1-y0;
      embree.tileIntersect16Z(this.xfm, this.g_scene, this.rayHit16, this.intersectArguments,
         x0, tileW, y0, tileH, this.outBuffer.byteOffset);

      //*
      let i = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const index = ((x - dX) + (y - dY) * stride) * 4;
        const z = this.outBuffer[i++];
        pixels[index] = pixels[index+1] = pixels[index+2] = 255-z*30;
        pixels[index+3] = 255;
      }//*/
    }
  async renderFrameStandardAsync(pixels: Uint8ClampedArray,
      width: uint,
      height: uint,
      time: float,
      camera: ISPCCamera): Promise<void> {
    if(!this.outBuffer){
        const xfm = embree.allocTypedArray(4*4, Float32Array);
        this.xfm = embree.wrapPointer(xfm.byteOffset, embree.AffineSpace3fa);
        xfm.set(camera.xfm.l.vx, 0);
        xfm.set(camera.xfm.l.vy, 4);
        xfm.set(camera.xfm.l.vz, 8);
        xfm.set(camera.xfm.p, 12);
        this.outBuffer = embree.allocTypedArray(width * height, Float32Array);
      }
    const pointer = embree.renderThreadPoolIntersect16Z(this.pool, this.xfm, this.g_scene, width, height, this.outBuffer.byteOffset);
    
    const SEMAPHORE = embree.wrapTypedArray(pointer, 1, Int32Array);
    let value = SEMAPHORE[0];
    while(value != POOL_SIZE) {
      const _result = await (Atomics.waitAsync(SEMAPHORE, 0, value).value);
      value = SEMAPHORE[0]
    }
  }
}
const SIZE = 1024;
const SCALE = 2;
const WIDTH = Math.ceil((390/SCALE)/16)*16;
const HEIGHT = 844 /SCALE;

export async function run(START_TIME: number) {
  const perf = new PerfLogger('Shared Mem');
  const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = Math.max(WIDTH * 0.9, 800* WIDTH/HEIGHT) + 'px'
  canvas.style.height = Math.max(HEIGHT * 0.9, 800) + 'px'
  const tutorial = new TriangleGeometryZTutorial();

  tutorial.device_init();
  perf.logManual('Startup Time',START_TIME);

  const { context, pixels } = perf.log('Alloc Canvas', () => {
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    return {context, pixels}
  });
  for(let i =0 ;i< 50;i++) {
    await perf.log('Render '+i, () => 
      tutorial.renderFrameStandardAsync(pixels.data, canvas.width, canvas.height, 0, tutorial.camera.getISPCCamera(WIDTH, HEIGHT))
    )
  }
  embree.releaseRenderThreadPool(tutorial.pool);
  perf.log('Put Pixels', () => {
    let i = 0;
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const index = (x + y * WIDTH)*4;
      const z = tutorial.outBuffer[i++];
      pixels.data[index] = pixels.data[index+1] = pixels.data[index+2] = 255-z*30;
      pixels.data[index+3] = 255;
  }
    context.putImageData(pixels, 0, 0);
  });

  perf.logToElementAsTable('fps');
}

export async function runWithWorker(START_TIME: number) {
  return TutorialApplication.runTutorialWithWorkers(START_TIME, TriangleGeometryZTutorial, THIS_URL, 'canvas', WIDTH, HEIGHT, 4);
}