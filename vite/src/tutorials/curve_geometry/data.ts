/*
Based on
https://github.com/embree/embree/tree/master/tutorials/curve_geometry
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/curve_geometry/curve_geometry_device.h
*/

import { float } from "../common/types";

export const NUM_VERTICES = 9
export const NUM_CURVES = 6

export const W = 2.0

type F3 = [float, float, float];
type F4 = [float, float, float, float];

export const static_hair_vertices: F4[] =
  [
    [-1.0, 0.0, -   W, 0.2],

    [+0.0, -1.0, +0.0, 0.2],
    [+1.0, 0.0, +   W, 0.2],
    [-1.0, 0.0, +   W, 0.2],
    [+0.0, +1.0, +0.0, 0.6],
    [+1.0, 0.0, -   W, 0.2],
    [-1.0, 0.0, -   W, 0.2],

    [+0.0, -1.0, +0.0, 0.2],
    [+1.0, 0.0, +   W, 0.2],
  ];

export const static_hair_normals: F3[] =
  [
    [-1.0, 0.0, 0.0],

    [0.0, +1.0, 0.0],
    [+1.0, 0.0, 0.0],
    [0.0, -1.0, 0.0],
    [-1.0, 0.0, 0.0],
    [0.0, +1.0, 0.0],
    [+1.0, 0.0, 0.0],

    [0.0, -1.0, 0.0],
    [-1.0, 0.0, 0.0],
  ];

export const static_hair_vertex_colors: F3[] =
  [
    [1.0, 1.0, 0.0],

    [1.0, 0.0, 0.0],
    [1.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 0.0, 0.0],
    [1.0, 1.0, 0.0],

    [1.0, 0.0, 0.0],
    [1.0, 1.0, 0.0],
  ];

export const static_hair_indices = [
  0, 1, 2, 3, 4, 5
];

export const static_hair_indices_linear = [
  1, 2, 3, 4, 5, 6
];

export const static_hair_flags_linear = [
  0x3, 0x3, 0x3, 0x3, 0x3, 0x3
];

export class TutorialData {
  constructor() {

  }
}