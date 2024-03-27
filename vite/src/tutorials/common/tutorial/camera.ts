/*
Based on
https://github.com/embree/embree/blob/master/tutorials/common/tutorial/camera.h
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/common/tutorial/camera.h
*/

import { vec3 } from "gl-matrix";
import { float, uint } from "../types";
import { AffineSpace3f } from "../math/affinespace";
import { TMP_V3, deg2rad } from "../math/math";
import Embree from "../../../em/embree";

export enum Handedness {
  LEFT_HAND,
  RIGHT_HAND
}

export class ISPCCamera {
  public render_time: float = 0;
  constructor(public xfm: AffineSpace3f) { }

  setRayOrigin(ray: Embree.RTCRay): Embree.RTCRay {
    [ray.org_x, ray.org_y, ray.org_z] = this.xfm.p;
    return ray;
  }
  setRayDir(out: vec3, x: uint, y: uint): vec3 {
    const px = vec3.set(TMP_V3[0], x, x, x);
    const py = vec3.set(TMP_V3[1], y, y, y);
    const l = this.xfm.l;

    vec3.mul(px, px, l.vx);
    vec3.mul(py, py, l.vy);
    const dir = vec3.add(out, px, py);
    vec3.add(dir, dir, l.vz);
    vec3.normalize(dir, dir);
    return dir;
  }
}

export class Camera {
  public from: vec3 = vec3.set(vec3.create(), 0.0001, 0.0001, -3);   //!< position of camera
  public to: vec3 = vec3.set(vec3.create(), 0, 0, 0);     //!< look at point
  public up: vec3 = vec3.set(vec3.create(), 0, 1, 0);     //!< up vector
  public fov: float = 90;     //!< field of view
  public handedness: Handedness = Handedness.RIGHT_HAND;

  constructor(from?: vec3, to?: vec3, up?: vec3, fov?: float, handedness?: Handedness) {
    if (from) this.from = vec3.copy(vec3.create(), from);
    if (to) this.to = vec3.copy(vec3.create(), to);
    if (up) this.up = vec3.copy(vec3.create(), up);
    if (fov) this.fov = fov;
    if (handedness) this.handedness = handedness;
  }

  camera2world(): AffineSpace3f {
    const local2world = AffineSpace3f.lookAt(this.from, this.to, this.up);
    if (this.handedness == Handedness.RIGHT_HAND) {
      vec3.negate(local2world.l.vx, local2world.l.vx,);
    }
    return local2world;
  }
  world2camera(): AffineSpace3f {
    return this.camera2world().rcp();
  }

  getISPCCamera(width: uint, height: uint): ISPCCamera {
    const fovScale = 1.0 / Math.tan(deg2rad(0.5 * this.fov));
    const local2world: AffineSpace3f = this.camera2world();

    //vx = local2world.l.vx

    const vzx = vec3.scale(TMP_V3[0], local2world.l.vx, -0.5 * width);
    const vzy = vec3.scale(TMP_V3[1], local2world.l.vy, 0.5 * height);
    const vz = vec3.scale(local2world.l.vz, local2world.l.vz, 0.5 * height * fovScale);
    vec3.add(vz, vz, vzy)
    vec3.add(vz, vz, vzx);
    //vz = -0.5f*width*local2world.l.vx + 0.5f*height*local2world.l.vy + 0.5f*height*fovScale*local2world.l.vz;

    vec3.negate(local2world.l.vy, local2world.l.vy);
    //vy = -local2world.l.vy;

    return new ISPCCamera(local2world);
  }
}