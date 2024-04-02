/*
  BVH Traversal Shader based on:
  * https://github.com/erichlof/THREE.js-PathTracing-Renderer/
  * https://github.com/jbikker/bvh_article/
  * https://github.com/embree/embree/blob/master/kernels/bvh/bvh_intersector1.cpp
*/

import * as twgl from 'twgl.js'
import vs from './shader/vertex.glsl.vs?raw'
import fs from './shader/fragment.glsl.fs?raw';

import * as JsShader from './shader/fragment_alg'; 
import { vec4 } from 'gl-matrix';

type SamplerKey = 'uTrianglesSampler'|'uBVHSampler'|'uRayOrigSampler'|'uRayDirSampler'

type Uniforms = {
  [key in SamplerKey]: WebGLTexture;
} & {
  u_rootID: number;
  uOcclude: boolean;
}

export class GpuDevice {

  gl: WebGL2RenderingContext;
  programInfo: twgl.ProgramInfo;
  bufferInfo: twgl.BufferInfo;
  frameBufferInfo: twgl.FramebufferInfo;

  textures: Record<SamplerKey, WebGLTexture>;
  uniforms: Uniforms;

  trianglesBuffer: Float32Array;
  bvhBuffer: Float32Array;
  raysOrigBuffer: Float32Array;
  raysDirBuffer: Float32Array;

  floatFormatRay: twgl.TextureOptions;
  floatFormatData: twgl.TextureOptions;

  constructor(private size: number, canvas: HTMLCanvasElement, dataSize: number) {
    canvas.width = size;
    canvas.height = size;
    const gl = this.gl = canvas.getContext('webgl2')!;

    const ext = gl.getExtension("EXT_color_buffer_float");
    if (!ext) {
      throw new Error("need EXT_color_buffer_float");
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const programInfo = this.programInfo = twgl.createProgramInfo(gl, [vs, fs]);

    const arrays = {
      a_position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    };
    const bufferInfo = this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    const floatFormatRay = this.floatFormatRay = { format: gl.RGBA, internalFormat: gl.RGBA32F, type: gl.FLOAT, min: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE, width: size, height: size};
    const floatFormatData = this.floatFormatData = { format: gl.RGBA, internalFormat: gl.RGBA32F, type: gl.FLOAT, min: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE, width: dataSize, height: dataSize};

    this.trianglesBuffer = new Float32Array(dataSize * dataSize * 4);
    this.bvhBuffer = new Float32Array(dataSize * dataSize * 4);
    this.raysOrigBuffer = new Float32Array(size * size * 4);
    this.raysDirBuffer = new Float32Array(size * size * 4);

    this.textures = twgl.createTextures(gl, {
      uTrianglesSampler: { ... floatFormatData, src: this.trianglesBuffer },
      uBVHSampler: { ... floatFormatData, src: this.bvhBuffer },
      uRayOrigSampler: { ... floatFormatRay, src: this.raysOrigBuffer },
      uRayDirSampler: { ... floatFormatRay, src: this.raysDirBuffer }
    }) as Record<SamplerKey, WebGLTexture>;

    const uniforms = this.uniforms = {
      ... this.textures,
      u_rootID: 0,
      uOcclude: false
    }
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);

    const attachments = [
      floatFormatRay,
      floatFormatRay,
    ];
    this.frameBufferInfo = twgl.createFramebufferInfo(gl, attachments, size, size);
    
  }

  setTriangleBuffer() {
    twgl.setTextureFromArray(this.gl, this.textures.uTrianglesSampler, this.trianglesBuffer, this.floatFormatData)
  }

  setBVHBuffer() {
    twgl.setTextureFromArray(this.gl, this.textures.uBVHSampler, this.bvhBuffer, this.floatFormatData)
    
  }
  setRayBuffer() {
    twgl.setTextureFromArray(this.gl, this.textures.uRayOrigSampler, this.raysOrigBuffer, {flipY: 0, ... this.floatFormatRay})
    twgl.setTextureFromArray(this.gl, this.textures.uRayDirSampler, this.raysDirBuffer, {flipY: 0, ... this.floatFormatRay})

  }
  intersect(): void {
    this.uniforms.uOcclude = false;
    twgl.setUniforms(this.programInfo, this.uniforms);
    twgl.drawBufferInfo(this.gl, this.bufferInfo);
  }
  occlude(): void {
    this.uniforms.uOcclude = true;
    twgl.setUniforms(this.programInfo, this.uniforms);
    twgl.drawBufferInfo(this.gl, this.bufferInfo);
  }

  computeJS(canvas: HTMLCanvasElement): void {
    const setSampler = (s: JsShader.sampler2D, buffer: Float32Array) => {
      s.width = this.size;
      s.height = this.size;
      s.data = buffer;
    }

    setSampler(JsShader.uTrianglesSampler, this.trianglesBuffer);
    setSampler(JsShader.uBVHSampler, this.bvhBuffer);
    setSampler(JsShader.uRayOrigSampler, this.raysOrigBuffer);
    setSampler(JsShader.uRayDirSampler, this.raysDirBuffer);

    canvas.width = this.size;
    canvas.height = this.size;
    const ctx = canvas.getContext('2d')!;
    const pix = ctx.getImageData(0,0, this.size, this.size);

    const gl_FragCoord = JsShader.gl_FragCoord;
    const out_color = JsShader.out_color;

    let pix_idx = 0;
    const pix_vec4 = new Float32Array(4);
    for(let y=0;y<canvas.height;y++)
    for(let x=0;x<canvas.width;x++) {
      gl_FragCoord.x = x;
      gl_FragCoord.y = y;

      JsShader.main();

      vec4.scale(pix_vec4, out_color, 255);
      pix.data.set(pix_vec4, pix_idx);
      pix_idx += 4;
    }

    ctx.putImageData(pix, 0,0)
  }

  readBuffer(buffers: Float32Array[]): void {
    this.gl.readBuffer(this.gl.COLOR_ATTACHMENT0);
    this.gl.readPixels(0, 0, this.size, this.size, this.gl.RGBA, this.gl.FLOAT, buffers[0]);
    this.gl.readBuffer(this.gl.COLOR_ATTACHMENT1);
    this.gl.readPixels(0, 0, this.size, this.size, this.gl.RGBA, this.gl.FLOAT, buffers[1]);
  }
}
