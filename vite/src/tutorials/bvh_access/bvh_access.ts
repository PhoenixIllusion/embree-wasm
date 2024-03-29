import { vec3, vec4 } from "gl-matrix";
import { embree, RTC, Embree } from "../common/embree";
import { SIZE_OF_TRIANGLE, SIZE_OF_VERTEX, wrapArrayAsTriangle, wrapArrayAsVertex } from "../common/tutorial/geometry";


export default class BVHAccess {

  addCube (device_i: Embree.Device, scene_i: Embree.Scene, _pos: vec3)
  {
    const pos = {x:0,y:0,z:0};
    [pos.x, pos.y, pos.z ] = _pos;
    /* create a triangulated cube with 12 triangles and 8 vertices */
    const mesh = RTC.newGeometry (device_i, embree.RTC_GEOMETRY_TYPE_TRIANGLE);
    
    /* set vertices */
    const vertices_p = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, 8);
    const vertices_a = embree.wrapTypedArray(vertices_p, 8*4, Float32Array);
    vertices_a.fill(0);
    const vertices = wrapArrayAsVertex(vertices_a); 
    vertices[0].x = pos.x + -1; vertices[0].y = pos.y + -1; vertices[0].z = pos.z + -1; 
    vertices[1].x = pos.x + -1; vertices[1].y = pos.y + -1; vertices[1].z = pos.z + +1; 
    vertices[2].x = pos.x + -1; vertices[2].y = pos.y + +1; vertices[2].z = pos.z + -1; 
    vertices[3].x = pos.x + -1; vertices[3].y = pos.y + +1; vertices[3].z = pos.z + +1; 
    vertices[4].x = pos.x + +1; vertices[4].y = pos.y + -1; vertices[4].z = pos.z + -1; 
    vertices[5].x = pos.x + +1; vertices[5].y = pos.y + -1; vertices[5].z = pos.z + +1; 
    vertices[6].x = pos.x + +1; vertices[6].y = pos.y + +1; vertices[6].z = pos.z + -1; 
    vertices[7].x = pos.x + +1; vertices[7].y = pos.y + +1; vertices[7].z = pos.z + +1; 
    
    /* set triangles */
    let tri = 0;
    const triangles_p = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT3, SIZE_OF_TRIANGLE, 12);
    const triangles_a = embree.wrapTypedArray(triangles_p, 12 * 3, Uint32Array);
    const triangles = wrapArrayAsTriangle(triangles_a);
    
    // left side
    triangles[tri].v0 = 0; triangles[tri].v1 = 2; triangles[tri].v2 = 1; tri++;
    triangles[tri].v0 = 1; triangles[tri].v1 = 2; triangles[tri].v2 = 3; tri++;
    
    // right side
    triangles[tri].v0 = 4; triangles[tri].v1 = 5; triangles[tri].v2 = 6; tri++;
    triangles[tri].v0 = 5; triangles[tri].v1 = 7; triangles[tri].v2 = 6; tri++;
    
    // bottom side
    triangles[tri].v0 = 0; triangles[tri].v1 = 1; triangles[tri].v2 = 4; tri++;
    triangles[tri].v0 = 1; triangles[tri].v1 = 5; triangles[tri].v2 = 4; tri++;
    
    // top side
    triangles[tri].v0 = 2; triangles[tri].v1 = 6; triangles[tri].v2 = 3; tri++;
    triangles[tri].v0 = 3; triangles[tri].v1 = 6; triangles[tri].v2 = 7; tri++;
    
    // front side
    triangles[tri].v0 = 0; triangles[tri].v1 = 4; triangles[tri].v2 = 2; tri++;
    triangles[tri].v0 = 2; triangles[tri].v1 = 4; triangles[tri].v2 = 6; tri++;
    
    // back side
    triangles[tri].v0 = 1; triangles[tri].v1 = 3; triangles[tri].v2 = 5; tri++;
    triangles[tri].v0 = 3; triangles[tri].v1 = 7; triangles[tri].v2 = 5; tri++;

    RTC.commitGeometry(mesh);
    const geomID = RTC.attachGeometry(scene_i,mesh);
    RTC.releaseGeometry(mesh);
    return geomID;
  }

    /* adds a ground plane to the scene */
    addGroundPlane (device_i: Embree.Device, scene_i: Embree.Scene)
    {
      /* create a triangulated plane with 2 triangles and 4 vertices */
      const mesh = RTC.newGeometry (device_i, embree.RTC_GEOMETRY_TYPE_TRIANGLE);
      
      /* set vertices */
      const vertices_p = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT3, SIZE_OF_VERTEX, 4);
      const vertices_a = embree.wrapTypedArray(vertices_p, 4*4, Float32Array);
      vertices_a.fill(0);
      const vertices = wrapArrayAsVertex(vertices_a); 
      vertices[0].x = -10; vertices[0].y = -2; vertices[0].z = -10; 
      vertices[1].x = -10; vertices[1].y = -2; vertices[1].z = +10; 
      vertices[2].x = +10; vertices[2].y = -2; vertices[2].z = -10; 
      vertices[3].x = +10; vertices[3].y = -2; vertices[3].z = +10;
      
      /* set triangles */
      const triangles_p = RTC.setNewGeometryBuffer(mesh, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT3, SIZE_OF_TRIANGLE, 2);
      const triangles_a = embree.wrapTypedArray(triangles_p, 6, Uint32Array);
      const triangles = wrapArrayAsTriangle(triangles_a);
      triangles[0].v0 = 0; triangles[0].v1 = 2; triangles[0].v2 = 1;
      triangles[1].v0 = 1; triangles[1].v1 = 2; triangles[1].v2 = 3;
  
      RTC.commitGeometry(mesh);
      const geomID = RTC.attachGeometry(scene_i,mesh);
      RTC.releaseGeometry(mesh);
      return geomID;
    }

  /* adds a hair to the scene */
  addHair(device_i: Embree.Device, scene_i: Embree.Scene)
  {
    const geom =  RTC.newGeometry(device_i, embree.RTC_GEOMETRY_TYPE_ROUND_BEZIER_CURVE);

    const pos_p = RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_VERTEX, 0, embree.RTC_FORMAT_FLOAT4, SIZE_OF_VERTEX, 4);
    const pos_a = embree.wrapTypedArray(pos_p, 4*4, Float32Array);
    const pos = wrapArrayAsVertex(pos_a);
    vec4.set(pos[0].vec4, 0.0,0.0,0.0,0.1);
    vec4.set(pos[1].vec4, 0.0,1.0,0.0,0.1);
    vec4.set(pos[2].vec4, 0.0,2.0,0.0,0.1);
    vec4.set(pos[3].vec4, 0.0,3.0,0.0,0.1);

    const index = embree.wrapTypedArray(RTC.setNewGeometryBuffer(geom, embree.RTC_BUFFER_TYPE_INDEX, 0, embree.RTC_FORMAT_UINT, 4, 1), 1, Uint32Array);
    index[0] = 0;

    RTC.commitGeometry(geom);
    const geomID = RTC.attachGeometry(scene_i,geom);
    RTC.releaseGeometry(geom);
    return geomID;
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


  /* prints the triangle BVH of a scene */
  print_bvh(scene: Embree.Scene) {

    let bvh4: Embree.BVH4 | null = null;
    /* if the scene contains only triangles, the BVH4 acceleration structure can be obtained this way */
    const accel = embree.castObject(scene, embree.Accel).intersectors.get_ptr();
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
    this.print_bvh4_triangle4v(bvh4.root,0);
  }

  main() {
    const device = RTC.newDevice('tri_accel=bvh4.triangle4v,verbose=0,threads=1,tessellation_cache_size=0');

    const scene = RTC.newScene(device);

    this.addCube(device,scene,[-1,0,0]);
    this.addCube(device,scene,[1,0,0]);
    this.addCube(device,scene,[0,0,-1]);
    this.addCube(device,scene,[0,0,1]);
    this.addHair(device,scene);
    this.addGroundPlane(device,scene);
    RTC.commitScene(scene);

    this.print_bvh(scene);

    RTC.releaseScene(scene);
    RTC.releaseDevice(device);
  }
}