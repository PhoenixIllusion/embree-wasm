/*
Based on
https://github.com/embree/embree/blob/master/common/math/affinespace.h
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/common/math/affinespace.h
*/


import { vec3 } from "gl-matrix";
import { LinearSpace3 } from "./linearspace";
import { TMP_V3, madd_vec3 } from "./math";

export class AffineSpace3f {
  public l: LinearSpace3;
  constructor(l: [vec3, vec3, vec3]|LinearSpace3, public p: vec3) {
    if(l instanceof LinearSpace3) {
      this.l = l;
    } else {
      const [vx, vy, vz] = l;
      this.l = new LinearSpace3(vx, vy, vz);
    }
  }

  static lookAt(eye: vec3, point: vec3, up: vec3): AffineSpace3f {

    const Z = vec3.sub(vec3.create(), point, eye);
    vec3.normalize(Z, Z);
    const U = vec3.cross(vec3.create(), up, Z);
    vec3.normalize(U, U);
    const V = vec3.cross(vec3.create(), Z, U);
    vec3.normalize(V, V);
    const e = vec3.copy(vec3.create(), eye);
    return new AffineSpace3f([U,V,Z], e);
  }

  clone(): AffineSpace3f {
    const vx = vec3.copy(vec3.create(), this.l.vx);
    const vy = vec3.copy(vec3.create(), this.l.vy);
    const vz = vec3.copy(vec3.create(), this.l.vz);
    const p = vec3.copy(vec3.create(), this.p);
    return new AffineSpace3f([vx,vy,vz],p);
  }

  rcp() {
    const il = this.l.rcp();
    const p = il.transformPoint(vec3.create(), this.p)
    vec3.negate(p,p);
    return new AffineSpace3f(il, p)
  }

  xfmPoint(out: vec3, p: vec3) {
    const [x,y,z] = p;
    const px = vec3.set(TMP_V3[0], x, x, x);
    const py = vec3.set(TMP_V3[1], y, y, y);
    const pz = vec3.set(TMP_V3[2], z, z, z);

    const {vx, vy, vz} = this.l;

    madd_vec3(out, pz, vz, this.p)
    madd_vec3(out, py, vy, out);
    madd_vec3(out, px, vx, out);
    return out;
  }
}