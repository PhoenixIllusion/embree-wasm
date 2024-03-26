import { AffineSpace3f } from "../math/affinespace";
import { float } from "../types";
import { ISPCCamera } from "./camera";
import { TutorialApplication } from "./tutorial";

export interface OnInit {
  init: {
    url: string;
  }
}
export interface OnDestroy {
  destroy: any;
}

export interface WorkerRequest {
  render: {
    taskIndex: number,
    time: float,
    pixels: ArrayBuffer
    width: number;
    height: number;
    ispcCamera: ISPCCamera;
    numTilesX: number;
    numTilesY: number;
  }
}

export interface WorkerResponse {
  taskIndex: number;
  pixels: ArrayBuffer;
}

let application: TutorialApplication|null = null;

self.onmessage = async (e) => {

  const { init, render, destroy } = e.data as OnInit & WorkerRequest & OnDestroy;
  if(init !== undefined)
  {
    const module  = (await import(init.url)) as { default: new ()=>TutorialApplication};
    application = new module.default();
    application.device_init();
    postMessage(true);
  }
  if(render !== undefined && application) {
    const {taskIndex, time, pixels, width, height,  numTilesX, numTilesY} = render;

    const { l, p} = render.ispcCamera.xfm;
    const ispcCamera = new ISPCCamera(new AffineSpace3f([l.vx, l.vy, l.vz], p))
    
    const tileY = Math.floor(taskIndex / numTilesX);
    const tileX = taskIndex - tileY * numTilesX;
    const x0 = tileX * application.TILE_SIZE_X;
    const y0 = tileY * application.TILE_SIZE_Y;
    application.renderTileStandard(taskIndex, 0, new Uint8ClampedArray(pixels), width, height, time, ispcCamera, numTilesX, numTilesY, 
        x0, y0, application.TILE_SIZE_X);
    const response: WorkerResponse = { taskIndex, pixels };
    postMessage(response, { transfer: [pixels] })
  }
  if(destroy !== undefined && application) {
    application.device_cleanup();
  }
}