import { vec3 } from "gl-matrix";
import { float } from "../types";

export const TMP_V3: [vec3, vec3, vec3, vec3] = [vec3.create(), vec3.create(), vec3.create(), vec3.create()]


const ident_v3 = vec3.set(vec3.create(), 1,1,1);

export function rcp_f32(v: float): float {
  return 1/v;
}
export function rcp_vec3(out: vec3, v: vec3): vec3 {
  return vec3.div(out, ident_v3, v);
}

export function madd_f32(a: float, b: float, c: float): float {
  return a*b + c;
}
export function msub_f32(a: float, b: float, c: float): float {
  return a*b - c;
}

export function madd_vec3(out: vec3, a: vec3, b: vec3, c: vec3) {
  const [ax,ay,az] = a;
  const [bx,by,bz] = b;
  const [cx,cy,cz] = c;
  return vec3.set(out, madd_f32(ax,bx,cx),madd_f32(ay,by,cy),madd_f32(az,bz,cz));
}
export function msub_vec3(out: vec3, a: vec3, b: vec3, c: vec3) {
  const [ax,ay,az] = a;
  const [bx,by,bz] = b;
  const [cx,cy,cz] = c;
  return vec3.set(out, msub_f32(ax,bx,cx),msub_f32(ay,by,cy),msub_f32(az,bz,cz));
}

export function clamp(v: float, lower: float, upper: float) {
  return Math.max(Math.min(v, upper), lower);
}

export function deg2rad(deg: float) {
  return  deg * (Math.PI / 180.0);
}