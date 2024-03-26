/*
Based on
https://github.com/embree/embree/blob/master/common/math/linearspace3.h
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/common/math/linearspace3.h
*/

import { vec3 } from "gl-matrix";
import { float } from "../types";
import { TMP_V3, madd_vec3 } from "./math";

export class LinearSpace3 {
  constructor(public vx: vec3,public vy: vec3, public vz: vec3) {}

  inverse() {
    const det = this.det();
    const adjoint = this.adjoint();
    return adjoint.scaleScalar(1/det);
  }

  transposed(): LinearSpace3 {
    const [vxx,vxy,vxz] = this.vx;
    const [vyx,vyy,vyz] = this.vy;
    const [vzx,vzy,vzz] = this.vz;
    return LinearSpace3.fromValues(vxx,vxy,vxz, vyx,vyy,vyz, vzx,vzy,vzz)
  }
  adjoint() {
    const crossYZ = vec3.cross(vec3.create(), this.vy, this.vz);
    const crossZX = vec3.cross(vec3.create(), this.vz, this.vx);
    const crossXY = vec3.cross(vec3.create(), this.vx, this.vy);
    return new LinearSpace3(crossYZ, crossZX, crossXY).transposed();
  }
  det(){
    return vec3.dot(this.vx, vec3.cross(TMP_V3[0], this.vy, this.vz));
  }

  rcp() {
    return this.inverse();
  }

  transformPoint(out: vec3, p: vec3) {
    const [x,y,z] = p;
    const bx = vec3.set(TMP_V3[0], x, x, x);
    const by = vec3.set(TMP_V3[1], y, y, y);
    const bz = vec3.set(TMP_V3[2], z, z, z);

    vec3.mul(bz, bz, this.vz);
    madd_vec3(by, by, this.vy, bz);
    madd_vec3(out, bx, this.vx, by);
    return out;
  }

  scaleScalar(v: float) {
    const vx = vec3.scale(vec3.create(), this.vx, v);
    const vy = vec3.scale(vec3.create(), this.vy, v);
    const vz = vec3.scale(vec3.create(), this.vz, v);
    return new LinearSpace3(vx, vy, vz);
  }

  static fromValues( m00: float, m01: float, m02: float,
                     m10: float, m11: float, m12: float,
                     m20: float, m21: float, m22: float): LinearSpace3 {
    const vx = vec3.set(vec3.create(), m00,m10,m20);
    const vy = vec3.set(vec3.create(), m01,m11,m21);
    const vz = vec3.set(vec3.create(), m02,m12,m22);
    return new LinearSpace3(vx,vy,vz);
  }
}