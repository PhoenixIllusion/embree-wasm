import { vec3 } from 'gl-matrix';
import { GpuDevice } from '../../gpu/device'
import { Camera } from '../common/tutorial/camera';
import { TriangleDemo } from './tutorial_data';
import { clamp } from '../common/math/math';

const TIMES = {
  EMBREE_START: 0,
  GPU_SETUP: 0,
  RAY_SET: 0,
  SET_RAYBUFFER: 0,
  INTERSECT: 0,
  READ_RAYHIT: 0,
  SHADOW_SET: 0,
  SET_SHADOW_BUFFER: 0,
  OCCLUDE: 0,
  READ_SHADOW_HIT: 0,
  RENDER: 0,
  TOTAL: 0
}

TIMES.TOTAL = performance.now();
const CANVAS_SIZE = 800;
const CANVAS_WIDTH = CANVAS_SIZE;
const CANVAS_HEIGHT = CANVAS_SIZE;

TIMES.EMBREE_START = performance.now();

const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
const canvasDbg = document.getElementById('canvas-dbg')! as HTMLCanvasElement;
canvasDbg.width = CANVAS_WIDTH
canvasDbg.height = CANVAS_HEIGHT
const ctx = canvasDbg.getContext('2d')!;
const pix = ctx.getImageData(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
pix.data.fill(255);

const SHADOW_ENABLED = true;
const tutorialApp = new TriangleDemo();
tutorialApp.device_init();

TIMES.GPU_SETUP = performance.now();
TIMES.EMBREE_START-= TIMES.GPU_SETUP;

const bvhData = tutorialApp.getBvhData();
const str: string[] = [];
for(let i=0;i<bvhData.length;i+=4){
   str.push(`${bvhData[i]},${bvhData[i+1]},${bvhData[i+2]},${bvhData[i+3]}`);
}
console.log(str.join(',\n'));


const device = new GpuDevice(CANVAS_SIZE, canvas, 1<<(Math.ceil(Math.log2(Math.sqrt(bvhData.length/4)))));
TIMES.RAY_SET = performance.now();
TIMES.GPU_SETUP-= TIMES.RAY_SET;

device.bvhBuffer.set(bvhData);

const rayOrig = device.raysOrigBuffer;
const rayDir = device.raysDirBuffer;

const camera = new Camera();

vec3.set(camera.from, 2.5, 1.5, -3.5);
vec3.set(camera.to, 0, 0, 0);
const ispCam = camera.getISPCCamera(CANVAS_WIDTH,CANVAS_HEIGHT);

let i=0;
const dir = vec3.create();
for(let y=0; y<CANVAS_HEIGHT;y++)
for(let x=0; x<CANVAS_WIDTH; x++) {
  const idx = i*4;
  rayOrig.set(ispCam.xfm.p, idx);
  rayOrig[idx+3] = 1e29;
  ispCam.setRayDir(dir, x, y);
  rayDir.set(dir, idx);
  dir[idx+3] = 0;
  i++;
}


TIMES.SET_RAYBUFFER = performance.now();
TIMES.RAY_SET-= TIMES.SET_RAYBUFFER;


device.setTriangleBuffer();
device.setBVHBuffer();
device.setRayBuffer();

TIMES.INTERSECT = performance.now();
TIMES.SET_RAYBUFFER-= TIMES.INTERSECT;

device.intersect();
//device.computeJS(canvasDbg);

TIMES.READ_RAYHIT = performance.now();
TIMES.INTERSECT-= TIMES.READ_RAYHIT;

const hitResult = new Float32Array(CANVAS_WIDTH*CANVAS_HEIGHT*4);
const geoPrimResult = new Float32Array(CANVAS_WIDTH*CANVAS_HEIGHT*4);
const hitShadow = new Float32Array(CANVAS_WIDTH*CANVAS_HEIGHT*4);
const geoPrimShadow = new Float32Array(CANVAS_WIDTH*CANVAS_HEIGHT*4);
device.readBuffer([hitResult,geoPrimResult]);


TIMES.SHADOW_SET = performance.now();
TIMES.READ_RAYHIT-= TIMES.SHADOW_SET;

const Ng = vec3.create();
const color = vec3.create();
const diffuse = vec3.create();
const lightDir = vec3.create();
vec3.normalize(lightDir, vec3.set(lightDir, -1, -1, -1));

let shadowCount = 0; 
for(let y=0;y<CANVAS_HEIGHT;y++)
for(let x=0;x<CANVAS_WIDTH;x++) {
    const idx = (x + y * CANVAS_WIDTH)*4;
    const orig = rayOrig.subarray(idx, idx+4);
    const dir = rayDir.subarray(idx, idx+4);
    const tfar = hitResult[idx+3];
    const geomID = geoPrimResult[idx];

    vec3.set(color, 0, 0, 0);
    if (geomID != -1) {
      if (SHADOW_ENABLED) {
        shadowCount++;
        orig[3] = 1e29;
        dir[3] = 0.001;

        vec3.scaleAndAdd(orig, ispCam.xfm.p, dir, tfar);
        vec3.negate(dir, lightDir);
      }
    } else {
      orig[3] = -1;
    }
}


TIMES.SET_SHADOW_BUFFER = performance.now();
TIMES.SHADOW_SET-= TIMES.SET_SHADOW_BUFFER;

if (SHADOW_ENABLED) {
  device.setRayBuffer();

  TIMES.OCCLUDE = performance.now();
  TIMES.SET_SHADOW_BUFFER-= TIMES.OCCLUDE;

  device.intersect();

  TIMES.READ_SHADOW_HIT = performance.now();
  TIMES.OCCLUDE-= TIMES.READ_SHADOW_HIT;

  device.readBuffer([hitShadow,geoPrimShadow]);

  TIMES.RENDER = performance.now();
  TIMES.READ_SHADOW_HIT-= TIMES.RENDER;

  for(let y=0;y<canvas.height;y++)
  for(let x=0;x<canvas.width;x++) {
    const idx = (x + y * CANVAS_WIDTH)*4;
    const [Ng_x, Ng_y, Ng_z, tfar] = hitResult.subarray(idx, idx+4);

    const geomIDs = geoPrimShadow[idx];
    const geomID = geoPrimResult[idx];
    const primID = geoPrimResult[idx+1];

    if (geomID >= 0){
      vec3.copy(diffuse, tutorialApp.data.face_colors[primID])
      if(geomIDs < 0) {
        vec3.set(Ng, Ng_x, Ng_y, Ng_z);
        const d = clamp(-vec3.dot(lightDir, Ng), 0, 1);
        vec3.scale(color, diffuse, d + .5);
      } else {
        vec3.scale(color, diffuse, .5);
      }
      pix.data[idx] = 255 * color[0]
      pix.data[idx+1] = 255 * color[1]
      pix.data[idx+2] = 255 * color[2]
    } else {
      pix.data[idx] = 0
      pix.data[idx+1] = 0
      pix.data[idx+2] = 0
    }
  }
}

TIMES.RENDER-= performance.now();
TIMES.TOTAL -= performance.now();

ctx.putImageData(pix, 0,0)

let log: string[] = ['<table>'];
Object.entries(TIMES).forEach(([key,val])=> {
  log.push(`<tr><td>${key}</td><td>${-val}</td></tr>`);
})
log.push('</table>')
const logEle = document.getElementById('log')!;
logEle.innerHTML = log.join('');