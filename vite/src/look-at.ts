import { vec3, mat4 } from "gl-matrix";


export function LookAt( P: vec3, T: vec3, M: mat4): mat4
{
  const z = vec3.create();
  vec3.normalize(z, vec3.sub(z,T,P));
  const x = vec3.create();
  vec3.normalize(x, vec3.cross(x, z, vec3.set(x, 0, 1, 0 )));
  const y = vec3.create();
  vec3.cross(y, x, z);
  mat4.identity(M);
  mat4.translate(M, M, P);
  M[0] = x[0], M[4] = x[1], M[8] = x[2];
  M[1] = y[0], M[5] = y[1], M[9] = y[2];
  M[2] = z[0], M[6] = z[1], M[10] = z[2];
  return M;
}