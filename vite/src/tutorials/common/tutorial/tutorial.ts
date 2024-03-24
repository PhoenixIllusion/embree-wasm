import { DefaultRenderer } from "../render/renderer";
import { float, uint } from "../types";
import { Camera } from "./camera";

import { RTC, Embree } from '../embree';


export abstract class TutorialApplication extends DefaultRenderer {
  
  public camera = new Camera();
  public g_device!: Embree.Device;

  constructor(public name: string, public feature: Embree.RTCFeatureFlags[], tileSizeX: uint, tilesizeY: uint) {
    super(tileSizeX, tilesizeY);
  }

  run(pixels: Uint8ClampedArray, width: uint, height: uint, time: float): void {
    this.g_device = RTC.newDevice('verbose=3,threads=1,tessellation_cache_size=0');
    this.device_init();
    this.renderFrameStandard(pixels, width, height, time, this.camera.getISPCCamera(width, height));
    this.device_cleanup();
  }

  runWithCanvas(canvas: HTMLCanvasElement, time: float) {
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(0,0,canvas.width, canvas.height);
    this.run(pixels.data, canvas.height, canvas.width, time);
    context.putImageData(pixels, 0, 0);
  }

  abstract device_init(): void;
  abstract device_cleanup(): void;
}