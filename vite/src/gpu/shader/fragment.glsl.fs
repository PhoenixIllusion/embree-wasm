#version 300 es
precision mediump float;

uniform float u_rootID;

uniform sampler2D uTrianglesSampler;
uniform sampler2D uBVHSampler;
uniform sampler2D uRayOrigSampler;
uniform sampler2D uRayDirSampler;
uniform bool uOcclude;

layout(location = 0) out vec4 outRayHit;
layout(location = 1) out vec4 outGeomPrim;

float bvhTexSize;

void TriangleIntersect( vec3 v0, vec3 v1, vec3 v2, inout vec4 rayOrigin, vec4 rayDirection, float geoID, float primID, inout vec4 geoPrim, inout vec3 norm)
{
	vec3 edge1 = v1 - v0;
	vec3 edge2 = v2 - v0;
	vec3 pvec = cross(rayDirection.xyz, edge2);
	float det = 1.0 / dot(edge1, pvec);
	vec3 tvec = rayOrigin.xyz - v0;
	float u = dot(tvec, pvec) * det;
	vec3 qvec = cross(tvec, edge1);
	float v = dot(rayDirection.xyz, qvec) * det;
	float t = dot(edge2, qvec) * det;
	if (t <= 0.0 || u < 0.0 || u > 1.0 || v < 0.0 || u + v > 1.0) {
      return;
  }
  if(t < rayOrigin.w && t > rayDirection.w) {
    rayOrigin.w = t;
    geoPrim = vec4(geoID, primID, u, v);
    norm = cross(edge1, edge2);
  }
}

//--------------------------------------------------------------------------------------
float BoundingBoxIntersect( vec3 minCorner, vec3 maxCorner, vec3 rayOrigin, vec3 invDir )
//--------------------------------------------------------------------------------------
{
	vec3 near = (minCorner - rayOrigin) * invDir;
	vec3 far  = (maxCorner - rayOrigin) * invDir;
	
	vec3 tmin = min(near, far);
	vec3 tmax = max(near, far);
	
	float t0 = max( max(tmin.x, tmin.y), tmin.z);
	float t1 = min( min(tmax.x, tmax.y), tmax.z);
	
	return max(t0, 0.0) > t1 ? 1e30 : t0;
}

ivec2 GetBVHCoord(const float i)  {
  return ivec2( mod(i, bvhTexSize), i / bvhTexSize );
}

vec4 GetBVHData(const float i) {
  return texelFetch(uBVHSampler, GetBVHCoord(i), 0);
}

int stackptr = 1;
vec2 stackLevels[28];

void CheckAABB(float nodeId, vec3 rayOrigin, float tNear, float tFar, vec3 invDir) {

  vec4 childIDs = GetBVHData(nodeId/16.0);

  vec2 t0 = vec2(childIDs.x, 1e30);
  vec2 t1 = vec2(childIDs.y, 1e30);
  vec2 t2 = vec2(childIDs.z, 1e30);
  vec2 t3 = vec2(childIDs.w, 1e30);
  float i = nodeId;
  if(childIDs.x > 8.) {
    t0.y = BoundingBoxIntersect(GetBVHData(i+1.0).xyz, GetBVHData(i+2.0).xyz, rayOrigin, invDir);
    if (t0.y > tNear && t0.y < tFar) {
      stackLevels[stackptr] = t0; stackptr++;
    }
  }
  i+=2.;
  if(childIDs.y > 8.) {
    t1.y = BoundingBoxIntersect(GetBVHData(i+1.0).xyz, GetBVHData(i+2.0).xyz, rayOrigin, invDir);
    if (t1.y > tNear && t1.y < tFar) {
      stackLevels[stackptr] = t1; stackptr++;
    }
  }
  i+=2.;
  if(childIDs.z > 8.) {
    t2.y = BoundingBoxIntersect(GetBVHData(i+1.0).xyz, GetBVHData(i+2.0).xyz, rayOrigin, invDir);
    if (t2.y > tNear && t2.y < tFar) {
      stackLevels[stackptr] = t2; stackptr++;
    }
  }
  i+=2.;
  if(childIDs.w > 8.) {
    t3.y = BoundingBoxIntersect(GetBVHData(i+1.0).xyz, GetBVHData(i+2.0).xyz, rayOrigin, invDir);
    if (t3.y > tNear && t3.y < tFar) {
      stackLevels[stackptr] = t3; stackptr++;
    }
  }
}

void CheckTriangle(float triId, inout vec4 rayOrigin, vec4 dir, float geoID, float primID, inout vec4 result, inout vec3 norm) {
    vec4 v0 = GetBVHData(triId+0.);
    vec4 v1 = GetBVHData(triId+1.);
    vec4 v2 = GetBVHData(triId+2.);
    TriangleIntersect( v0.xyz, v1.xyz, v2.xyz, rayOrigin, dir, geoID, primID, result, norm);
}

void CheckTrianglev4(float nodeId, inout vec4 rayOrigin, vec4 dir, inout vec4 result, inout vec3 norm) {
  int nodeCount = int(mod(nodeId, 8.));
  float triIDs = nodeId/16.0;

  for(int i=0; i < nodeCount; i++) {
    vec4 geoIDs = GetBVHData(triIDs+12.0);
    vec4 primIDs = GetBVHData(triIDs+13.0);
    if(geoIDs.x >= 0.) {
      CheckTriangle(triIDs, rayOrigin, dir, geoIDs.x, primIDs.x, result, norm);
    }
    if(geoIDs.y >= 0.) {
      CheckTriangle(triIDs+3., rayOrigin, dir, geoIDs.y, primIDs.y, result, norm);
    }
    if(geoIDs.z >= 0.) {
      CheckTriangle(triIDs+6., rayOrigin, dir, geoIDs.z, primIDs.z, result, norm);
    }
    if(geoIDs.w >= 0.) {
      CheckTriangle(triIDs+9., rayOrigin, dir, geoIDs.w, primIDs.w, result, norm);
    }
    triIDs += 14.;
  }
}

vec4 TraverseBVH( float nodeId, inout vec4 rayOrigin, vec4 dir, inout vec3 norm) {
  stackLevels[0] = vec2(nodeId, -1e30);

  vec3 invDir = 1./dir.xyz;
  vec4 result = vec4(-1,-1,-1,-1);
  stackptr = 1;
  while (true)
  {
    if(stackptr == 0)
      break;
    stackptr--;
    vec2 cur = stackLevels[stackptr];
    if(cur.y > rayOrigin.w)
      continue;
    float nodeType = mod(cur.x, 16.);
    if(nodeType > 8.) {
      CheckTrianglev4(cur.x, rayOrigin, dir, result, norm);
      if(uOcclude && result.x >=0.) {
        return result;
      }
    } else {
      CheckAABB(cur.x, rayOrigin.xyz, dir.w, rayOrigin.w, invDir);
    }
  }

  return result;
}


//out vec4 out_color;

void main() {
  bvhTexSize = float(textureSize(uBVHSampler, 0).x);  // size of mip 0
  ivec2 texelCoord = ivec2(gl_FragCoord.xy);

  vec4 orig = texelFetch(uRayOrigSampler, texelCoord, 0);
  vec4 dir = texelFetch(uRayDirSampler, texelCoord, 0);
  
  vec3 norm = vec3(-1.);
  float initialT = orig.w;
  if(initialT >= 0.) {
    outGeomPrim = TraverseBVH(u_rootID, orig, dir, norm);
    outRayHit = vec4(norm, orig.w);
  } else {
    outGeomPrim = vec4(-1.);
    outRayHit = vec4(-1.);
  }

/*
  float t = orig.w;
  vec3 lightDir = normalize(vec3(-2,-1,-1));
  vec3 Ng = normalize(norm);
  float d = clamp(-dot(lightDir, Ng), 0., 1.);

  if(t < initialT) {
    out_color = vec4(d/2.+.5,d/2.+.5,0,1);
  } else if (t < 0. ) {
    out_color = vec4(1,0,0,1);
  } else {
    out_color = vec4(0,0,1,1);
  }
  */
}