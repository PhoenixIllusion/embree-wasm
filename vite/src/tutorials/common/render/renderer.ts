import { ISPCCamera } from "../tutorial/camera";
import { uint, float } from "../types";

export interface Renderer {

  renderPixelStandard(x: uint,
    y: uint, 
    pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float ,
    camera: ISPCCamera): void;

  renderTileStandard(taskIndex: uint,
    threadIndex: uint,
    pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    numTilesY: uint): void

  renderTileTask (taskIndex: uint, threadIndex: uint, pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    numTilesY: uint): void;

  renderFrameStandard( pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera): void;
}

export abstract class DefaultRenderer implements Renderer {

  constructor( private TILE_SIZE_X: number = 8, private TILE_SIZE_Y: number = 8) {

  }

  abstract renderPixelStandard(x: uint,
    y: uint, 
    pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float ,
    camera: ISPCCamera): void;

  renderTileStandard(taskIndex: uint,
    _threadIndex: uint,
    pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    _numTilesY: uint) {
      const tileY = Math.floor(taskIndex / numTilesX);
      const tileX = taskIndex - tileY * numTilesX;
      const x0 = tileX * this.TILE_SIZE_X;
      const x1 = Math.min(x0 + this.TILE_SIZE_X, width);
      const y0 = tileY * this.TILE_SIZE_Y;
      const y1 = Math.min(y0 + this.TILE_SIZE_Y, height);
    
      for (let y=y0; y<y1; y++)
      for (let  x=x0; x<x1; x++)
      {
        this.renderPixelStandard(x,y,pixels,width,height,time,camera);
      }
    }

  renderTileTask (taskIndex: uint, threadIndex: uint, pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera,
    numTilesX: uint,
    numTilesY: uint): void {

      this.renderTileStandard(taskIndex,threadIndex,pixels,width,height,time,camera,numTilesX,numTilesY);
    }

  renderFrameStandard( pixels: Uint8ClampedArray,
    width: uint,
    height: uint,
    time: float,
    camera: ISPCCamera): void {

      const numTilesX = Math.floor((width  + this.TILE_SIZE_X-1)/this.TILE_SIZE_X);
      const numTilesY = Math.floor((height + this.TILE_SIZE_Y-1)/this.TILE_SIZE_Y);
      const range = numTilesX * numTilesY;
      for(let i=0; i < range; i++) {
        this.renderTileTask(i, i, pixels, width, height, time, camera, numTilesX, numTilesY);
      }
  }
}