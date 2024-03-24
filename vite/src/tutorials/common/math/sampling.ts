import { vec3 } from "gl-matrix";
import { float } from "../types";


export interface Sample3f {
  v: vec3;
  pdf: float;
}

export function make_Sample3f(v: vec3, pdf: float) {
  return {
    v, pdf
  }
}