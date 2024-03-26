/*
Based on
https://github.com/embree/embree/blob/master/tutorials/common/tutorial/tutorial.h
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/common/tutorial/tutorial.h
*/

import { DefaultRenderer, RenderQueue } from "../render/renderer";
import { float, uint } from "../types";
import { Camera } from "./camera";

import { Embree } from '../embree'; 

export abstract class TutorialApplication extends DefaultRenderer {
  
  public camera = new Camera();
  public g_device!: Embree.Device;

  constructor(public name: string, public feature: Embree.RTCFeatureFlags[], public tileSizeX: uint, public tilesizeY: uint) {
    super(tileSizeX, tilesizeY);
  }

  run(pixels: Uint8ClampedArray, width: uint, height: uint, time: float): void {
    this.renderFrameStandard(pixels, width, height, time, this.camera.getISPCCamera(width, height));
    this.device_cleanup();
  }

  runWithCanvas(canvas: HTMLCanvasElement, time: float) {
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(0,0,canvas.width, canvas.height);
    this.run(pixels.data, canvas.height, canvas.width, time);
    context.putImageData(pixels, 0, 0);
  }

  async runWorkerQueue(canvas: HTMLCanvasElement, time: float, queue: RenderQueue) {
    const { width, height } = canvas;
    const numTilesX = Math.floor((canvas.width  + this.TILE_SIZE_X-1)/this.TILE_SIZE_X);
    const numTilesY = Math.floor((canvas.height + this.TILE_SIZE_Y-1)/this.TILE_SIZE_Y);
    const context = canvas.getContext('2d')!;
    const imageData: {x: number, y: number, pixels: ImageData}[] = [];
    const transferBuffers: ArrayBuffer[] = [];
    for(let y=0; y < height; y+= this.TILE_SIZE_Y)
    for(let x=0; x < width; x+=this.TILE_SIZE_X) {
      const tileW = Math.min(this.TILE_SIZE_X, width - x);
      const tileH = Math.min(this.TILE_SIZE_Y, height - y);
      imageData.push({x,y, pixels: new ImageData(tileW,tileH)});
      transferBuffers.push(new ArrayBuffer(tileH * tileH * 4));
    }
    const camera = this.camera.getISPCCamera(width, height);
    await this.renderTilesWithWorkerQueue(transferBuffers, width, height, time, camera, numTilesX, numTilesY, queue);
    imageData.forEach((tile,i) => {
      tile.pixels.data.set(new Uint8ClampedArray(transferBuffers[i]));
      context.putImageData(tile.pixels, tile.x, tile.y);
    })
  }

  abstract device_init(): void;
  abstract device_cleanup(): void;

  static runTutorial<C extends new ()=>TutorialApplication>(START_TIME: number, tutorialClass: C,canvasID: string, WIDTH: number, HEIGHT: number): void {
    const log = document.getElementById('fps')! as HTMLDivElement;
    const canvas = document.getElementById(canvasID)! as HTMLCanvasElement;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.width = Math.max(WIDTH*0.9,800)+'px'
    canvas.style.height = Math.max(HEIGHT*0.9,800)+'px'
    const tutorial = new tutorialClass();
  
    tutorial.device_init();
    const READ_TIME = performance.now();
    log.innerText += `Startup Time: ${READ_TIME - START_TIME} ms\n`
    tutorial.runWithCanvas(canvas, 0);
  
    log.innerText += `Render Time: ${performance.now() - READ_TIME} ms\n`
  }

  static async runTutorialWithWorkers<C extends new ()=>TutorialApplication>(START_TIME: number, tutorialClass: C, tutorialURL: string, canvasID: string, WIDTH: number, HEIGHT: number, workerCount = 6): Promise<void> {
    const log = document.getElementById('fps')! as HTMLDivElement;
    const canvas = document.getElementById(canvasID)! as HTMLCanvasElement;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.width = Math.max(WIDTH*0.9,800)+'px'
    canvas.style.height = Math.max(HEIGHT*0.9,800)+'px'
    const tutorial = new tutorialClass();
    const queue = new RenderQueue(tutorialURL, workerCount);
    await queue.ready();
    const READ_TIME = performance.now();
    log.innerText += `Startup Time: ${READ_TIME - START_TIME} ms\n`
    await tutorial.runWorkerQueue(canvas, 0, queue);
  
    log.innerText += `Render Time: ${performance.now() - READ_TIME} ms\n`
  }
}