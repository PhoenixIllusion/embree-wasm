import { vec3, vec4 } from 'gl-matrix';
import { float, uint } from '../../tutorials/common/types';
import { max, min } from '../../tutorials/common/math/math';

interface vec2 {
  x: number, y: number
}
function vec2(x: float, y: float): vec2 {
  return { x, y}
}

function v3(v: vec4):vec3 {
  return [v[0],v[1],v[2]]
}
function min_v3(out: vec3, a: vec3, b: vec3) {
  const [ax, ay, az] = a;
  const [bx, by, bz] = b;

  vec3.set(out, min(ax,bx),min(ay,by),min(az,bz))
}
function max_v3(out: vec3, a: vec3, b: vec3) {
  const [ax, ay, az] = a;
  const [bx, by, bz] = b;

  vec3.set(out, max(ax,bx),max(ay,by),max(az,bz))
}
function mod(v: float, modu: float): float {
  return v % modu;
}

function ivec2(x: float, y: float): vec2 {
  return vec2( 0| x, 0| y);
}

function int(v: float): number {
  return 0 | v;
}
function float(v: float): number {
  return v;
}

export interface sampler2D {
  data: Float32Array;
  width: uint;
  height: uint;
}
function textureSize(sampler: sampler2D, _mipLevel: number): vec2 {
  return vec2(sampler.width, sampler.height);
}
function texelFetch(sampler: sampler2D, uv: vec2, _mipLevel: number) {
  const offset = 4 * (uv.x + uv.y * sampler.height);
  const ret = vec4.create();
  vec4.copy(ret, sampler.data.subarray(offset, offset+4));
  return ret;
}

export let u_rootID: float = 0;
export let uTrianglesSampler: sampler2D = { data: new Float32Array(0), width: 0, height: 0};
export let uBVHSampler: sampler2D = { data: new Float32Array(0), width: 0, height: 0};
export let uRayOrigSampler: sampler2D = { data: new Float32Array(0), width: 0, height: 0};
export let uRayDirSampler: sampler2D = { data: new Float32Array(0), width: 0, height: 0};
let bvhTexSize: float = 0;


function GetBVHCoord(i: float): vec2  {
  return ivec2( mod(i, bvhTexSize), i / bvhTexSize );
}

function GetBVHData(i: float): vec4 {
  return texelFetch(uBVHSampler, GetBVHCoord(i), 0);
}
 
  //layout(location = 0) out vec4 outRayHit;
  //layout(location = 1) out vec4 outGeomPrim;
  


function TriangleIntersect( v0: vec3, v1: vec3, v2: vec3, rayOrigin: vec4, rayDirection: vec3, geoID: float, primID: float, result: vec4): void
{
  const edge1 = vec3.create();
  const edge2 = vec3.create();
  vec3.sub(edge1, v1, v0);
  vec3.sub(edge2, v2, v0);

  const pvec = vec3.create();
  vec3.cross(pvec, rayDirection, edge2);
  const det: float  = 1.0 / vec3.dot(edge1, pvec);
  const tvec = vec3.create();
  vec3.sub(tvec, v3(rayOrigin), v0);
  const u: float = vec3.dot(tvec, pvec) * det;

  const qvec = vec3.create();
  vec3.cross(qvec, tvec, edge1);
  const v = vec3.dot(rayDirection, qvec) * det;
  const t = vec3.dot(edge2, qvec) * det;
  if (t <= 0.0 || u < 0.0 || u > 1.0 || v < 0.0 || u + v > 1.0) {
      return;
  }
  if(t < rayOrigin[3]) {
    rayOrigin[3] = t;
    vec4.set(result, geoID, primID, u, v);
  }
}
//--------------------------------------------------------------------------------------
function BoundingBoxIntersect( minCorner: vec3, maxCorner: vec3, rayOrigin: vec3, invDir: vec3 ): float
//--------------------------------------------------------------------------------------
{
  const near = vec3.create();
  const far = vec3.create();
  const tmin = vec3.create();
  const tmax = vec3.create();

  vec3.sub(near, minCorner, rayOrigin);
  vec3.mul(near, near, invDir);
  vec3.sub(far, maxCorner, rayOrigin);
  vec3.mul(far, far, invDir);
  
  min_v3(tmin, near, far);
  max_v3(tmax, near, far);
  
  const t0 = max( max(tmin[0], tmin[1]), tmin[2]);
  const t1 = min( min(tmax[0], tmax[1]), tmax[2]);
  
  return max(t0, 0.0) > t1 ? 1e30 : t0;
}

let stackptr = 1;
const stackLevels: vec2[] = [];

function CheckAABB(nodeId: float, rayOrigin: vec3, t: float, invDir: vec3) {

  const childIDs = GetBVHData(nodeId/16.0);

  const t0 = vec2(childIDs[0], 1e30);
  const t1 = vec2(childIDs[1], 1e30);
  const t2 = vec2(childIDs[2], 1e30);
  const t3 = vec2(childIDs[3], 1e30);
  let i = nodeId;
  if(childIDs[0] > 8.) {
    t0.y = BoundingBoxIntersect(v3(GetBVHData(i+1.0)), v3(GetBVHData(i+2.0)), rayOrigin, invDir);
    if (t0.y < t) {
      stackLevels[stackptr] = t0; stackptr++;
    }
  }
  i+=2.;
  if(childIDs[1] > 8.) {
    t1.y = BoundingBoxIntersect(v3(GetBVHData(i+1.0)), v3(GetBVHData(i+2.0)), rayOrigin, invDir);
    if (t1.y < t) {
      stackLevels[stackptr] = t1; stackptr++;
    }
  }
  i+=2.;
  if(childIDs[2] > 8.) {
    t2.y = BoundingBoxIntersect(v3(GetBVHData(i+1.0)), v3(GetBVHData(i+2.0)), rayOrigin, invDir);
    if (t2.y < t) {
      stackLevels[stackptr] = t2; stackptr++;
    }
  }
  i+=2.;
  if(childIDs[3] > 8.) {
    t3.y = BoundingBoxIntersect(v3(GetBVHData(i+1.0)), v3(GetBVHData(i+2.0)), rayOrigin, invDir);
    if (t3.y < t) {
      stackLevels[stackptr] = t3; stackptr++;
    }
  }
}

function CheckTriangle(triId: float, rayOrigin: vec4, dir: vec3, geoID: float, primID: float, result: vec4): void {
    const v0 = GetBVHData(triId+0.);
    const v1 = GetBVHData(triId+1.);
    const v2 = GetBVHData(triId+2.);
    TriangleIntersect( v3(v0), v3(v1), v3(v2), rayOrigin, dir, geoID, primID, result);
}

function CheckTrianglev4(nodeId: float, rayOrigin: vec4, dir: vec3, result: vec4): void {
  const nodeCount = int(mod(nodeId, 8.));
  let triIDs: float = nodeId/16.0;

  for(let i=0; i < nodeCount; i++) {
    const geoIDs: vec4 = GetBVHData(triIDs+12.0);
    const primIDs: vec4 = GetBVHData(triIDs+13.0);
    if(geoIDs[0] >= 0.) {
      CheckTriangle(triIDs, rayOrigin, dir, geoIDs[0], primIDs[0], result);
    }
    if(geoIDs[1] >= 0.) {
      CheckTriangle(triIDs+3., rayOrigin, dir, geoIDs[1], primIDs[1], result);
    }
    if(geoIDs[2] >= 0.) {
      CheckTriangle(triIDs+6., rayOrigin, dir, geoIDs[2], primIDs[2], result);
    }
    if(geoIDs[3] >= 0.) {
      CheckTriangle(triIDs+9., rayOrigin, dir, geoIDs[3], primIDs[3], result);
    }
    triIDs += 14.;
  }
}

function TraverseBVH( nodeId: float, rayOrigin: vec4, dir: vec3): vec4 {
  stackLevels[0] = vec2(nodeId, -1e30);

  const invDir = vec3.create();
  vec3.div(invDir, [1,1,1], dir);
  const result = vec4.set(vec4.create(), -1,-1,-1,-1);
  stackptr = 1;
  while (true)
  {
    if(stackptr == 0)
      break;
    stackptr--;
    const cur:vec2 = stackLevels[stackptr];
    if(cur.y > rayOrigin[3])
      continue;
    const nodeType = mod(cur.x, 16.);
    if(nodeType > 8.) {
      CheckTrianglev4(cur.x, rayOrigin, dir, result);
    } else {
      CheckAABB(cur.x, v3(rayOrigin), rayOrigin[3], invDir);
    }
  }

  return result;
}


export let out_color = vec4.create();

export function main(): void {
  bvhTexSize = float(textureSize(uBVHSampler, 0).x);  // size of mip 0
  const texelCoord: vec2 = ivec2(gl_FragCoord.x,gl_FragCoord.y);

  const orig: vec4 = texelFetch(uRayOrigSampler, texelCoord, 0);
  const dir: vec4 = texelFetch(uRayDirSampler, texelCoord, 0);
  
  const initialT = orig[3];
  const result: vec4 = TraverseBVH(u_rootID, orig, v3(dir));
  
  //vec4 result = vec4(-1.,-1.,-1.,-1.);
  //CheckTrianglev4(1041., orig, dir.xyz, result);
  const t = orig[3];

  if(t < initialT) {
    vec4.set(out_color, t/5.,t/5.,0,1);
  } else if (t < 0. ) {
    vec4.set(out_color,1,0,0,1);
  } else {
    vec4.set(out_color, 0,0,1,1);
  }
}

export let gl_FragCoord: vec2 = vec2(0,0);