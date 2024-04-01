import { vec3, vec4 } from 'gl-matrix';
import { Embree, RTC, embree } from "../common/embree";
import { ISPCCamera } from '../common/tutorial/camera';
import { float, uint } from '../common/types';
import { TutorialApplication } from '../common/tutorial/tutorial';
import { SIZE_OF_TRIANGLE, SIZE_OF_VERTEX, wrapArrayAsTriangle, wrapArrayAsVertex } from '../common/tutorial/geometry';

export const USE_VERTEX_COLOR = false;

const v = {
  dir: vec3.create(),
  color: vec3.create(),
  lightDir: vec3.create(),
  Ng: vec3.create(),
  diffuse: vec3.create(),

  shadowOrig: vec3.create(),
  shadowDir: vec3.create(),
  shadow_fx: vec3.create()
}

interface TutorialData {
  face_colors: [float, float, float][],
  vertex_colors: [float, float, float][]
}
export class TriangleDemo extends TutorialApplication{

  protected g_scene!: Embree.Scene;

  protected interpolate!: Float32Array;

  protected data!: TutorialData;

  constructor() {
    super('GPUTriangleTutorial', [], 50, 50);
    vec3.set(this.camera.from, 1.5, 1.5, -1.5);
    vec3.set(this.camera.to, 0, 0, 0);
  }

  addCube(scene_i: Embree.Scene): uint {
    /* create a triangulated cube with 12 triangles and 8 vertices */
    const mesh = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_TRIANGLE);

    /* create face and vertex color arrays */
    const data: TutorialData = {
      face_colors: [],
      vertex_colors: []
    }

    /* set vertices and vertex colors */
    const vertices_ptr = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, 8);
    const vertices = wrapArrayAsVertex(embree.wrapTypedArray(vertices_ptr, 8 * 4, Float32Array));
    data.vertex_colors[0] = [0, 0, 0]; vertices[0].x = -1; vertices[0].y = -1; vertices[0].z = -1;
    data.vertex_colors[1] = [0, 0, 1]; vertices[1].x = -1; vertices[1].y = -1; vertices[1].z = +1;
    data.vertex_colors[2] = [0, 1, 0]; vertices[2].x = -1; vertices[2].y = +1; vertices[2].z = -1;
    data.vertex_colors[3] = [0, 1, 1]; vertices[3].x = -1; vertices[3].y = +1; vertices[3].z = +1;
    data.vertex_colors[4] = [1, 0, 0]; vertices[4].x = +1; vertices[4].y = -1; vertices[4].z = -1;
    data.vertex_colors[5] = [1, 0, 1]; vertices[5].x = +1; vertices[5].y = -1; vertices[5].z = +1;
    data.vertex_colors[6] = [1, 1, 0]; vertices[6].x = +1; vertices[6].y = +1; vertices[6].z = -1;
    data.vertex_colors[7] = [1, 1, 1]; vertices[7].x = +1; vertices[7].y = +1; vertices[7].z = +1;

    /* set triangles and face colors */
    let tri = 0;
    const triangles_ptr = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT3, SIZE_OF_TRIANGLE, 12);
    const triangles = wrapArrayAsTriangle(embree.wrapTypedArray(triangles_ptr, 36, Uint32Array));

    // left side
    data.face_colors[tri] = [1, 0, 0]; triangles[tri].v0 = 0; triangles[tri].v1 = 1; triangles[tri].v2 = 2; tri++;
    data.face_colors[tri] = [1, 0, 0]; triangles[tri].v0 = 1; triangles[tri].v1 = 3; triangles[tri].v2 = 2; tri++;

    // right side
    data.face_colors[tri] = [0, 1, 0]; triangles[tri].v0 = 4; triangles[tri].v1 = 6; triangles[tri].v2 = 5; tri++;
    data.face_colors[tri] = [0, 1, 0]; triangles[tri].v0 = 5; triangles[tri].v1 = 6; triangles[tri].v2 = 7; tri++;

    // bottom side
    data.face_colors[tri] = [0.5, 0.5, 0.5]; triangles[tri].v0 = 0; triangles[tri].v1 = 4; triangles[tri].v2 = 1; tri++;
    data.face_colors[tri] = [0.5, 0.5, 0.5]; triangles[tri].v0 = 1; triangles[tri].v1 = 4; triangles[tri].v2 = 5; tri++;

    // top side
    data.face_colors[tri] = [1, 1, 1]; triangles[tri].v0 = 2; triangles[tri].v1 = 3; triangles[tri].v2 = 6; tri++;
    data.face_colors[tri] = [1, 1, 1]; triangles[tri].v0 = 3; triangles[tri].v1 = 7; triangles[tri].v2 = 6; tri++;

    // front side
    data.face_colors[tri] = [0, 0, 1]; triangles[tri].v0 = 0; triangles[tri].v1 = 2; triangles[tri].v2 = 4; tri++;
    data.face_colors[tri] = [0, 0, 1]; triangles[tri].v0 = 2; triangles[tri].v1 = 6; triangles[tri].v2 = 4; tri++;

    // back side
    data.face_colors[tri] = [1, 1, 0]; triangles[tri].v0 = 1; triangles[tri].v1 = 5; triangles[tri].v2 = 3; tri++;
    data.face_colors[tri] = [1, 1, 0]; triangles[tri].v0 = 3; triangles[tri].v1 = 5; triangles[tri].v2 = 7; tri++;
    this.data = data;
    RTC.setGeometryVertexAttributeCount(mesh, 1);
    const vertex_colors = embree.allocTypedArray(data.vertex_colors.length * 4, Float32Array);
    vertex_colors.set(data.vertex_colors.map(([r, g, b]) => ([r, g, b, 1])).flat());
    RTC.setSharedGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_VERTEX_ATTRIBUTE, 0, embree.RTC_FORMAT_FLOAT3, vertex_colors.byteOffset, 0, 16, 8);

    RTC.commitGeometry(mesh);
    const geomID = RTC.attachGeometry(scene_i, mesh);
    RTC.releaseGeometry(mesh);
    return geomID;
  }


  addGroundPlane(scene_i: Embree.Scene) {
    /* create a triangulated plane with 2 triangles and 4 vertices */
    const geom = RTC.newGeometry(this.g_device, embree.RTC_GEOMETRY_TYPE_TRIANGLE);

    /* set vertices */
    const vertices_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, 4);
    const vertices = wrapArrayAsVertex(embree.wrapTypedArray(vertices_ptr, 16, Float32Array));
    vertices[0].x = -15; vertices[0].y = -2; vertices[0].z = -15;
    vertices[1].x = -15; vertices[1].y = -2; vertices[1].z = +15;
    vertices[2].x = +15; vertices[2].y = -2; vertices[2].z = -15;
    vertices[3].x = +15; vertices[3].y = -2; vertices[3].z = +15;

    /* set triangles */
    const triangles_ptr = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT3, SIZE_OF_TRIANGLE, 2);
    const triangles = wrapArrayAsTriangle(embree.wrapTypedArray(triangles_ptr, 6, Uint32Array));
    triangles[0].v0 = 0; triangles[0].v1 = 1; triangles[0].v2 = 2;
    triangles[1].v0 = 1; triangles[1].v1 = 3; triangles[1].v2 = 2;

    RTC.commitGeometry(geom);
    const geomID = RTC.attachGeometry(scene_i, geom);
    RTC.releaseGeometry(geom);
    return geomID;
  }

  device_init(): void {
    this.g_device = RTC.newDevice('tri_accel=bvh4.triangle4v,verbose=0,threads=1,tessellation_cache_size=0');
    this.interpolate = embree.allocTypedArray(4, Float32Array);

    /* create scene */
    this.g_scene = RTC.newScene(this.g_device);

    /* add ground plane */
    this.addGroundPlane(this.g_scene);

    this.addCube(this.g_scene);

    RTC.commitScene(this.g_scene);
  }
  device_cleanup(): void {
  }

  renderPixelStandard(outPixel: vec4, x: number, y: number, width: number, height: number, time: number, camera: ISPCCamera): vec4 {
    return outPixel;
  }

  getBvhRoot(): Embree.NodeRef4 {
    let bvh4: Embree.BVH4 | null = null;
    /* if the scene contains only triangles, the BVH4 acceleration structure can be obtained this way */
    const accel = embree.castObject(this.g_scene, embree.Accel).intersectors.get_ptr();
    if(accel.type === embree.ACCEL_TY_BVH4) {
      bvh4 = embree.castObject(accel, embree.BVH4);
    }
    /* if there are also other geometry types, one has to iterate over the toplevel AccelN structure */
    else if (accel.type === embree.ACCEL_TY_ACCELN) {
      let accelN = embree.castObject(accel, embree.AccelN);
      for(let i=0 ; i < accelN.accels.size(); i++) {
        if(accelN.accels.at(i).intersectors.get_ptr().type == embree.ACCEL_TY_BVH4) {
          bvh4 = embree.castObject(accelN.accels.at(i).intersectors.get_ptr(), embree.BVH4);
          if(bvh4.primTy.name() == 'triangle4v') break;
          bvh4 = null;
        }
      }
    }
    if(bvh4 == null) {
      throw new Error("cannot access BVH4 acceleration structure")
    }
    /* now lets print the entire hierarchy */
    return bvh4.root;
  }

  log(... args: any[]) {
    const s = args.map(x => ''+x).join('');
    document.getElementById('log')!.innerText += s+'\n';
  }
  logNoRetrun(... args: any[]) {
    const s = args.map(x => ''+x).join('');
    document.getElementById('log')!.innerText += s;
  }

  vec3fa2String(vec: Embree.Vec3fa) {
    return `(${vec.x},${vec.y},${vec.z})`
  }
  bounds2String(bounds: Embree.BBox3fa): string {
    return `${this.vec3fa2String(bounds.lower)} - ${this.vec3fa2String(bounds.upper)}`;
  }
 
  print_bvh4_triangle4v(node: Embree.NodeRef4, depth: number) {

    if (node.isAABBNode())
    {
      const n = embree.wrapPointer(node.get_ptr(), embree.AABBNode4);
      this.log("AABBNode {");
      for (let i=0; i<4; i++)
      {
        const args = [];
        for (let k=0; k<depth; k++) args.push("  ");
        this.log(... args, "  bounds", i,  " = ", this.bounds2String(n.bounds(i)));
      }
      for (let i=0; i<4; i++)
      {
        if (embree.getPointer(n.child(i)) == embree.BVH4.prototype.emptyNode)
          continue;

          const args = [];
          for (let k=0; k<depth; k++) args.push("  ");
          this.logNoRetrun(...args, "  child", i, " = ");this.print_bvh4_triangle4v(n.child(i),depth+1) 
        }
        const args = [];
        for (let k=0; k<depth; k++) args.push("  ");
        this.log(...args, "}");
      }
    else {
      let ptr = node.get_ptr();
      const num = (ptr & embree.NodeRef4.prototype.items_mask)-embree.NodeRef4.prototype.tyLeaf;
      ptr = ptr & ~embree.NodeRef4.prototype.align_mask;
      this.log("Leaf {");
      for(let i=0; i< num; i++) {
        /**
         * Originally thought this was a pointer array, but it is a solid block of data jumping by offsets of Tri4 size
         * Triangle4v Size 
         * V0: [XXXX][YYYY][ZZZZ]
         * V1: [XXXX][YYYY][ZZZZ]
         * V2: [XXXX][YYYY][ZZZZ]
         * Prim/Geom: [PPPP][GGGG]
         * Total for v1/2/3 = 4*3 * 3 = 36 floats
         *  + 8 for primitive/geo ids
         * = 44 float/I32s = 176 bytes
         */
        const tri = embree.wrapPointer(ptr + i*176, embree.Triangle4v);
        for(let j=0; j< tri.size(); j++) {
          const args = [];
          for (let k=0; k<depth; k++) args.push("  ");
          this.log(...args, "  Triangle[",j,"] { v0 = (" , tri.v0.x.get(j) ,", " ,tri.v0.y.get(j) ,", " ,tri.v0.z.get(j) ,"),  ",
          "v1 = (" ,tri.v1.x.get(j) ,", " ,tri.v1.y.get(j) ,", " ,tri.v1.z.get(j) ,"), ",
          "v2 = (" ,tri.v2.x.get(j) ,", " ,tri.v2.y.get(j) ,", " ,tri.v2.z.get(j) ,"), ",
          "geomID = " ,tri.geomID(j) ,", primID = " ,tri.primID(j) ," }" )
        }
      }
      const args = [];
      for (let k=0; k<depth; k++) args.push("  ");
      this.log(... args, "}");
    }
  }

  encodeVec3fa(vec3fa: Embree.Vec3fa, buffer: number[]): void {
    const { x, y, z } = vec3fa;
    buffer.push(x,y,z,0);
  }
  encodeBounds(bounds: Embree.BBox3fa, buffer: number[]): void {
    this.encodeVec3fa(bounds.lower, buffer)
    this.encodeVec3fa(bounds.upper, buffer)
  }
  encodeVec3v4f4(vec: Embree.Vec3vf4, i: number, buffer: number[]): void {
    const x = vec.x.get(i);
    const y = vec.y.get(i);
    const z = vec.z.get(i);
    buffer.push(x,y,z, 1);
  }
  encodeTriangleData(triangle4: Embree.Triangle4v, buffer: number[]) {
    const geomIDs: number[] = [];
    const primIDs: number[] = [];
    for(let i=0;i<4;i++) {
      this.encodeVec3v4f4(triangle4.v0, i, buffer);
      this.encodeVec3v4f4(triangle4.v1, i, buffer);
      this.encodeVec3v4f4(triangle4.v2, i, buffer);
      geomIDs.push(triangle4.geomID(i));
      primIDs.push(triangle4.primID(i));
    }
    buffer.push(... geomIDs);
    buffer.push(... primIDs);
  }

  encodeBvhData(node: Embree.NodeRef4, bvh: number[]) {

    if (node.isAABBNode())
    {
      const n = embree.wrapPointer(node.get_ptr(), embree.AABBNode4);

      const childIds = bvh.length;
      bvh.push(8,8,8,8);
      for (let i=0; i<4; i++)
      {
        this.encodeBounds(n.bounds(i), bvh);
      }
      for (let i=0; i<4; i++)
      {
        const child = n.child(i);
        const ptr = child.get_ptr();
        if (ptr == embree.BVH4.prototype.emptyNode)
          continue;
        bvh[childIds+i] = (bvh.length/4) << 4 | (ptr & 0xF);
        this.encodeBvhData(child, bvh);
      }
    } else {
      let ptr = node.get_ptr();
      const num = (ptr & embree.NodeRef4.prototype.items_mask)-embree.NodeRef4.prototype.tyLeaf;
      ptr = ptr & ~embree.NodeRef4.prototype.align_mask;
      for(let i=0; i< num; i++){
        const tri = embree.wrapPointer(ptr + i*176, embree.Triangle4v);
        this.encodeTriangleData(tri, bvh);
      }

    }

  }

  getBvhData() {
    const bvh: number[] = [];
    this.print_bvh4_triangle4v(this.getBvhRoot(), 0);
    this.encodeBvhData(this.getBvhRoot(), bvh);
    return bvh;
  }
}