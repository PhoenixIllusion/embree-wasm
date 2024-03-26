/*
Based on
https://github.com/embree/embree/blob/master/tutorials/common/tutorial/optics.h
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/common/tutorial/optics.h
*/

import { vec3 } from "gl-matrix";
import { float } from "../types";
import { Sample3f, make_Sample3f } from "../math/sampling";
import { rcp_f32 } from "../math/math";

const TMP: [vec3, vec3, vec3, vec3] = [vec3.create(),vec3.create(),vec3.create(),vec3.create()];

export function reflect(out: vec3, V: vec3, N: vec3): vec3
export function reflect(out: vec3, V: vec3, N: vec3, cosi: float): vec3
export function reflect(out: vec3, V: vec3, N: vec3, cosi?: float): vec3 {
  const scale = 2 * (cosi || vec3.dot(V,N));
  vec3.scale(out, N, scale);
  vec3.sub(out, out, V);
  return out;
}

export function refract(out: vec3, V: vec3, N: vec3, eta: float, cosi: float, cost: float): Sample3f {
  const k = 1.0 - eta * eta * (1.0 - cosi * cosi);
  if(k < 0.0) {
    cost = 0.0;
    vec3.set(out, 0, 0, 0);
    return make_Sample3f(out, 0);
  }
  
  cost = Math.sqrt(k);
  const cosiN = vec3.scale(TMP[0], N, cosi); // cosi*N
  const cosiNV = vec3.sub(TMP[0], cosiN, V); // cosi*N - V
  const etaCosiNV = vec3.scale(TMP[0], cosiNV, eta);// eta * (cosi*N - V) 

  const costN = vec3.scale(out, N, cost); // cost * N
  const val = vec3.sub(out, etaCosiNV, costN); // eta*(cosi*N - V) - cost*N
  
  return make_Sample3f(val, eta * eta)
}

export function resnelDielectric( cosi: float, eta: float): float
export function resnelDielectric( cosi: float, cost: float, eta: float): float
export function resnelDielectric( cosi: float, cost: float, eta?: float): float
{
  if(eta == undefined) {
    eta = cost;
    const k = 1.0 - eta * eta * (1.0 - cosi * cosi);
    if (k < 0.0) return 1.0;
    cost = Math.sqrt(k);
  }

  const Rper = (eta*cosi -     cost) * rcp_f32(eta*cosi +     cost);
  const Rpar = (    cosi - eta*cost) * rcp_f32(    cosi + eta*cost);
  return 0.5 * (Rpar*Rpar + Rper*Rper);
}

