import Embree from './em/embree';
import { mat4, quat, vec3 } from 'gl-matrix';
import { LookAt } from './look-at';
import { loadModel } from './mesh';

const embree = await Embree();

const RTC = (embree.RTC.prototype as typeof Embree.RTC);



let _cacheReset4: Uint8Array|null = null;
const _raySize4 = RTC.sizeOfRTCRayHit4();
const _raySize8 = RTC.sizeOfRTCRayHit8();

function resetRayN(ray: Embree.RTCRayHit4|Embree.RTCRayHit8, N: 4|8) {
  if(_cacheReset4 != null) {
    const ptr = embree.getPointer(ray);
    embree.HEAP8.set(_cacheReset4, ptr);
  } else {
    const r = ray.ray;
    const h = ray.hit;
    for(let i=0; i < N;i++) {
      r.set_flags(i,0);
      r.set_mask(i, -1);
      r.set_tfar(i, 1e10);
      r.set_tnear(i, 0);
      h.set_primID(i, -1);
      h.set_geomID(i, -1);
      h.set_Ng_x(i, 1e30);
      h.set_Ng_y(i, 1e30);
      h.set_Ng_z(i, 1e30);
    }
    ray.ray = r;
    ray.hit = h;
    const ptr = embree.getPointer(ray);
    const raySize = N == 4 ? _raySize4 : _raySize8;
    _cacheReset4 = new Uint8Array(raySize);
    _cacheReset4.set(embree.HEAP8.subarray(ptr, ptr+ raySize));
  }
}


let _cacheReset1: Uint8Array|null = null;
const _raySize = RTC.sizeOfRTCRayHit();
function resetRay(ray: Embree.RTCRayHit) {
  if(_cacheReset1 != null) {
    const ptr = embree.getPointer(ray);
    embree.HEAP8.set(_cacheReset1, ptr);
  } else {
    const r = ray.ray;
    r.flags = 0;
    r.mask = -1;
    r.tfar = 1e30;
    r.tnear = 0;
    ray.ray = r;
    const h = ray.hit;
    h.primID = -1;
    h.geomID = -1;
    ray.hit = h;
    const ptr = embree.getPointer(ray);
    _cacheReset1 = new Uint8Array(_raySize);
    _cacheReset1.set(embree.HEAP8.subarray(ptr, ptr+ _raySize));
  }
}

function render(out: Uint8ClampedArray, width: number, height: number, buffer: Float32Array, range: { min: number, max: number}): void {
  const delta = range.max - range.min;
  const t = (v: number) => v;//v-range.min)/delta;
  for(let y=0;y<height;y++) {
    for(let x=0;x<width;x++) {
      const buff_idx = (x + y*width);
      const idx = buff_idx* 4;
      if(buffer[buff_idx] >= 0) {
        const c = buffer[buff_idx];
        const v = (1.0-t(c));
        out[idx+1] = out[idx+2] = c*255;
        out[idx] = out[idx+1];
        out[idx+3] = 255;
      } else {
        out[idx] = 255;
        out[idx+1] = 0;
        out[idx+2] = 255;
        out[idx+3] = 255;
      }
    }
  }
}

const device = RTC.newDevice('verbose=3,threads=1,tessellation_cache_size=0');

function addGroundPlane(device: Embree.Device ,scene: Embree.Scene) {

  const mesh = RTC.newGeometry(device, embree.RTC_GEOMETRY_TYPE_TRIANGLE);
  const vertices = RTC.setNewGeometryBuffer(
    mesh, embree.RTC_BUFFER_TYPE_VERTEX,
    0, embree.RTC_FORMAT_FLOAT3,
    4*4, 4);
  
  const f32_vert = new Float32Array(embree.HEAP8.buffer, vertices, 16);
  f32_vert.set([ 
    -10, -2, -10, 1, 
    -10, -2, 10, 1, 
    10, -2, -10, 1, 
    10, -2, 10, 1]);

  const triangles = RTC.setNewGeometryBuffer(
    mesh, embree.RTC_BUFFER_TYPE_INDEX,
    0,embree.RTC_FORMAT_UINT3,
    3 * 4, 2);

  const u32_index = new Uint32Array(embree.HEAP8.buffer, triangles, 6);
  u32_index.set([ 0, 1, 2, 1, 3, 2]);

  RTC.commitGeometry(mesh);
  const geomID = RTC.attachGeometry(scene, mesh);
  RTC.releaseGeometry(mesh);
  return geomID;
}

async function addRabbit(device: Embree.Device): Promise<Embree.Scene> {
  const rabbitData = await loadModel('bunny.obj');

  const vertexCount = rabbitData.vertices.length/4
  const indexCount = rabbitData.index.length/3;

  const mesh = RTC.newGeometry(device, embree.RTC_GEOMETRY_TYPE_TRIANGLE);
  const vertexBufferPtr = RTC.setNewGeometryBuffer(
    mesh, embree.RTC_BUFFER_TYPE_VERTEX,
    0, embree.RTC_FORMAT_FLOAT3,
    4*4, vertexCount);
  embree.HEAPF32.set(rabbitData.vertices, vertexBufferPtr/4);


  const indexBufferPtr = RTC.setNewGeometryBuffer(
    mesh,embree.RTC_BUFFER_TYPE_INDEX,
    0, embree.RTC_FORMAT_UINT3,
    3 * 4, indexCount);
  embree.HEAPU32.set(rabbitData.index, indexBufferPtr/4);

  RTC.commitGeometry(mesh);
  const scene = RTC.newScene(device);
  RTC.attachGeometry(scene, mesh);
  RTC.releaseGeometry(mesh);
  RTC.commitScene(scene);
  return scene;
}

const INSTANCE_COUNT = 8;
const transformMatrix_ptr = embree._malloc(INSTANCE_COUNT * 4 * 16);
const transformMatrix = [];
for(let i=0;i<INSTANCE_COUNT;i++) {
  transformMatrix[i] = new Float32Array(embree.HEAP8.buffer, transformMatrix_ptr + i*4 * 16, 16);
}

function createRabbitInstance(scene: Embree.Scene, rabbit: Embree.Scene, instance: number): Embree.Geometry {
  const g_instance0 = RTC.newGeometry(device, embree.RTC_GEOMETRY_TYPE_INSTANCE);
  RTC.setGeometryInstancedScene(g_instance0, rabbit);
  RTC.setGeometryTimeStepCount(g_instance0,1);
  RTC.attachGeometry(scene, g_instance0);
  RTC.releaseGeometry(g_instance0);
  RTC.setGeometryTransform(g_instance0,0,embree.RTC_FORMAT_FLOAT4X4_COLUMN_MAJOR, transformMatrix_ptr + instance * 4 * 16);
  RTC.commitGeometry(g_instance0);
  return g_instance0;
}

const scene = RTC.newScene(device);

addGroundPlane(device, scene);
const rabbitScene = await addRabbit(device);

const rabbits: Embree.Geometry[] = [];
let rabbitIndex = 0;


mat4.fromTranslation(transformMatrix[rabbitIndex], [0,.5,0])
mat4.fromRotationTranslation(transformMatrix[1], quat.setAxisAngle(quat.create(), [0,1,0], Math.PI/3), [1,0,.5])
mat4.fromRotationTranslation(transformMatrix[2], quat.setAxisAngle(quat.create(), [0,1,0], -Math.PI/3), [-1,0,-.5])
mat4.fromRotationTranslation(transformMatrix[3], quat.setAxisAngle(quat.create(), [0,1,0], -Math.PI/6), [-1.5,0.5,.5])
mat4.fromRotationTranslation(transformMatrix[4], quat.setAxisAngle(quat.create(), [0,1,0], Math.PI/6), [1.5,0.5,.5])
mat4.fromRotationTranslation(transformMatrix[5], quat.setAxisAngle(quat.create(), [0,1,0], -Math.PI), [.25,0,1.15])
mat4.fromRotationTranslation(transformMatrix[6], quat.setAxisAngle(quat.create(), [0,1,0], Math.PI/6), [-0.25,0.5,.5])
mat4.fromRotationTranslation(transformMatrix[7], quat.setAxisAngle(quat.create(), [0,1,0], Math.PI), [1.5,0.5,.5])

for(let i=0;i<INSTANCE_COUNT;i++) {
  rabbits.push(createRabbitInstance(scene, rabbitScene, rabbitIndex++));
}

RTC.commitScene(scene);

interface Camera {
  pos: vec3,
  lookAt: vec3;
  matrix: mat4
}

const p0 = vec3.create();
const p1 = vec3.create();
const p2 = vec3.create();

const d10 = vec3.create();
const d20 = vec3.create();

const posXY = vec3.create();
const posX = vec3.create()
const posY = vec3.create()

const SIZE = 1400;
const WIDTH = SIZE;
const HEIGHT = SIZE;
const out_buf_size = WIDTH*HEIGHT*12;
const out_buf_ptr = embree._malloc(out_buf_size);
const out_buf = new Float32Array(embree.HEAP8.buffer, out_buf_ptr, WIDTH * HEIGHT*3);
(out_buf as any).ptr = out_buf_ptr;
const out = new Float32Array(WIDTH * HEIGHT);

const light_v3 = vec3.normalize(vec3.create(),[1,-1,-1]);
const diffuse_v3 = vec3.set(vec3.create(), 0.8,1,1);
const ray_ng_v3 = vec3.create();
const color_v3 = vec3.create();

const dir_list = [vec3.create(),vec3.create(),vec3.create(),vec3.create(),vec3.create(),vec3.create(),vec3.create(),vec3.create()];

function bvh_intersect<R extends Embree.RTCRayHit|Embree.RTCRayHit4|Embree.RTCRayHit8>
  (width: number, height: number, camera: Camera, ray: R, N: 1|4|8, 
    resetRay: (r: R)=>void,
    intersect: (scene: Embree.Scene, dir: vec3[], iargs?: Embree.RTCIntersectArguments)=>(null|vec3)[]
    ) {
  const cam = camera.pos;
  const ar = width / height;

  const M = camera.matrix;
  vec3.set(p0, -1 * ar, 1, 1.5);
  vec3.set(p1,  1 * ar, 1, 1.5);
  vec3.set(p2, -1 * ar,-1, 1.5);
  
  vec3.transformMat4(p0, p0, M);
  vec3.transformMat4(p1, p1, M);
  vec3.transformMat4(p2, p2, M);

  vec3.sub(d10, p1, p0);
  vec3.sub(d20, p2, p0);
  vec3.sub(p0, p0, cam);

  for (let y = 0; y < height; y++) {
    const dY = y/height;
    vec3.scale(posY, d20, dY);
    vec3.add(posY, p0, posY);
    for (let x = 0; x < width; x+=N) {

      for(let n = 0; n < N; n++) {
        const dX = (x+n)/width;
        vec3.scaleAndAdd(posXY, posY, d10, dX);        
        vec3.normalize(dir_list[n], posXY);
      }

      resetRay(ray);

      const results = intersect(scene, dir_list);

      for(let n = 0; n < N; n++) {
        const hit = results[n];
        if(hit != null) {
          const [ Ng_x, Ng_y, Ng_z ] = hit;
          vec3.set(ray_ng_v3, Ng_x, Ng_y, Ng_z );
          vec3.normalize(ray_ng_v3, ray_ng_v3);
  
          const dot = vec3.dot(light_v3, ray_ng_v3);
          vec3.scale(color_v3, diffuse_v3, -dot);
          out[x + n + y * WIDTH] = Math.min(Math.max(0, color_v3[0]), 1);
        } else {
          out[x + n + y * WIDTH] = -1;
        }
      }
    }
  }
}

const camera: Camera = {
  pos: vec3.set(vec3.create(), 0.5, 1.5, 3),
  lookAt: vec3.set(vec3.create(), 0, 0.5, 0),
  matrix: mat4.create()
}

let log_buf = '';
const log = document.getElementById('fps') as HTMLDivElement;
function time(name: string, cb: ()=>void) {
  const NOW = performance.now();
  cb();
  log_buf += `${name}: ${performance.now() - NOW}\n`
  log.innerText = log_buf;
}

LookAt(camera.pos, camera.lookAt, camera.matrix);

const MODE: number = 3;

//for(let MODE = 0; MODE < 5; MODE++)
{
  if(MODE == 0) {

    const ray = RTC.allocRTCRayHit();
    const r = ray.ray;
    [r.org_x, r.org_y, r.org_z] = camera.pos;
    resetRay(ray);

    const cam = camera.pos;
    const ar = WIDTH / HEIGHT;
  
    const M = camera.matrix;
    vec3.set(p0, -1 * ar, 1, 1.5);
    vec3.set(p1,  1 * ar, 1, 1.5);
    vec3.set(p2, -1 * ar,-1, 1.5);
    
    vec3.transformMat4(p0, p0, M);
    vec3.transformMat4(p1, p1, M);
    vec3.transformMat4(p2, p2, M);
  
    vec3.sub(d10, p1, p0);
    vec3.sub(d20, p2, p0);
    out.fill(-1);
    out_buf.fill(1e30);
    time('embree render [1-tile]', () => {
    RTC.tileIntersect1(cam[0],cam[1],cam[2],
      scene, ray, WIDTH, HEIGHT,
      p0[0], p0[1],p0[2],
      d10[0],d10[1],d10[2],
      d20[0],d20[1],d20[2],
      0, WIDTH, 0, HEIGHT, out_buf_ptr, 48, 12);
    });
    for(let i=0;i<out_buf.length;i+=3) {
      if(out_buf[i]<1e8) {
        vec3.normalize(ray_ng_v3, out_buf.subarray(i,i+3));
        const dot = vec3.dot(light_v3, ray_ng_v3);
        vec3.scale(color_v3, diffuse_v3, -dot);
        out[i/3] = Math.min(Math.max(0, color_v3[0]), 1);
      }
    }
  }

  if(MODE == 1)
  {
    const ray = RTC.allocRTCRayHit();
    const r = ray.ray;
    [r.org_x, r.org_y, r.org_z] = camera.pos;
    resetRay(ray);
    time('embree render [1]', () => {
      bvh_intersect(
        WIDTH, HEIGHT,
        camera, ray, 1, 
        resetRay, (scene, dir) => {
          const r = ray.ray;
          [r.dir_x, r.dir_y, r.dir_z] = dir[0];
          
          RTC.intersect1(scene, ray);
    
          const z = ray.ray.tfar;
          if(z < 1e10) {
            const { Ng_x, Ng_y, Ng_z } = ray.hit;
            vec3.set(dir[0], Ng_x, Ng_y, Ng_z);
            return [dir[0]]
          } else {
            return [null];
          }
        });
    });
  }

  if(MODE == 3) {

    const ray = RTC.allocRTCRayHit4();
    const _maskPtr = RTC.allocRTCRayMask(4);
    const rayMask = new Int32Array(embree.HEAP8.buffer, embree.getPointer(_maskPtr), 4);
    (rayMask as any).ptr = _maskPtr;
    const r = ray.ray;
    for(let i=0;i<4;i++) {
      r.set_org_x(i, camera.pos[0])
      r.set_org_y(i, camera.pos[1])
      r.set_org_z(i, camera.pos[2])
      rayMask[i] = -1;
    }
    resetRayN(ray, 4);

    const cam = camera.pos;
    const ar = WIDTH / HEIGHT;
  
    const M = camera.matrix;
    vec3.set(p0, -1 * ar, 1, 1.5);
    vec3.set(p1,  1 * ar, 1, 1.5);
    vec3.set(p2, -1 * ar,-1, 1.5);
    
    vec3.transformMat4(p0, p0, M);
    vec3.transformMat4(p1, p1, M);
    vec3.transformMat4(p2, p2, M);
  
    vec3.sub(d10, p1, p0);
    vec3.sub(d20, p2, p0);
    out.fill(-1);
    out_buf.fill(1e30);
    time('embree render [4-tile]', () => {
    RTC.tileIntersect4(cam[0],cam[1],cam[2],
      scene, ray, WIDTH, HEIGHT,
      p0[0], p0[1],p0[2],
      d10[0],d10[1],d10[2],
      d20[0],d20[1],d20[2],
      0, WIDTH, 0, HEIGHT, out_buf_ptr, 48, 12, _maskPtr);
    });
    let out_i = 0;
    for(let i=0;i<out_buf.length;i+=12) {
      for(let j=0;j<4;j++) {
        if(out_buf[i+j]<1e8) {
          vec3.set(ray_ng_v3, out_buf[i+j], out_buf[i+4+j], out_buf[i+8+j] );
          vec3.normalize(ray_ng_v3, ray_ng_v3);
          const dot = vec3.dot(light_v3, ray_ng_v3);
          vec3.scale(color_v3, diffuse_v3, -dot);
          out[out_i] = Math.min(Math.max(0, color_v3[0]), 1);
        }
        out_i++
      }
    }
  }
  if(MODE == 4)
  {
    const ray = RTC.allocRTCRayHit4();
    const _maskPtr = RTC.allocRTCRayMask(4);
    const rayMask = new Int32Array(embree.HEAP8.buffer, embree.getPointer(_maskPtr), 4);
    (rayMask as any).ptr = _maskPtr;
    const r = ray.ray;
    for(let i=0;i<4;i++) {
      r.set_org_x(i, camera.pos[0])
      r.set_org_y(i, camera.pos[1])
      r.set_org_z(i, camera.pos[2])
      rayMask[i] = -1;
    }
    resetRayN(ray, 4);
    time('embree render [4]', () => {
      bvh_intersect(
        WIDTH, HEIGHT,
        camera, ray, 4, 
        (ray) => resetRayN(ray,4), (scene, dir) => {
          
          const r = ray.ray;
          for(let i=0;i<4;i++) {
            r.set_dir_x(i,dir[i][0])
            r.set_dir_y(i,dir[i][1])
            r.set_dir_z(i,dir[i][2])
          }
          ray.ray = r;
          
          RTC.intersect4(_maskPtr, scene, ray);
    
          const ret: (null|vec3)[] = [... dir];
          for(let i=0;i<4;i++) {
            const z = ray.ray.get_tfar(i);
            if(z < 1e10) {
              const h = ray.hit;
              const Ng_x = h.get_Ng_x(i);
              const Ng_y = h.get_Ng_y(i);
              const Ng_z = h.get_Ng_z(i);
              vec3.set(dir[i], Ng_x, Ng_y, Ng_z);
            } else {
              ret[i] = null;
            }
          }
          return ret;
        });
    });
  }
}


const canvas: HTMLCanvasElement = document.querySelector('#canvas')!;
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = Math.max(WIDTH*0.9,800)+'px'
canvas.style.height = Math.max(HEIGHT*0.9,800)+'px'

const context = canvas.getContext('2d')!;

const range = { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY};
out.forEach(v => {
  if(v >= 0) {
    range.min = Math.min(range.min, v);
    range.max = Math.max(range.max, v);
  }
});

const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
render(imgData.data, canvas.width, canvas.height, out, range)
context.putImageData(imgData, 0, 0);
