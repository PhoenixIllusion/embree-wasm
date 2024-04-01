import { vec3 } from 'gl-matrix';
import { GpuDevice } from '../../gpu/device'
import { Camera } from '../common/tutorial/camera';
import { BVH_DATA } from './bvh';


/*
const tutorialApp = new TriangleDemo();
tutorialApp.device_init();

const bvhData = tutorialApp.getBvhData();
//*/

const bvhData = BVH_DATA;
const str: string[] = [];
for(let i=0;i<bvhData.length;i+=4){
   str.push(`${bvhData[i]},${bvhData[i+1]},${bvhData[i+2]},${bvhData[i+3]}`);
}
console.log(str.join(',\n'));

const CANVAS_SIZE = 400;
const CANVAS_WIDTH = CANVAS_SIZE;
const CANVAS_HEIGHT = CANVAS_SIZE;

const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
const canvasDbg = document.getElementById('canvas-dbg')! as HTMLCanvasElement;
const device = new GpuDevice(CANVAS_SIZE, canvas);

const BUFFER_SIZE = CANVAS_WIDTH*CANVAS_HEIGHT*4;
const tris = new Float32Array(BUFFER_SIZE);
const bvh = new Float32Array(BUFFER_SIZE);
bvh.set(bvhData);

const rayOrig = new Float32Array(BUFFER_SIZE);
const rayDir = new Float32Array(BUFFER_SIZE);

const camera = new Camera();

vec3.set(camera.from, 1.5, 1.5, -1.5);
vec3.set(camera.to, 0, 0, 0);
const ispCam = camera.getISPCCamera(CANVAS_WIDTH,CANVAS_HEIGHT);

let i=0;
for(let y=0; y<CANVAS_HEIGHT;y++)
for(let x=0; x<CANVAS_WIDTH; x++) {
  const idx = i*4;
  const orig = rayOrig.subarray(idx, (i+1)*4);
  orig[3] = 1e29;
  const dir = rayDir.subarray(idx, (i+1)*4);
  dir[4] = 0;
  vec3.copy(orig, ispCam.xfm.p);
  ispCam.setRayDir(dir, x, y);
  i++;
}

device.setTriangleBuffer(tris);
device.setBVHBuffer(bvh);
device.setRayBuffer(rayOrig, rayDir);

device.compute();
//device.computeJS(canvasDbg);

/*
const buffer0 = new Float32Array(64*4);
const buffer1 = new Float32Array(64*4);

device.readBuffer([buffer0, buffer1]);

console.log('0',buffer0);
console.log('1',buffer1);
*/