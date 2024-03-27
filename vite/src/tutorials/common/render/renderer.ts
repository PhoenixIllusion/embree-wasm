/*
Tile and Pixel calls common to various tutorials. renderFrameStandard declared at 
https://github.com/embree/embree/blob/master/tutorials/common/tutorial/tutorial.cpp
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/common/tutorial/tutorial.cpp
*/

import { ISPCCamera } from "../tutorial/camera";
import { uint, float } from "../types";

import { WorkerQueue } from "../tutorial/worker-queue";
import Worker from '../tutorial/worker?worker'
import type { WorkerResponse, WorkerRequest, OnInit } from "../tutorial/worker";
import { vec4 } from "gl-matrix";


export class RenderQueue extends WorkerQueue<WorkerRequest, WorkerResponse, number> {
  private _ready: Promise<void>[] = [];
  constructor(tutorialUrl: string, count: number) {
    const _ready: Promise<void>[] = []
    super(Worker, count, (worker) => {
      const init: OnInit = { init: { url: tutorialUrl } }
      worker.postMessage(init);
      _ready.push(new Promise(resolve => worker.onmessage = () => resolve()));
    });
    this._ready = _ready;
  }

  ready() {
    return Promise.all(this._ready);
  }
};

export interface Renderer {

  renderPixelStandard(outPixel: vec4, x: uint, y: uint,
    width: uint, height: uint,
    time: float,
    camera: ISPCCamera): vec4;

  renderTileStandard(taskIndex: uint,
    threadIndex: uint,
    pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    numTilesY: uint, dX: number, dY: number, stride: number): void

  renderTileTask(taskIndex: uint, threadIndex: uint, pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    numTilesY: uint, offsetX: number, offsetY: number): void;

  renderFrameStandard(pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera): void;
}

export abstract class DefaultRenderer implements Renderer {

  constructor(public TILE_SIZE_X: number = 8, public TILE_SIZE_Y: number = 8) {

  }

  abstract renderPixelStandard(outPixel: vec4, x: uint, y: uint,
    width: uint, height: uint,
    time: float,
    camera: ISPCCamera): vec4;

  renderTileStandard(taskIndex: uint,
    _threadIndex: uint,
    pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    _numTilesY: uint, dX: number = 0, dY: number = 0, stride: number = 0) {
    const tileY = Math.floor(taskIndex / numTilesX);
    const tileX = taskIndex - tileY * numTilesX;
    const x0 = tileX * this.TILE_SIZE_X;
    const x1 = Math.min(x0 + this.TILE_SIZE_X, width);
    const y0 = tileY * this.TILE_SIZE_Y;
    const y1 = Math.min(y0 + this.TILE_SIZE_Y, height);
    stride = stride || width;

    const outPixel = vec4.create();
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const index = ((x - dX) + (y - dY) * stride) * 4;
        pixels.set(this.renderPixelStandard(outPixel, x, y, width, height, time, camera), index);
      }
  }

  async renderTilesWithWorkerQueue(pixels: ArrayBuffer[], width: uint, height: uint, time: float, ispcCamera: ISPCCamera,
    numTilesX: uint, numTilesY: uint, queue: RenderQueue) {

    queue.onData = (i: number, response: WorkerResponse) => {
      pixels[i] = new Uint8ClampedArray(response.pixels);
    }
    for (let i = 0; i < pixels.length; i++) {
      queue.enqueue({
        render: {
          taskIndex: i,
          pixels: pixels[i],
          width, height, time,
          ispcCamera, numTilesX, numTilesY
        }
      }, i, [pixels[i]]);
    }
    return queue.process();
  }


  renderFrameStandard(pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera): void {

    const numTilesX = Math.floor((width + this.TILE_SIZE_X - 1) / this.TILE_SIZE_X);
    const numTilesY = Math.floor((height + this.TILE_SIZE_Y - 1) / this.TILE_SIZE_Y);
    const range = numTilesX * numTilesY;
    for (let i = 0; i < range; i++) {
      this.renderTileStandard(i, i, pixels, width, height, time, camera, numTilesX, numTilesY);
    }
  }
}