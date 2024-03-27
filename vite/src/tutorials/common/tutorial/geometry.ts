/*
Based on
https://github.com/embree/embree/blob/master/tutorials/common/tutorial/tutorial_device.h
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/common/tutorial/tutorial_device.h
*/

import { vec3, vec4 } from "gl-matrix";
import { float, uint } from "../types";

export const SIZE_OF_VERTEX = 4 * 4;
export const SIZE_OF_TRIANGLE = 4 * 3;
export const SIZE_OF_GRID = 4 * 3;

export class Vertex {
  constructor(private d: Float32Array) {

  }
  get x() { return this.d[0] }
  set x(v: float) { this.d[0] = v; }

  get y() { return this.d[1] }
  set y(v: float) { this.d[1] = v; }

  get z() { return this.d[2] }
  set z(v: float) { this.d[2] = v; }

  get r() { return this.d[3]; }
  set r(v: float) { this.d[3] = v; }

  get vec3(): vec3 {
    return this.d;
  }

  get vec4(): vec4 {
    return this.d;
  }
}
export function wrapArrayAsVertex(array: Float32Array) {
  const result: Vertex[] = [];
  for (let i = 0; i < array.length; i += 4) {
    result.push(new Vertex(array.subarray(i, i + 4)));
  }
  return result;
}

export class Triangle {
  constructor(private d: Uint32Array) {

  }
  get v0() { return this.d[0] }
  set v0(v: uint) { this.d[0] = v; }

  get v1() { return this.d[1] }
  set v1(v: uint) { this.d[1] = v; }

  get v2() { return this.d[2] }
  set v2(v: uint) { this.d[2] = v; }
}

export function wrapArrayAsTriangle(array: Uint32Array) {
  const result: Triangle[] = [];
  for (let i = 0; i < array.length; i += 3) {
    result.push(new Triangle(array.subarray(i, i + 3)));
  }
  return result;
}

export class Grid {
  private d16
  constructor(private d32: Uint32Array) {
    this.d16 = new Uint16Array(d32.buffer, d32.byteOffset, d32.length * 2);
  }
  get startVertexID() { return this.d32[0] }
  set startVertexID(v: uint) { this.d32[0] = v; }

  get stride() { return this.d32[1] }
  set stride(v: uint) { this.d32[1] = v; }

  get width() { return this.d16[4] }
  set width(v: uint) { this.d16[4] = v; }

  get height() { return this.d16[5] }
  set height(v: uint) { this.d16[5] = v; }

}

export function wrapArrayAsGrid(array: Uint32Array) {
  const result: Grid[] = [];
  for (let i = 0; i < array.length; i += 3) {
    result.push(new Grid(array.subarray(i, i + 3)));
  }
  return result;
}