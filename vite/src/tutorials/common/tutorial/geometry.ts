import { float, uint } from "../types";


export const SIZE_OF_VERTEX = 4 * 4;
export const SIZE_OF_TRIANGLE = 4 * 3;

export class Vertex {
  constructor(private d: Float32Array){

  }
  get x() { return this.d[0]}
  set x(v: float) { this.d[0] = v;}

  get y() { return this.d[1]}
  set y(v: float) { this.d[1] = v;}

  get z() { return this.d[2]}
  set z(v: float) { this.d[2] = v;}
}
export function wrapArrayAsVertex( array: Float32Array) {
  const result: Vertex[] = [];
  for(let i=0;i< array.length;i+=4) {
    result.push(new Vertex(array.subarray(i, i+4)));
  }
  return result;
}

export class Triangle {
  constructor(private d: Uint32Array){

  }
  get v0() { return this.d[0]}
  set v0(v: uint) { this.d[0] = v;}

  get v1() { return this.d[1]}
  set v1(v: uint) { this.d[1] = v;}

  get v2() { return this.d[2]}
  set v2(v: uint) { this.d[2] = v;}
}

export function wrapArrayAsTriangle( array: Uint32Array) {
  const result: Triangle[] = [];
  for(let i=0;i< array.length;i+=3) {
    result.push(new Triangle(array.subarray(i, i+3)));
  }
  return result;
}