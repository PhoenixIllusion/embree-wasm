import * as twgl from 'twgl.js'
import vs from './shader/vertex.glsl?raw'
import fs from './shader/fragment.glsl?raw';

import * as JsShader from './shader/fragment_alg'; 
import { vec4 } from 'gl-matrix';

type SamplerKey = 'uTrianglesSampler'|'uBVHSampler'|'uRayOrigSampler'|'uRayDirSampler'

export class GpuDevice {

  gl: WebGL2RenderingContext;
  programInfo: twgl.ProgramInfo;
  bufferInfo: twgl.BufferInfo;
  frameBufferInfo: twgl.FramebufferInfo;

  textures: Record<SamplerKey, WebGLTexture>;

  trianglesBuffer: Float32Array;
  bvhBuffer: Float32Array;
  raysOrigBuffer: Float32Array;
  raysDirBuffer: Float32Array;

  floatFormat: twgl.TextureOptions;

  constructor(private size: number, private canvas: HTMLCanvasElement) {
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
    const floatFormat = this.floatFormat = { format: gl.RGBA, internalFormat: gl.RGBA32F, type: gl.FLOAT, min: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE, width: size, height: size};

    this.trianglesBuffer = new Float32Array(size * size * 4);
    this.bvhBuffer = new Float32Array(size * size * 4);
    this.raysOrigBuffer = new Float32Array(size * size * 4);
    this.raysDirBuffer = new Float32Array(size * size * 4);

    this.textures = twgl.createTextures(gl, {
      uTrianglesSampler: { ... floatFormat, src: this.trianglesBuffer },
      uBVHSampler: { ... floatFormat, src: this.bvhBuffer },
      uRayOrigSampler: { ... floatFormat, src: this.raysOrigBuffer },
      uRayDirSampler: { ... floatFormat, src: this.raysDirBuffer }
    }) as Record<SamplerKey, WebGLTexture>;

    const uniforms = {
      ... this.textures,
      u_rootID: 0
    }
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);

    const attachments = [
      floatFormat,
      floatFormat,
    ];
    //this.frameBufferInfo = twgl.createFramebufferInfo(gl, attachments, size, size);
    
  }

  setTriangleBuffer(buffer: Float32Array) {
    this.trianglesBuffer.set(buffer);
    twgl.setTextureFromArray(this.gl, this.textures.uTrianglesSampler, this.trianglesBuffer, this.floatFormat)
  }

  setBVHBuffer(buffer: Float32Array) {
    this.bvhBuffer.set(buffer);
    twgl.setTextureFromArray(this.gl, this.textures.uBVHSampler, this.bvhBuffer, this.floatFormat)
    
  }
  setRayBuffer(orig: Float32Array, dir: Float32Array) {
    this.raysOrigBuffer.set(orig);
    twgl.setTextureFromArray(this.gl, this.textures.uRayOrigSampler, this.raysOrigBuffer, {flipY: 1, ... this.floatFormat})
    this.raysDirBuffer.set(dir);
    twgl.setTextureFromArray(this.gl, this.textures.uRayDirSampler, this.raysDirBuffer, {flipY: 1, ... this.floatFormat})

  }
  compute(): void {
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
