import { Camera } from "./camera";
import shaderSource from "./shader.wgsl?raw";

type Point = [number, number];

type Curve = {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
  color: [number, number, number];
  thickness: number;
};

export class BezierRenderer extends EventTarget {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  context: GPUCanvasContext;
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  vertexBuffer: GPUBuffer;
  instanceBuffer: GPUBuffer;
  private _segmentCount: number;
  curveCount: number;
  vertexCount: number;
  isCubic: boolean = true;
  // Camera state
  zoom = 0.1;
  panX = 0;
  panY = 0;

  // Mouse state
  isDragging = false;
  lastMouseX = 0;
  lastMouseY = 0;
  curves: Array<Curve> = [];
  lastTime: number;
  triangles: number = 0;

  camera: Camera;

  constructor() {
    super();
    this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    this.camera = new Camera(this.canvas);

    // Tessellation parameters
    this._segmentCount = 42;
    this.curveCount = 500; // More reasonable count for artistic curves
  }

  getAspectRatio() {
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }

  get segmentCount(): number {
    return this._segmentCount;
  }

  set segmentCount(value: number) {
    this._segmentCount = value;
    this.updateBuffersForSegmentCount();
    this.updateUniforms();
  }

  async initialize() {
    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter!.requestDevice();

    this.context = this.canvas.getContext("webgpu")!;
    this.context.configure({
      device: this.device,
      format: "bgra8unorm",
      alphaMode: "premultiplied",
    });

    await this.createPipeline();
    this.createBuffers();
    this.generateCurves();
    this.startRenderLoop();
  }

  async createPipeline() {
    const shaderModule = this.device.createShaderModule({
      code: shaderSource,
    });

    // Create uniform buffer (now includes segment count)
    this.uniformBuffer = this.device.createBuffer({
      size: 64, // mat3x3 + vec2 + segmentCount + padding = 64 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 4, // u32 vertexIndex
            attributes: [{ shaderLocation: 0, offset: 0, format: "uint32" }],
          },
          {
            arrayStride: 48, // 4*vec2 + vec3 + float = 8+8+8+8+12+4 = 48 bytes
            stepMode: "instance",
            attributes: [
              { shaderLocation: 1, offset: 0, format: "float32x2" }, // p0: 8 bytes
              { shaderLocation: 2, offset: 8, format: "float32x2" }, // p1: 8 bytes
              { shaderLocation: 3, offset: 16, format: "float32x2" }, // p2: 8 bytes
              { shaderLocation: 4, offset: 24, format: "float32x2" }, // p3: 8 bytes
              { shaderLocation: 5, offset: 32, format: "float32x3" }, // color: 12 bytes
              { shaderLocation: 6, offset: 44, format: "float32" }, // thickness: 4 bytes
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: "bgra8unorm",
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
      multisample: {
        count: 1,
      },
    });
  }

  createBuffers() {
    // Create vertex buffer with indices for GPU tessellation
    const verticesPerSegment = 6; // 2 triangles per segment
    const totalVertices = this._segmentCount * verticesPerSegment;
    const vertices = new Uint32Array(totalVertices);

    for (let i = 0; i < totalVertices; i++) {
      vertices[i] = i;
    }

    this.vertexBuffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Uint32Array(this.vertexBuffer.getMappedRange()).set(vertices);
    this.vertexBuffer.unmap();

    this.vertexCount = totalVertices;
  }

  updateBuffersForSegmentCount() {
    if (this.vertexBuffer) {
      this.vertexBuffer.destroy();
    }
    this.createBuffers();
  }

  generateCurves() {
    this.curves = [];
    const width = this.canvas.width * Math.sqrt(this.curveCount / 4);
    const height = this.canvas.height * Math.sqrt(this.curveCount / 4);

    for (let i = 0; i < this.curveCount; i++) {
      // Create longer, more flowing curves that span more of the screen
      const startSide = Math.random();
      let p0: Point, p1: Point, p2: Point, p3: Point;

      if (this.isCubic) {
        // Cubic Bezier curves with 4 control points
        if (startSide < 0.25) {
          // Start from left edge, flow across screen
          p0 = [0, Math.random() * height];
          p1 = [width * (0.2 + Math.random() * 0.3), Math.random() * height];
          p2 = [width * (0.5 + Math.random() * 0.3), Math.random() * height];
          p3 = [width * (0.8 + Math.random() * 0.2), Math.random() * height];
        } else if (startSide < 0.5) {
          // Start from right edge, flow across screen
          p0 = [width, Math.random() * height];
          p1 = [width * (0.5 + Math.random() * 0.3), Math.random() * height];
          p2 = [width * (0.2 + Math.random() * 0.3), Math.random() * height];
          p3 = [width * (0.0 + Math.random() * 0.2), Math.random() * height];
        } else if (startSide < 0.75) {
          // Start from top edge, flow down
          p0 = [Math.random() * width, 0];
          p1 = [Math.random() * width, height * (0.2 + Math.random() * 0.3)];
          p2 = [Math.random() * width, height * (0.5 + Math.random() * 0.3)];
          p3 = [Math.random() * width, height * (0.8 + Math.random() * 0.2)];
        } else {
          // Start from bottom edge, flow up
          p0 = [Math.random() * width, height];
          p1 = [Math.random() * width, height * (0.5 + Math.random() * 0.3)];
          p2 = [Math.random() * width, height * (0.2 + Math.random() * 0.3)];
          p3 = [Math.random() * width, height * (0.0 + Math.random() * 0.2)];
        }
      } else {
        // Quadratic Bezier curves with 3 control points (p3 = p2 for compatibility)
        if (startSide < 0.25) {
          // Start from left edge, flow across screen
          p0 = [0, Math.random() * height];
          p1 = [width * (0.3 + Math.random() * 0.4), Math.random() * height];
          p2 = [width * (0.7 + Math.random() * 0.3), Math.random() * height];
          p3 = p2; // For quadratic, p3 = p2
        } else if (startSide < 0.5) {
          // Start from right edge, flow across screen
          p0 = [width, Math.random() * height];
          p1 = [width * (0.3 + Math.random() * 0.4), Math.random() * height];
          p2 = [width * (0.0 + Math.random() * 0.3), Math.random() * height];
          p3 = p2; // For quadratic, p3 = p2
        } else if (startSide < 0.75) {
          // Start from top edge, flow down
          p0 = [Math.random() * width, 0];
          p1 = [Math.random() * width, height * (0.3 + Math.random() * 0.4)];
          p2 = [Math.random() * width, height * (0.7 + Math.random() * 0.3)];
          p3 = p2; // For quadratic, p3 = p2
        } else {
          // Start from bottom edge, flow up
          p0 = [Math.random() * width, height];
          p1 = [Math.random() * width, height * (0.3 + Math.random() * 0.4)];
          p2 = [Math.random() * width, height * (0.0 + Math.random() * 0.3)];
          p3 = p2; // For quadratic, p3 = p2
        }
      }

      const curve: Curve = {
        p0: p0,
        p1: p1,
        p2: p2,
        p3: p3,
        color: [
          Math.random() * 0.6 + 0.4, // Brighter colors
          Math.random() * 0.6 + 0.4,
          Math.random() * 0.6 + 0.4,
        ],
        thickness: Math.random() * 6 + 2, // Slightly thinner for elegance
      };
      this.curves.push(curve);
    }

    this.updateInstanceBuffer();
  }

  updateInstanceBuffer() {
    if (this.instanceBuffer) {
      this.instanceBuffer.destroy();
    }

    // Pack data: p0(8) + p1(8) + p2(8) + p3(8) + color(12) + thickness(4) = 48 bytes per instance
    const instanceData = new Float32Array(this.curves.length * 12);
    for (let i = 0; i < this.curves.length; i++) {
      const curve = this.curves[i];
      const offset = i * 12;

      instanceData[offset] = curve.p0[0]; // p0.x
      instanceData[offset + 1] = curve.p0[1]; // p0.y
      instanceData[offset + 2] = curve.p1[0]; // p1.x
      instanceData[offset + 3] = curve.p1[1]; // p1.y
      instanceData[offset + 4] = curve.p2[0]; // p2.x
      instanceData[offset + 5] = curve.p2[1]; // p2.y
      instanceData[offset + 6] = curve.p3[0]; // p3.x
      instanceData[offset + 7] = curve.p3[1]; // p3.y
      instanceData[offset + 8] = curve.color[0]; // color.r
      instanceData[offset + 9] = curve.color[1]; // color.g
      instanceData[offset + 10] = curve.color[2]; // color.b
      instanceData[offset + 11] = curve.thickness; // thickness
    }

    this.instanceBuffer = this.device.createBuffer({
      size: instanceData.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.instanceBuffer.getMappedRange()).set(instanceData);
    this.instanceBuffer.unmap();
  }

  updateUniforms() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    const viewport = this.camera.getViewProjMatrix(this.getAspectRatio());

    // Create properly padded uniform data
    const uniforms = new Float32Array(16);

    // mat3x3 viewMatrix
    uniforms[0] = viewport[0];
    uniforms[1] = 0;
    uniforms[2] = 0;
    uniforms[3] = 0;
    uniforms[4] = 0;
    uniforms[5] = -viewport[5];
    uniforms[6] = 0;
    uniforms[7] = 0;
    uniforms[8] = viewport[12];
    uniforms[9] = viewport[13];
    uniforms[10] = 1;
    uniforms[11] = 0;

    // vec2 resolution + segmentCount + padding
    uniforms[12] = width;
    uniforms[13] = height;
    uniforms[14] = this._segmentCount;
    uniforms[15] = 0; // padding

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);
  }

  render() {
    this.dispatchEvent(new Event("beforeRender"));
    this.updateUniforms();

    const commandEncoder = this.device.createCommandEncoder();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.1, g: 0.1, b: 0.15, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.setVertexBuffer(1, this.instanceBuffer);
    renderPass.draw(this.vertexCount, this.curves.length);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
    this.dispatchEvent(new Event("afterRender"));
  }

  startRenderLoop() {
    const renderFrame = () => {
      this.render();
      requestAnimationFrame(renderFrame);
    };
    renderFrame();
  }
}
