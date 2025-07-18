(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&r(a)}).observe(document,{childList:!0,subtree:!0});function t(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(n){if(n.ep)return;n.ep=!0;const i=t(n);fetch(n.href,i)}})();const l=`struct VertexInput {
  @location(0) vertexIndex: u32,
}

struct InstanceInput {
    @location(1) p0: vec2<f32>,
    @location(2) p1: vec2<f32>,
    @location(3) p2: vec2<f32>,
    @location(4) color: vec3<f32>,
    @location(5) thickness: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) worldPos: vec2<f32>,
    @location(1) color: vec3<f32>,
    @location(2) distanceFromCenter: f32,
    @location(3) thickness: f32,
}

struct Uniforms {
    viewMatrix: mat3x3<f32>,
    resolution: vec2<f32>,
    segmentCount: f32,
    _padding: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn evaluateBezier(t: f32, p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>) -> vec2<f32> {
    let oneMinusT = 1.0 - t;
    return oneMinusT * oneMinusT * p0 + 2.0 * oneMinusT * t * p1 + t * t * p2;
}

fn evaluateBezierDerivative(t: f32, p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>) -> vec2<f32> {
    return 2.0 * (1.0 - t) * (p1 - p0) + 2.0 * t * (p2 - p1);
}

@vertex
fn vs_main(vertex: VertexInput, instance: InstanceInput) -> VertexOutput {
    var output: VertexOutput;

    let segmentCount = u32(uniforms.segmentCount);
    let verticesPerSegment = 6u; // 2 triangles per segment

    // Decode vertex index to get segment and vertex within segment
    let segmentIndex = vertex.vertexIndex / verticesPerSegment;
    let vertexInSegment = vertex.vertexIndex % verticesPerSegment;

    // Calculate t parameters for this segment
    let t0 = f32(segmentIndex) / f32(segmentCount);
    let t1 = f32(segmentIndex + 1u) / f32(segmentCount);

    // Get the two points for this segment
    let p0 = evaluateBezier(t0, instance.p0, instance.p1, instance.p2);
    let p1 = evaluateBezier(t1, instance.p0, instance.p1, instance.p2);

    // Get derivatives for normals
    let deriv0 = evaluateBezierDerivative(t0, instance.p0, instance.p1, instance.p2);
    let deriv1 = evaluateBezierDerivative(t1, instance.p0, instance.p1, instance.p2);

    // Calculate normals (perpendicular to tangent)
    var normal0 = vec2<f32>(-deriv0.y, deriv0.x);
    var normal1 = vec2<f32>(-deriv1.y, deriv1.x);

    // Normalize (with safety check)
    if (length(normal0) > 0.001) {
        normal0 = normalize(normal0);
    } else {
        normal0 = vec2<f32>(0.0, 1.0);
    }
    if (length(normal1) > 0.001) {
        normal1 = normalize(normal1);
    } else {
        normal1 = vec2<f32>(0.0, 1.0);
    }

    let halfThickness = instance.thickness * 0.5;

    // Create quad for this segment
    // Vertices: 0=p0_left, 1=p0_right, 2=p1_left, 3=p1_right
    // Triangle 1: [0,1,2] = [p0_left, p0_right, p1_left]
    // Triangle 2: [1,3,2] = [p0_right, p1_right, p1_left]
    var worldPos: vec2<f32>;
    var distFromCenter: f32 = halfThickness;

    switch vertexInSegment {
        case 0u: { // Triangle 1, vertex 0: p0_left
            worldPos = p0 - normal0 * halfThickness;
        }
        case 1u: { // Triangle 1, vertex 1: p0_right
            worldPos = p0 + normal0 * halfThickness;
        }
        case 2u: { // Triangle 1, vertex 2: p1_left
            worldPos = p1 - normal1 * halfThickness;
        }
        case 3u: { // Triangle 2, vertex 0: p0_right (same as vertex 1)
            worldPos = p0 + normal0 * halfThickness;
        }
        case 4u: { // Triangle 2, vertex 1: p1_right
            worldPos = p1 + normal1 * halfThickness;
        }
        case 5u: { // Triangle 2, vertex 2: p1_left (same as vertex 2)
            worldPos = p1 - normal1 * halfThickness;
        }
        default: {
            worldPos = p0;
        }
    }

    // Apply view transformation
    let transformedPos = uniforms.viewMatrix * vec3<f32>(worldPos, 1.0);

    output.position = vec4<f32>(transformedPos.xy, 0.0, 1.0);
    output.worldPos = worldPos;
    output.color = instance.color;
    output.distanceFromCenter = distFromCenter;
    output.thickness = instance.thickness;

    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let halfThickness = input.thickness * 0.5;

    // Smooth antialiasing at edges
    let alpha = 1.0 - smoothstep(halfThickness - 1.0, halfThickness + 0.5, input.distanceFromCenter);

    if (alpha <= 0.0) {
        discard;
    }

    return vec4<f32>(input.color, alpha);
}
`;class h{constructor(){this.zoom=.1,this.panX=0,this.panY=0,this.isDragging=!1,this.lastMouseX=0,this.lastMouseY=0,this.curves=[],this.canvas=document.getElementById("canvas"),this.segmentCount=42,this.curveCount=500,this.frameCount=0,this.lastTime=performance.now(),this.setupEventListeners()}async initialize(){const e=await navigator.gpu.requestAdapter();this.device=await e.requestDevice(),this.context=this.canvas.getContext("webgpu"),this.context.configure({device:this.device,format:"bgra8unorm",alphaMode:"premultiplied"}),await this.createPipeline(),this.createBuffers(),this.generateCurves(),this.startRenderLoop()}async createPipeline(){const e=this.device.createShaderModule({code:l});this.uniformBuffer=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const t=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]});this.bindGroup=this.device.createBindGroup({layout:t,entries:[{binding:0,resource:{buffer:this.uniformBuffer}}]});const r=this.device.createPipelineLayout({bindGroupLayouts:[t]});this.pipeline=this.device.createRenderPipeline({layout:r,vertex:{module:e,entryPoint:"vs_main",buffers:[{arrayStride:4,attributes:[{shaderLocation:0,offset:0,format:"uint32"}]},{arrayStride:40,stepMode:"instance",attributes:[{shaderLocation:1,offset:0,format:"float32x2"},{shaderLocation:2,offset:8,format:"float32x2"},{shaderLocation:3,offset:16,format:"float32x2"},{shaderLocation:4,offset:24,format:"float32x3"},{shaderLocation:5,offset:36,format:"float32"}]}]},fragment:{module:e,entryPoint:"fs_main",targets:[{format:"bgra8unorm",blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-list"},multisample:{count:1}})}createBuffers(){const t=this.segmentCount*6,r=new Uint32Array(t);for(let n=0;n<t;n++)r[n]=n;this.vertexBuffer=this.device.createBuffer({size:r.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Uint32Array(this.vertexBuffer.getMappedRange()).set(r),this.vertexBuffer.unmap(),this.vertexCount=t}updateBuffersForSegmentCount(){this.vertexBuffer&&this.vertexBuffer.destroy(),this.createBuffers()}generateCurves(){this.curves=[];const e=this.canvas.width,t=this.canvas.height;for(let r=0;r<this.curveCount;r++){const n=Math.random();let i,a,s;n<.25?(i=[0,Math.random()*t],a=[e*(.3+Math.random()*.4),Math.random()*t],s=[e*(.7+Math.random()*.3),Math.random()*t]):n<.5?(i=[e,Math.random()*t],a=[e*(.3+Math.random()*.4),Math.random()*t],s=[e*(0+Math.random()*.3),Math.random()*t]):n<.75?(i=[Math.random()*e,0],a=[Math.random()*e,t*(.3+Math.random()*.4)],s=[Math.random()*e,t*(.7+Math.random()*.3)]):(i=[Math.random()*e,t],a=[Math.random()*e,t*(.3+Math.random()*.4)],s=[Math.random()*e,t*(0+Math.random()*.3)]);const u={p0:i,p1:a,p2:s,color:[Math.random()*.6+.4,Math.random()*.6+.4,Math.random()*.6+.4],thickness:Math.random()*6+2};this.curves.push(u)}this.updateInstanceBuffer()}updateInstanceBuffer(){this.instanceBuffer&&this.instanceBuffer.destroy();const e=new Float32Array(this.curves.length*10);for(let t=0;t<this.curves.length;t++){const r=this.curves[t],n=t*10;e[n]=r.p0[0],e[n+1]=r.p0[1],e[n+2]=r.p1[0],e[n+3]=r.p1[1],e[n+4]=r.p2[0],e[n+5]=r.p2[1],e[n+6]=r.color[0],e[n+7]=r.color[1],e[n+8]=r.color[2],e[n+9]=r.thickness}this.instanceBuffer=this.device.createBuffer({size:e.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Float32Array(this.instanceBuffer.getMappedRange()).set(e),this.instanceBuffer.unmap()}updateUniforms(){const e=this.canvas.width,t=this.canvas.height,r=2*this.zoom/e,n=-2*this.zoom/t,i=-1+2*this.panX*this.zoom/e,a=1+2*this.panY*this.zoom/t,s=new Float32Array(16);s[0]=r,s[1]=0,s[2]=0,s[3]=0,s[4]=0,s[5]=n,s[6]=0,s[7]=0,s[8]=i,s[9]=a,s[10]=1,s[11]=0,s[12]=e,s[13]=t,s[14]=this.segmentCount,s[15]=0,this.device.queue.writeBuffer(this.uniformBuffer,0,s)}render(){this.updateUniforms();const e=this.device.createCommandEncoder(),t=e.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:.1,g:.1,b:.15,a:1},loadOp:"clear",storeOp:"store"}]});t.setPipeline(this.pipeline),t.setBindGroup(0,this.bindGroup),t.setVertexBuffer(0,this.vertexBuffer),t.setVertexBuffer(1,this.instanceBuffer),t.draw(this.vertexCount,this.curves.length),t.end(),this.device.queue.submit([e.finish()])}setupEventListeners(){this.canvas.addEventListener("wheel",e=>{e.preventDefault();const t=e.deltaY>0?.9:1.1;this.zoom*=t,this.zoom=Math.max(.1,Math.min(10,this.zoom))}),this.canvas.addEventListener("mousedown",e=>{this.isDragging=!0,this.lastMouseX=e.clientX,this.lastMouseY=e.clientY}),this.canvas.addEventListener("mousemove",e=>{if(this.isDragging){const t=e.clientX-this.lastMouseX,r=e.clientY-this.lastMouseY;this.panX+=t/this.zoom,this.panY-=r/this.zoom,this.lastMouseX=e.clientX,this.lastMouseY=e.clientY}}),this.canvas.addEventListener("mouseup",()=>{this.isDragging=!1}),this.canvas.addEventListener("mouseleave",()=>{this.isDragging=!1}),this.canvas.addEventListener("contextmenu",e=>e.preventDefault())}updateFPS(){this.frameCount++;const e=performance.now();if(e-this.lastTime>=1e3){const t=Math.round(this.frameCount*1e3/(e-this.lastTime)),r=this.curveCount*this.segmentCount*2;document.getElementById("fps").textContent=`FPS: ${t}`,document.getElementById("curveInfo").textContent=`Curves: ${this.curveCount.toLocaleString()}`,document.getElementById("triangles").textContent=`Triangles: ${r.toLocaleString()}`,this.frameCount=0,this.lastTime=e}}startRenderLoop(){const e=()=>{this.render(),this.updateFPS(),requestAnimationFrame(e)};e()}setupControls(){document.getElementById("segmentSlider").addEventListener("input",e=>{this.segmentCount=parseInt(e.target.value);const t=this.curveCount*this.segmentCount*2;document.getElementById("segments").textContent=`Segments: ${this.segmentCount}`,document.getElementById("triangles").textContent=`Triangles: ${t.toLocaleString()}`,this.updateBuffersForSegmentCount()}),document.getElementById("curveCountSlider").addEventListener("input",e=>{this.curveCount=parseInt(e.target.value);const t=this.curveCount*this.segmentCount*2;document.getElementById("curveInfo").textContent=`Curves: ${this.curveCount.toLocaleString()}`,document.getElementById("triangles").textContent=`Triangles: ${t.toLocaleString()}`,this.generateCurves()})}}let o;window.regenerateCurves=function(){o&&o.generateCurves()};window.resetView=function(){o&&(o.zoom=1,o.panX=0,o.panY=0)};async function f(){try{o=new h,await o.initialize(),console.log("WebGPU GPU tessellation renderer initialized!")}catch(c){console.error("Failed to initialize WebGPU:",c),document.body.innerHTML=`<h1>WebGPU Error</h1><p>${c.message}</p>`}}f();
