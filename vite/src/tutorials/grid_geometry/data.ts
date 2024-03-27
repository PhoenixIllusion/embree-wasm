/*
Based on
https://github.com/embree/embree/blob/master/tutorials/grid_geometry/
FullLink
https://github.com/embree/embree/blob/0c236df6f31a8e9c8a48803dada333e9ea0029a6/tutorials/grid_geometry/grid_geometry_device.cpp
*/

export const EDGE_LEVEL = 257
export const GRID_RESOLUTION_X = EDGE_LEVEL
export const GRID_RESOLUTION_Y = EDGE_LEVEL

export const  NUM_INDICES = 80
export const  NUM_FACES = 22
export const  NUM_VERTICES = (5+10+5)

/* this geometry is a sphere with a pentagon at the top, 5 quads connected 
to the edges, and triangles between the quads. This is mirrored to make a 
sphere topology. */
export const sphere_indices =
[
  0, 1, 2, 3, 4,
  0, 14, 5,
  0, 5, 6, 1,
  1, 6, 7,
  1, 7, 8, 2,
  2, 8, 9,
  2, 9, 10, 3,
  3, 10, 11,
  3, 11, 12, 4,
  4, 12, 13,
  4, 13, 14, 0,

  15, 19, 18, 17, 16,
  15, 5, 14,
  15, 16, 6, 5,
  16, 7, 6,
  16, 17, 8, 7,
  17, 9, 8,
  17, 18, 10, 9,
  18, 11, 10,
  18, 19, 12, 11,
  19, 13, 12,
  19, 15, 14, 13,
];

export const sphere_faces = [
  5, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4,
  5, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4,
];
