(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function e(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=e(n);fetch(n.href,s)}})();class D extends EventTarget{constructor(t){super(),this.position={x:0,y:0},this.zoom=10,this.width=0,this.height=0,this.maxZoom=1e3,this.minZoom=.001,this.isDragging=!1,this.lastMouseX=0,this.lastMouseY=0,this.devicePixelRatio=window.devicePixelRatio||1,this.updateRect=()=>{this.rect=this.canvas.getBoundingClientRect(),this.updateCameraDimensions()},this.onMouseDown=e=>{this.isDragging=!0,this.setXY(e),this.canvas.style.cursor="grabbing"},this.onMouseMove=e=>{if(!this.isDragging){this.setXY(e);return}const{x:i,y:n}=this.getCanvasPosition(e),s=i-this.lastMouseX,o=n-this.lastMouseY;this.move(s,-o),this.setXY(e),this.dispatchEvent(new Event("update"))},this.onMouseUp=()=>{this.isDragging=!1,this.canvas.style.cursor="grab"},this.onWheel=e=>{e.preventDefault();const{x:i,y:n}=this.getCanvasPosition(e),s=1+e.deltaY*.01;this.zoomAroundPoint(s,i,n),this.dispatchEvent(new Event("update"))},this.canvas=t,this.width=t.clientWidth/this.devicePixelRatio,this.height=t.clientHeight/this.devicePixelRatio,this.position.x=this.width/2*this.zoom,this.position.y=-this.height/2*this.zoom,this.updateRect(),this.setupEventHandlers()}updateCameraDimensions(){this.width=this.canvas.width/this.devicePixelRatio,this.height=this.canvas.height/this.devicePixelRatio}setupEventHandlers(){this.canvas.addEventListener("mousedown",this.onMouseDown),this.canvas.addEventListener("mousemove",this.onMouseMove),this.canvas.addEventListener("mouseup",this.onMouseUp),this.canvas.addEventListener("mouseleave",this.onMouseUp),this.canvas.addEventListener("wheel",this.onWheel,{passive:!1})}setXY(t){const{x:e,y:i}=this.getCanvasPosition(t);this.lastMouseX=e,this.lastMouseY=i}getCanvasPosition(t){const e=this.rect;return{x:t.clientX-e.left,y:t.clientY-e.top}}zoomAroundPoint(t,e,i){const n=Math.max(this.minZoom,Math.min(this.maxZoom,this.zoom*t)),s=this.position.x+(e-this.width/2)*this.zoom,o=this.position.y-(i-this.height/2)*this.zoom,l=n/this.zoom;this.position.x=s-(s-this.position.x)*l,this.position.y=o-(o-this.position.y)*l,this.zoom=n}move(t,e){this.position.x-=t*this.zoom,this.position.y-=e*this.zoom}getScale(){return this.zoom*Math.min(this.width,this.height)/2}getViewProjMatrix(t){const e=this.getScale();return new Float32Array([1/(e*t),0,0,0,0,1/e,0,0,0,0,1,0,-this.position.x/(e*t),-this.position.y/e,0,1])}debugState(){console.log("Camera State:",{position:this.position,zoom:this.zoom,width:this.width,height:this.height})}destroy(){this.canvas.removeEventListener("mousedown",this.onMouseDown),this.canvas.removeEventListener("mousemove",this.onMouseMove),this.canvas.removeEventListener("mouseup",this.onMouseUp),this.canvas.removeEventListener("mouseleave",this.onMouseUp),this.canvas.removeEventListener("wheel",this.onWheel),window.removeEventListener("resize",this.updateRect)}}const z=`struct VertexInput {
  @location(0) vertexIndex: u32,
}

struct InstanceInput {
    @location(1) p0: vec2<f32>,
    @location(2) p1: vec2<f32>,
    @location(3) p2: vec2<f32>,
    @location(4) p3: vec2<f32>,
    @location(5) color: vec3<f32>,
    @location(6) thickness: f32,
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

fn evaluateBezier(t: f32, p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>, p3: vec2<f32>) -> vec2<f32> {
    let oneMinusT = 1.0 - t;
    let oneMinusT2 = oneMinusT * oneMinusT;
    let oneMinusT3 = oneMinusT2 * oneMinusT;
    let t2 = t * t;
    let t3 = t2 * t;
    return oneMinusT3 * p0 + 3.0 * oneMinusT2 * t * p1 + 3.0 * oneMinusT * t2 * p2 + t3 * p3;
}

fn evaluateBezierDerivative(t: f32, p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>, p3: vec2<f32>) -> vec2<f32> {
    let oneMinusT = 1.0 - t;
    let oneMinusT2 = oneMinusT * oneMinusT;
    let t2 = t * t;
    return 3.0 * oneMinusT2 * (p1 - p0) + 6.0 * oneMinusT * t * (p2 - p1) + 3.0 * t2 * (p3 - p2);
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
    let p0 = evaluateBezier(t0, instance.p0, instance.p1, instance.p2, instance.p3);
    let p1 = evaluateBezier(t1, instance.p0, instance.p1, instance.p2, instance.p3);

    // Get derivatives for normals
    let deriv0 = evaluateBezierDerivative(t0, instance.p0, instance.p1, instance.p2, instance.p3);
    let deriv1 = evaluateBezierDerivative(t1, instance.p0, instance.p1, instance.p2, instance.p3);

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
`;class V extends EventTarget{constructor(){super(),this.isCubic=!0,this.zoom=.1,this.panX=0,this.panY=0,this.isDragging=!1,this.lastMouseX=0,this.lastMouseY=0,this.curves=[],this.triangles=0,this.canvas=document.getElementById("canvas"),this.camera=new D(this.canvas),this._segmentCount=42,this.curveCount=500}getAspectRatio(){return this.canvas.clientWidth/this.canvas.clientHeight}get segmentCount(){return this._segmentCount}set segmentCount(t){this._segmentCount=t,this.updateBuffersForSegmentCount(),this.updateUniforms()}async initialize(){const t=await navigator.gpu.requestAdapter();this.device=await t.requestDevice(),this.context=this.canvas.getContext("webgpu"),this.context.configure({device:this.device,format:"bgra8unorm",alphaMode:"premultiplied"}),await this.createPipeline(),this.createBuffers(),this.generateCurves(),this.startRenderLoop()}async createPipeline(){const t=this.device.createShaderModule({code:z});this.uniformBuffer=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const e=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]});this.bindGroup=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBuffer}}]});const i=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.pipeline=this.device.createRenderPipeline({layout:i,vertex:{module:t,entryPoint:"vs_main",buffers:[{arrayStride:4,attributes:[{shaderLocation:0,offset:0,format:"uint32"}]},{arrayStride:48,stepMode:"instance",attributes:[{shaderLocation:1,offset:0,format:"float32x2"},{shaderLocation:2,offset:8,format:"float32x2"},{shaderLocation:3,offset:16,format:"float32x2"},{shaderLocation:4,offset:24,format:"float32x2"},{shaderLocation:5,offset:32,format:"float32x3"},{shaderLocation:6,offset:44,format:"float32"}]}]},fragment:{module:t,entryPoint:"fs_main",targets:[{format:"bgra8unorm",blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}}}]},primitive:{topology:"triangle-list"},multisample:{count:1}})}createBuffers(){const e=this._segmentCount*6,i=new Uint32Array(e);for(let n=0;n<e;n++)i[n]=n;this.vertexBuffer=this.device.createBuffer({size:i.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Uint32Array(this.vertexBuffer.getMappedRange()).set(i),this.vertexBuffer.unmap(),this.vertexCount=e}updateBuffersForSegmentCount(){this.vertexBuffer&&this.vertexBuffer.destroy(),this.createBuffers()}generateCurves(){this.curves=[];const t=this.canvas.width*Math.sqrt(this.curveCount/4),e=this.canvas.height*Math.sqrt(this.curveCount/4);for(let i=0;i<this.curveCount;i++){const n=Math.random();let s,o,l,u;this.isCubic?n<.25?(s=[0,Math.random()*e],o=[t*(.2+Math.random()*.3),Math.random()*e],l=[t*(.5+Math.random()*.3),Math.random()*e],u=[t*(.8+Math.random()*.2),Math.random()*e]):n<.5?(s=[t,Math.random()*e],o=[t*(.5+Math.random()*.3),Math.random()*e],l=[t*(.2+Math.random()*.3),Math.random()*e],u=[t*(0+Math.random()*.2),Math.random()*e]):n<.75?(s=[Math.random()*t,0],o=[Math.random()*t,e*(.2+Math.random()*.3)],l=[Math.random()*t,e*(.5+Math.random()*.3)],u=[Math.random()*t,e*(.8+Math.random()*.2)]):(s=[Math.random()*t,e],o=[Math.random()*t,e*(.5+Math.random()*.3)],l=[Math.random()*t,e*(.2+Math.random()*.3)],u=[Math.random()*t,e*(0+Math.random()*.2)]):n<.25?(s=[0,Math.random()*e],o=[t*(.3+Math.random()*.4),Math.random()*e],l=[t*(.7+Math.random()*.3),Math.random()*e],u=l):n<.5?(s=[t,Math.random()*e],o=[t*(.3+Math.random()*.4),Math.random()*e],l=[t*(0+Math.random()*.3),Math.random()*e],u=l):n<.75?(s=[Math.random()*t,0],o=[Math.random()*t,e*(.3+Math.random()*.4)],l=[Math.random()*t,e*(.7+Math.random()*.3)],u=l):(s=[Math.random()*t,e],o=[Math.random()*t,e*(.3+Math.random()*.4)],l=[Math.random()*t,e*(0+Math.random()*.3)],u=l);const c={p0:s,p1:o,p2:l,p3:u,color:[Math.random()*.6+.4,Math.random()*.6+.4,Math.random()*.6+.4],thickness:Math.random()*6+2};this.curves.push(c)}this.updateInstanceBuffer()}updateInstanceBuffer(){this.instanceBuffer&&this.instanceBuffer.destroy();const t=new Float32Array(this.curves.length*12);for(let e=0;e<this.curves.length;e++){const i=this.curves[e],n=e*12;t[n]=i.p0[0],t[n+1]=i.p0[1],t[n+2]=i.p1[0],t[n+3]=i.p1[1],t[n+4]=i.p2[0],t[n+5]=i.p2[1],t[n+6]=i.p3[0],t[n+7]=i.p3[1],t[n+8]=i.color[0],t[n+9]=i.color[1],t[n+10]=i.color[2],t[n+11]=i.thickness}this.instanceBuffer=this.device.createBuffer({size:t.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Float32Array(this.instanceBuffer.getMappedRange()).set(t),this.instanceBuffer.unmap()}updateUniforms(){const t=this.canvas.width,e=this.canvas.height,i=this.camera.getViewProjMatrix(this.getAspectRatio()),n=new Float32Array(16);n[0]=i[0],n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=-i[5],n[6]=0,n[7]=0,n[8]=i[12],n[9]=i[13],n[10]=1,n[11]=0,n[12]=t,n[13]=e,n[14]=this._segmentCount,n[15]=0,this.device.queue.writeBuffer(this.uniformBuffer,0,n)}render(){this.dispatchEvent(new Event("beforeRender")),this.updateUniforms();const t=this.device.createCommandEncoder(),e=t.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:.1,g:.1,b:.15,a:1},loadOp:"clear",storeOp:"store"}]});e.setPipeline(this.pipeline),e.setBindGroup(0,this.bindGroup),e.setVertexBuffer(0,this.vertexBuffer),e.setVertexBuffer(1,this.instanceBuffer),e.draw(this.vertexCount,this.curves.length),e.end(),this.device.queue.submit([t.finish()]),this.dispatchEvent(new Event("afterRender"))}startRenderLoop(){const t=()=>{this.render(),requestAnimationFrame(t)};t()}}/**
 * lil-gui
 * https://lil-gui.georgealways.com
 * @version 0.20.0
 * @author George Michael Brower
 * @license MIT
 */class x{constructor(t,e,i,n,s="div"){this.parent=t,this.object=e,this.property=i,this._disabled=!1,this._hidden=!1,this.initialValue=this.getValue(),this.domElement=document.createElement(s),this.domElement.classList.add("controller"),this.domElement.classList.add(n),this.$name=document.createElement("div"),this.$name.classList.add("name"),x.nextNameID=x.nextNameID||0,this.$name.id=`lil-gui-name-${++x.nextNameID}`,this.$widget=document.createElement("div"),this.$widget.classList.add("widget"),this.$disable=this.$widget,this.domElement.appendChild(this.$name),this.domElement.appendChild(this.$widget),this.domElement.addEventListener("keydown",o=>o.stopPropagation()),this.domElement.addEventListener("keyup",o=>o.stopPropagation()),this.parent.children.push(this),this.parent.controllers.push(this),this.parent.$children.appendChild(this.domElement),this._listenCallback=this._listenCallback.bind(this),this.name(i)}name(t){return this._name=t,this.$name.textContent=t,this}onChange(t){return this._onChange=t,this}_callOnChange(){this.parent._callOnChange(this),this._onChange!==void 0&&this._onChange.call(this,this.getValue()),this._changed=!0}onFinishChange(t){return this._onFinishChange=t,this}_callOnFinishChange(){this._changed&&(this.parent._callOnFinishChange(this),this._onFinishChange!==void 0&&this._onFinishChange.call(this,this.getValue())),this._changed=!1}reset(){return this.setValue(this.initialValue),this._callOnFinishChange(),this}enable(t=!0){return this.disable(!t)}disable(t=!0){return t===this._disabled?this:(this._disabled=t,this.domElement.classList.toggle("disabled",t),this.$disable.toggleAttribute("disabled",t),this)}show(t=!0){return this._hidden=!t,this.domElement.style.display=this._hidden?"none":"",this}hide(){return this.show(!1)}options(t){const e=this.parent.add(this.object,this.property,t);return e.name(this._name),this.destroy(),e}min(t){return this}max(t){return this}step(t){return this}decimals(t){return this}listen(t=!0){return this._listening=t,this._listenCallbackID!==void 0&&(cancelAnimationFrame(this._listenCallbackID),this._listenCallbackID=void 0),this._listening&&this._listenCallback(),this}_listenCallback(){this._listenCallbackID=requestAnimationFrame(this._listenCallback);const t=this.save();t!==this._listenPrevValue&&this.updateDisplay(),this._listenPrevValue=t}getValue(){return this.object[this.property]}setValue(t){return this.getValue()!==t&&(this.object[this.property]=t,this._callOnChange(),this.updateDisplay()),this}updateDisplay(){return this}load(t){return this.setValue(t),this._callOnFinishChange(),this}save(){return this.getValue()}destroy(){this.listen(!1),this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.controllers.splice(this.parent.controllers.indexOf(this),1),this.parent.$children.removeChild(this.domElement)}}class T extends x{constructor(t,e,i){super(t,e,i,"boolean","label"),this.$input=document.createElement("input"),this.$input.setAttribute("type","checkbox"),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$widget.appendChild(this.$input),this.$input.addEventListener("change",()=>{this.setValue(this.$input.checked),this._callOnFinishChange()}),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.checked=this.getValue(),this}}function k(r){let t,e;return(t=r.match(/(#|0x)?([a-f0-9]{6})/i))?e=t[2]:(t=r.match(/rgb\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\)/))?e=parseInt(t[1]).toString(16).padStart(2,0)+parseInt(t[2]).toString(16).padStart(2,0)+parseInt(t[3]).toString(16).padStart(2,0):(t=r.match(/^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i))&&(e=t[1]+t[1]+t[2]+t[2]+t[3]+t[3]),e?"#"+e:!1}const O={isPrimitive:!0,match:r=>typeof r=="string",fromHexString:k,toHexString:k},M={isPrimitive:!0,match:r=>typeof r=="number",fromHexString:r=>parseInt(r.substring(1),16),toHexString:r=>"#"+r.toString(16).padStart(6,0)},I={isPrimitive:!1,match:r=>Array.isArray(r),fromHexString(r,t,e=1){const i=M.fromHexString(r);t[0]=(i>>16&255)/255*e,t[1]=(i>>8&255)/255*e,t[2]=(i&255)/255*e},toHexString([r,t,e],i=1){i=255/i;const n=r*i<<16^t*i<<8^e*i<<0;return M.toHexString(n)}},R={isPrimitive:!1,match:r=>Object(r)===r,fromHexString(r,t,e=1){const i=M.fromHexString(r);t.r=(i>>16&255)/255*e,t.g=(i>>8&255)/255*e,t.b=(i&255)/255*e},toHexString({r,g:t,b:e},i=1){i=255/i;const n=r*i<<16^t*i<<8^e*i<<0;return M.toHexString(n)}},H=[O,M,I,R];function Y(r){return H.find(t=>t.match(r))}class G extends x{constructor(t,e,i,n){super(t,e,i,"color"),this.$input=document.createElement("input"),this.$input.setAttribute("type","color"),this.$input.setAttribute("tabindex",-1),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$text=document.createElement("input"),this.$text.setAttribute("type","text"),this.$text.setAttribute("spellcheck","false"),this.$text.setAttribute("aria-labelledby",this.$name.id),this.$display=document.createElement("div"),this.$display.classList.add("display"),this.$display.appendChild(this.$input),this.$widget.appendChild(this.$display),this.$widget.appendChild(this.$text),this._format=Y(this.initialValue),this._rgbScale=n,this._initialValueHexString=this.save(),this._textFocused=!1,this.$input.addEventListener("input",()=>{this._setValueFromHexString(this.$input.value)}),this.$input.addEventListener("blur",()=>{this._callOnFinishChange()}),this.$text.addEventListener("input",()=>{const s=k(this.$text.value);s&&this._setValueFromHexString(s)}),this.$text.addEventListener("focus",()=>{this._textFocused=!0,this.$text.select()}),this.$text.addEventListener("blur",()=>{this._textFocused=!1,this.updateDisplay(),this._callOnFinishChange()}),this.$disable=this.$text,this.updateDisplay()}reset(){return this._setValueFromHexString(this._initialValueHexString),this}_setValueFromHexString(t){if(this._format.isPrimitive){const e=this._format.fromHexString(t);this.setValue(e)}else this._format.fromHexString(t,this.getValue(),this._rgbScale),this._callOnChange(),this.updateDisplay()}save(){return this._format.toHexString(this.getValue(),this._rgbScale)}load(t){return this._setValueFromHexString(t),this._callOnFinishChange(),this}updateDisplay(){return this.$input.value=this._format.toHexString(this.getValue(),this._rgbScale),this._textFocused||(this.$text.value=this.$input.value.substring(1)),this.$display.style.backgroundColor=this.$input.value,this}}class S extends x{constructor(t,e,i){super(t,e,i,"function"),this.$button=document.createElement("button"),this.$button.appendChild(this.$name),this.$widget.appendChild(this.$button),this.$button.addEventListener("click",n=>{n.preventDefault(),this.getValue().call(this.object),this._callOnChange()}),this.$button.addEventListener("touchstart",()=>{},{passive:!0}),this.$disable=this.$button}}class U extends x{constructor(t,e,i,n,s,o){super(t,e,i,"number"),this._initInput(),this.min(n),this.max(s);const l=o!==void 0;this.step(l?o:this._getImplicitStep(),l),this.updateDisplay()}decimals(t){return this._decimals=t,this.updateDisplay(),this}min(t){return this._min=t,this._onUpdateMinMax(),this}max(t){return this._max=t,this._onUpdateMinMax(),this}step(t,e=!0){return this._step=t,this._stepExplicit=e,this}updateDisplay(){const t=this.getValue();if(this._hasSlider){let e=(t-this._min)/(this._max-this._min);e=Math.max(0,Math.min(e,1)),this.$fill.style.width=e*100+"%"}return this._inputFocused||(this.$input.value=this._decimals===void 0?t:t.toFixed(this._decimals)),this}_initInput(){this.$input=document.createElement("input"),this.$input.setAttribute("type","text"),this.$input.setAttribute("aria-labelledby",this.$name.id),window.matchMedia("(pointer: coarse)").matches&&(this.$input.setAttribute("type","number"),this.$input.setAttribute("step","any")),this.$widget.appendChild(this.$input),this.$disable=this.$input;const e=()=>{let a=parseFloat(this.$input.value);isNaN(a)||(this._stepExplicit&&(a=this._snap(a)),this.setValue(this._clamp(a)))},i=a=>{const d=parseFloat(this.$input.value);isNaN(d)||(this._snapClampSetValue(d+a),this.$input.value=this.getValue())},n=a=>{a.key==="Enter"&&this.$input.blur(),a.code==="ArrowUp"&&(a.preventDefault(),i(this._step*this._arrowKeyMultiplier(a))),a.code==="ArrowDown"&&(a.preventDefault(),i(this._step*this._arrowKeyMultiplier(a)*-1))},s=a=>{this._inputFocused&&(a.preventDefault(),i(this._step*this._normalizeMouseWheel(a)))};let o=!1,l,u,c,f,g;const w=5,p=a=>{l=a.clientX,u=c=a.clientY,o=!0,f=this.getValue(),g=0,window.addEventListener("mousemove",m),window.addEventListener("mouseup",v)},m=a=>{if(o){const d=a.clientX-l,y=a.clientY-u;Math.abs(y)>w?(a.preventDefault(),this.$input.blur(),o=!1,this._setDraggingStyle(!0,"vertical")):Math.abs(d)>w&&v()}if(!o){const d=a.clientY-c;g-=d*this._step*this._arrowKeyMultiplier(a),f+g>this._max?g=this._max-f:f+g<this._min&&(g=this._min-f),this._snapClampSetValue(f+g)}c=a.clientY},v=()=>{this._setDraggingStyle(!1,"vertical"),this._callOnFinishChange(),window.removeEventListener("mousemove",m),window.removeEventListener("mouseup",v)},A=()=>{this._inputFocused=!0},h=()=>{this._inputFocused=!1,this.updateDisplay(),this._callOnFinishChange()};this.$input.addEventListener("input",e),this.$input.addEventListener("keydown",n),this.$input.addEventListener("wheel",s,{passive:!1}),this.$input.addEventListener("mousedown",p),this.$input.addEventListener("focus",A),this.$input.addEventListener("blur",h)}_initSlider(){this._hasSlider=!0,this.$slider=document.createElement("div"),this.$slider.classList.add("slider"),this.$fill=document.createElement("div"),this.$fill.classList.add("fill"),this.$slider.appendChild(this.$fill),this.$widget.insertBefore(this.$slider,this.$input),this.domElement.classList.add("hasSlider");const t=(h,a,d,y,L)=>(h-a)/(d-a)*(L-y)+y,e=h=>{const a=this.$slider.getBoundingClientRect();let d=t(h,a.left,a.right,this._min,this._max);this._snapClampSetValue(d)},i=h=>{this._setDraggingStyle(!0),e(h.clientX),window.addEventListener("mousemove",n),window.addEventListener("mouseup",s)},n=h=>{e(h.clientX)},s=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener("mousemove",n),window.removeEventListener("mouseup",s)};let o=!1,l,u;const c=h=>{h.preventDefault(),this._setDraggingStyle(!0),e(h.touches[0].clientX),o=!1},f=h=>{h.touches.length>1||(this._hasScrollBar?(l=h.touches[0].clientX,u=h.touches[0].clientY,o=!0):c(h),window.addEventListener("touchmove",g,{passive:!1}),window.addEventListener("touchend",w))},g=h=>{if(o){const a=h.touches[0].clientX-l,d=h.touches[0].clientY-u;Math.abs(a)>Math.abs(d)?c(h):(window.removeEventListener("touchmove",g),window.removeEventListener("touchend",w))}else h.preventDefault(),e(h.touches[0].clientX)},w=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener("touchmove",g),window.removeEventListener("touchend",w)},p=this._callOnFinishChange.bind(this),m=400;let v;const A=h=>{if(Math.abs(h.deltaX)<Math.abs(h.deltaY)&&this._hasScrollBar)return;h.preventDefault();const d=this._normalizeMouseWheel(h)*this._step;this._snapClampSetValue(this.getValue()+d),this.$input.value=this.getValue(),clearTimeout(v),v=setTimeout(p,m)};this.$slider.addEventListener("mousedown",i),this.$slider.addEventListener("touchstart",f,{passive:!1}),this.$slider.addEventListener("wheel",A,{passive:!1})}_setDraggingStyle(t,e="horizontal"){this.$slider&&this.$slider.classList.toggle("active",t),document.body.classList.toggle("lil-gui-dragging",t),document.body.classList.toggle(`lil-gui-${e}`,t)}_getImplicitStep(){return this._hasMin&&this._hasMax?(this._max-this._min)/1e3:.1}_onUpdateMinMax(){!this._hasSlider&&this._hasMin&&this._hasMax&&(this._stepExplicit||this.step(this._getImplicitStep(),!1),this._initSlider(),this.updateDisplay())}_normalizeMouseWheel(t){let{deltaX:e,deltaY:i}=t;return Math.floor(t.deltaY)!==t.deltaY&&t.wheelDelta&&(e=0,i=-t.wheelDelta/120,i*=this._stepExplicit?1:10),e+-i}_arrowKeyMultiplier(t){let e=this._stepExplicit?1:10;return t.shiftKey?e*=10:t.altKey&&(e/=10),e}_snap(t){let e=0;return this._hasMin?e=this._min:this._hasMax&&(e=this._max),t-=e,t=Math.round(t/this._step)*this._step,t+=e,t=parseFloat(t.toPrecision(15)),t}_clamp(t){return t<this._min&&(t=this._min),t>this._max&&(t=this._max),t}_snapClampSetValue(t){this.setValue(this._clamp(this._snap(t)))}get _hasScrollBar(){const t=this.parent.root.$children;return t.scrollHeight>t.clientHeight}get _hasMin(){return this._min!==void 0}get _hasMax(){return this._max!==void 0}}class X extends x{constructor(t,e,i,n){super(t,e,i,"option"),this.$select=document.createElement("select"),this.$select.setAttribute("aria-labelledby",this.$name.id),this.$display=document.createElement("div"),this.$display.classList.add("display"),this.$select.addEventListener("change",()=>{this.setValue(this._values[this.$select.selectedIndex]),this._callOnFinishChange()}),this.$select.addEventListener("focus",()=>{this.$display.classList.add("focus")}),this.$select.addEventListener("blur",()=>{this.$display.classList.remove("focus")}),this.$widget.appendChild(this.$select),this.$widget.appendChild(this.$display),this.$disable=this.$select,this.options(n)}options(t){return this._values=Array.isArray(t)?t:Object.values(t),this._names=Array.isArray(t)?t:Object.keys(t),this.$select.replaceChildren(),this._names.forEach(e=>{const i=document.createElement("option");i.textContent=e,this.$select.appendChild(i)}),this.updateDisplay(),this}updateDisplay(){const t=this.getValue(),e=this._values.indexOf(t);return this.$select.selectedIndex=e,this.$display.textContent=e===-1?t:this._names[e],this}}class N extends x{constructor(t,e,i){super(t,e,i,"string"),this.$input=document.createElement("input"),this.$input.setAttribute("type","text"),this.$input.setAttribute("spellcheck","false"),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$input.addEventListener("input",()=>{this.setValue(this.$input.value)}),this.$input.addEventListener("keydown",n=>{n.code==="Enter"&&this.$input.blur()}),this.$input.addEventListener("blur",()=>{this._callOnFinishChange()}),this.$widget.appendChild(this.$input),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.value=this.getValue(),this}}var W=`.lil-gui {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: 1;
  font-weight: normal;
  font-style: normal;
  text-align: left;
  color: var(--text-color);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  --background-color: #1f1f1f;
  --text-color: #ebebeb;
  --title-background-color: #111111;
  --title-text-color: #ebebeb;
  --widget-color: #424242;
  --hover-color: #4f4f4f;
  --focus-color: #595959;
  --number-color: #2cc9ff;
  --string-color: #a2db3c;
  --font-size: 11px;
  --input-font-size: 11px;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  --font-family-mono: Menlo, Monaco, Consolas, "Droid Sans Mono", monospace;
  --padding: 4px;
  --spacing: 4px;
  --widget-height: 20px;
  --title-height: calc(var(--widget-height) + var(--spacing) * 1.25);
  --name-width: 45%;
  --slider-knob-width: 2px;
  --slider-input-width: 27%;
  --color-input-width: 27%;
  --slider-input-min-width: 45px;
  --color-input-min-width: 45px;
  --folder-indent: 7px;
  --widget-padding: 0 0 0 3px;
  --widget-border-radius: 2px;
  --checkbox-size: calc(0.75 * var(--widget-height));
  --scrollbar-width: 5px;
}
.lil-gui, .lil-gui * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.lil-gui.root {
  width: var(--width, 245px);
  display: flex;
  flex-direction: column;
  background: var(--background-color);
}
.lil-gui.root > .title {
  background: var(--title-background-color);
  color: var(--title-text-color);
}
.lil-gui.root > .children {
  overflow-x: hidden;
  overflow-y: auto;
}
.lil-gui.root > .children::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
  background: var(--background-color);
}
.lil-gui.root > .children::-webkit-scrollbar-thumb {
  border-radius: var(--scrollbar-width);
  background: var(--focus-color);
}
@media (pointer: coarse) {
  .lil-gui.allow-touch-styles, .lil-gui.allow-touch-styles .lil-gui {
    --widget-height: 28px;
    --padding: 6px;
    --spacing: 6px;
    --font-size: 13px;
    --input-font-size: 16px;
    --folder-indent: 10px;
    --scrollbar-width: 7px;
    --slider-input-min-width: 50px;
    --color-input-min-width: 65px;
  }
}
.lil-gui.force-touch-styles, .lil-gui.force-touch-styles .lil-gui {
  --widget-height: 28px;
  --padding: 6px;
  --spacing: 6px;
  --font-size: 13px;
  --input-font-size: 16px;
  --folder-indent: 10px;
  --scrollbar-width: 7px;
  --slider-input-min-width: 50px;
  --color-input-min-width: 65px;
}
.lil-gui.autoPlace {
  max-height: 100%;
  position: fixed;
  top: 0;
  right: 15px;
  z-index: 1001;
}

.lil-gui .controller {
  display: flex;
  align-items: center;
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
}
.lil-gui .controller.disabled {
  opacity: 0.5;
}
.lil-gui .controller.disabled, .lil-gui .controller.disabled * {
  pointer-events: none !important;
}
.lil-gui .controller > .name {
  min-width: var(--name-width);
  flex-shrink: 0;
  white-space: pre;
  padding-right: var(--spacing);
  line-height: var(--widget-height);
}
.lil-gui .controller .widget {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--widget-height);
}
.lil-gui .controller.string input {
  color: var(--string-color);
}
.lil-gui .controller.boolean {
  cursor: pointer;
}
.lil-gui .controller.color .display {
  width: 100%;
  height: var(--widget-height);
  border-radius: var(--widget-border-radius);
  position: relative;
}
@media (hover: hover) {
  .lil-gui .controller.color .display:hover:before {
    content: " ";
    display: block;
    position: absolute;
    border-radius: var(--widget-border-radius);
    border: 1px solid #fff9;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
}
.lil-gui .controller.color input[type=color] {
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.lil-gui .controller.color input[type=text] {
  margin-left: var(--spacing);
  font-family: var(--font-family-mono);
  min-width: var(--color-input-min-width);
  width: var(--color-input-width);
  flex-shrink: 0;
}
.lil-gui .controller.option select {
  opacity: 0;
  position: absolute;
  width: 100%;
  max-width: 100%;
}
.lil-gui .controller.option .display {
  position: relative;
  pointer-events: none;
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  line-height: var(--widget-height);
  max-width: 100%;
  overflow: hidden;
  word-break: break-all;
  padding-left: 0.55em;
  padding-right: 1.75em;
  background: var(--widget-color);
}
@media (hover: hover) {
  .lil-gui .controller.option .display.focus {
    background: var(--focus-color);
  }
}
.lil-gui .controller.option .display.active {
  background: var(--focus-color);
}
.lil-gui .controller.option .display:after {
  font-family: "lil-gui";
  content: "↕";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  padding-right: 0.375em;
}
.lil-gui .controller.option .widget,
.lil-gui .controller.option select {
  cursor: pointer;
}
@media (hover: hover) {
  .lil-gui .controller.option .widget:hover .display {
    background: var(--hover-color);
  }
}
.lil-gui .controller.number input {
  color: var(--number-color);
}
.lil-gui .controller.number.hasSlider input {
  margin-left: var(--spacing);
  width: var(--slider-input-width);
  min-width: var(--slider-input-min-width);
  flex-shrink: 0;
}
.lil-gui .controller.number .slider {
  width: 100%;
  height: var(--widget-height);
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
  padding-right: var(--slider-knob-width);
  overflow: hidden;
  cursor: ew-resize;
  touch-action: pan-y;
}
@media (hover: hover) {
  .lil-gui .controller.number .slider:hover {
    background: var(--hover-color);
  }
}
.lil-gui .controller.number .slider.active {
  background: var(--focus-color);
}
.lil-gui .controller.number .slider.active .fill {
  opacity: 0.95;
}
.lil-gui .controller.number .fill {
  height: 100%;
  border-right: var(--slider-knob-width) solid var(--number-color);
  box-sizing: content-box;
}

.lil-gui-dragging .lil-gui {
  --hover-color: var(--widget-color);
}
.lil-gui-dragging * {
  cursor: ew-resize !important;
}

.lil-gui-dragging.lil-gui-vertical * {
  cursor: ns-resize !important;
}

.lil-gui .title {
  height: var(--title-height);
  font-weight: 600;
  padding: 0 var(--padding);
  width: 100%;
  text-align: left;
  background: none;
  text-decoration-skip: objects;
}
.lil-gui .title:before {
  font-family: "lil-gui";
  content: "▾";
  padding-right: 2px;
  display: inline-block;
}
.lil-gui .title:active {
  background: var(--title-background-color);
  opacity: 0.75;
}
@media (hover: hover) {
  body:not(.lil-gui-dragging) .lil-gui .title:hover {
    background: var(--title-background-color);
    opacity: 0.85;
  }
  .lil-gui .title:focus {
    text-decoration: underline var(--focus-color);
  }
}
.lil-gui.root > .title:focus {
  text-decoration: none !important;
}
.lil-gui.closed > .title:before {
  content: "▸";
}
.lil-gui.closed > .children {
  transform: translateY(-7px);
  opacity: 0;
}
.lil-gui.closed:not(.transition) > .children {
  display: none;
}
.lil-gui.transition > .children {
  transition-duration: 300ms;
  transition-property: height, opacity, transform;
  transition-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  overflow: hidden;
  pointer-events: none;
}
.lil-gui .children:empty:before {
  content: "Empty";
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
  display: block;
  height: var(--widget-height);
  font-style: italic;
  line-height: var(--widget-height);
  opacity: 0.5;
}
.lil-gui.root > .children > .lil-gui > .title {
  border: 0 solid var(--widget-color);
  border-width: 1px 0;
  transition: border-color 300ms;
}
.lil-gui.root > .children > .lil-gui.closed > .title {
  border-bottom-color: transparent;
}
.lil-gui + .controller {
  border-top: 1px solid var(--widget-color);
  margin-top: 0;
  padding-top: var(--spacing);
}
.lil-gui .lil-gui .lil-gui > .title {
  border: none;
}
.lil-gui .lil-gui .lil-gui > .children {
  border: none;
  margin-left: var(--folder-indent);
  border-left: 2px solid var(--widget-color);
}
.lil-gui .lil-gui .controller {
  border: none;
}

.lil-gui label, .lil-gui input, .lil-gui button {
  -webkit-tap-highlight-color: transparent;
}
.lil-gui input {
  border: 0;
  outline: none;
  font-family: var(--font-family);
  font-size: var(--input-font-size);
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  background: var(--widget-color);
  color: var(--text-color);
  width: 100%;
}
@media (hover: hover) {
  .lil-gui input:hover {
    background: var(--hover-color);
  }
  .lil-gui input:active {
    background: var(--focus-color);
  }
}
.lil-gui input:disabled {
  opacity: 1;
}
.lil-gui input[type=text],
.lil-gui input[type=number] {
  padding: var(--widget-padding);
  -moz-appearance: textfield;
}
.lil-gui input[type=text]:focus,
.lil-gui input[type=number]:focus {
  background: var(--focus-color);
}
.lil-gui input[type=checkbox] {
  appearance: none;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: var(--widget-border-radius);
  text-align: center;
  cursor: pointer;
}
.lil-gui input[type=checkbox]:checked:before {
  font-family: "lil-gui";
  content: "✓";
  font-size: var(--checkbox-size);
  line-height: var(--checkbox-size);
}
@media (hover: hover) {
  .lil-gui input[type=checkbox]:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui button {
  outline: none;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size);
  color: var(--text-color);
  width: 100%;
  border: none;
}
.lil-gui .controller button {
  height: var(--widget-height);
  text-transform: none;
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
}
@media (hover: hover) {
  .lil-gui .controller button:hover {
    background: var(--hover-color);
  }
  .lil-gui .controller button:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui .controller button:active {
  background: var(--focus-color);
}

@font-face {
  font-family: "lil-gui";
  src: url("data:application/font-woff;charset=utf-8;base64,d09GRgABAAAAAAUsAAsAAAAACJwAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAABHU1VCAAABCAAAAH4AAADAImwmYE9TLzIAAAGIAAAAPwAAAGBKqH5SY21hcAAAAcgAAAD0AAACrukyyJBnbHlmAAACvAAAAF8AAACEIZpWH2hlYWQAAAMcAAAAJwAAADZfcj2zaGhlYQAAA0QAAAAYAAAAJAC5AHhobXR4AAADXAAAABAAAABMAZAAAGxvY2EAAANsAAAAFAAAACgCEgIybWF4cAAAA4AAAAAeAAAAIAEfABJuYW1lAAADoAAAASIAAAIK9SUU/XBvc3QAAATEAAAAZgAAAJCTcMc2eJxVjbEOgjAURU+hFRBK1dGRL+ALnAiToyMLEzFpnPz/eAshwSa97517c/MwwJmeB9kwPl+0cf5+uGPZXsqPu4nvZabcSZldZ6kfyWnomFY/eScKqZNWupKJO6kXN3K9uCVoL7iInPr1X5baXs3tjuMqCtzEuagm/AAlzQgPAAB4nGNgYRBlnMDAysDAYM/gBiT5oLQBAwuDJAMDEwMrMwNWEJDmmsJwgCFeXZghBcjlZMgFCzOiKOIFAB71Bb8AeJy1kjFuwkAQRZ+DwRAwBtNQRUGKQ8OdKCAWUhAgKLhIuAsVSpWz5Bbkj3dEgYiUIszqWdpZe+Z7/wB1oCYmIoboiwiLT2WjKl/jscrHfGg/pKdMkyklC5Zs2LEfHYpjcRoPzme9MWWmk3dWbK9ObkWkikOetJ554fWyoEsmdSlt+uR0pCJR34b6t/TVg1SY3sYvdf8vuiKrpyaDXDISiegp17p7579Gp3p++y7HPAiY9pmTibljrr85qSidtlg4+l25GLCaS8e6rRxNBmsnERunKbaOObRz7N72ju5vdAjYpBXHgJylOAVsMseDAPEP8LYoUHicY2BiAAEfhiAGJgZWBgZ7RnFRdnVJELCQlBSRlATJMoLV2DK4glSYs6ubq5vbKrJLSbGrgEmovDuDJVhe3VzcXFwNLCOILB/C4IuQ1xTn5FPilBTj5FPmBAB4WwoqAHicY2BkYGAA4sk1sR/j+W2+MnAzpDBgAyEMQUCSg4EJxAEAwUgFHgB4nGNgZGBgSGFggJMhDIwMqEAYAByHATJ4nGNgAIIUNEwmAABl3AGReJxjYAACIQYlBiMGJ3wQAEcQBEV4nGNgZGBgEGZgY2BiAAEQyQWEDAz/wXwGAAsPATIAAHicXdBNSsNAHAXwl35iA0UQXYnMShfS9GPZA7T7LgIu03SSpkwzYTIt1BN4Ak/gKTyAeCxfw39jZkjymzcvAwmAW/wgwHUEGDb36+jQQ3GXGot79L24jxCP4gHzF/EIr4jEIe7wxhOC3g2TMYy4Q7+Lu/SHuEd/ivt4wJd4wPxbPEKMX3GI5+DJFGaSn4qNzk8mcbKSR6xdXdhSzaOZJGtdapd4vVPbi6rP+cL7TGXOHtXKll4bY1Xl7EGnPtp7Xy2n00zyKLVHfkHBa4IcJ2oD3cgggWvt/V/FbDrUlEUJhTn/0azVWbNTNr0Ens8de1tceK9xZmfB1CPjOmPH4kitmvOubcNpmVTN3oFJyjzCvnmrwhJTzqzVj9jiSX911FjeAAB4nG3HMRKCMBBA0f0giiKi4DU8k0V2GWbIZDOh4PoWWvq6J5V8If9NVNQcaDhyouXMhY4rPTcG7jwYmXhKq8Wz+p762aNaeYXom2n3m2dLTVgsrCgFJ7OTmIkYbwIbC6vIB7WmFfAAAA==") format("woff");
}`;function j(r){const t=document.createElement("style");t.innerHTML=r;const e=document.querySelector("head link[rel=stylesheet], head style");e?document.head.insertBefore(t,e):document.head.appendChild(t)}let F=!1;class B{constructor({parent:t,autoPlace:e=t===void 0,container:i,width:n,title:s="Controls",closeFolders:o=!1,injectStyles:l=!0,touchStyles:u=!0}={}){if(this.parent=t,this.root=t?t.root:this,this.children=[],this.controllers=[],this.folders=[],this._closed=!1,this._hidden=!1,this.domElement=document.createElement("div"),this.domElement.classList.add("lil-gui"),this.$title=document.createElement("button"),this.$title.classList.add("title"),this.$title.setAttribute("aria-expanded",!0),this.$title.addEventListener("click",()=>this.openAnimated(this._closed)),this.$title.addEventListener("touchstart",()=>{},{passive:!0}),this.$children=document.createElement("div"),this.$children.classList.add("children"),this.domElement.appendChild(this.$title),this.domElement.appendChild(this.$children),this.title(s),this.parent){this.parent.children.push(this),this.parent.folders.push(this),this.parent.$children.appendChild(this.domElement);return}this.domElement.classList.add("root"),u&&this.domElement.classList.add("allow-touch-styles"),!F&&l&&(j(W),F=!0),i?i.appendChild(this.domElement):e&&(this.domElement.classList.add("autoPlace"),document.body.appendChild(this.domElement)),n&&this.domElement.style.setProperty("--width",n+"px"),this._closeFolders=o}add(t,e,i,n,s){if(Object(i)===i)return new X(this,t,e,i);const o=t[e];switch(typeof o){case"number":return new U(this,t,e,i,n,s);case"boolean":return new T(this,t,e);case"string":return new N(this,t,e);case"function":return new S(this,t,e)}console.error(`gui.add failed
	property:`,e,`
	object:`,t,`
	value:`,o)}addColor(t,e,i=1){return new G(this,t,e,i)}addFolder(t){const e=new B({parent:this,title:t});return this.root._closeFolders&&e.close(),e}load(t,e=!0){return t.controllers&&this.controllers.forEach(i=>{i instanceof S||i._name in t.controllers&&i.load(t.controllers[i._name])}),e&&t.folders&&this.folders.forEach(i=>{i._title in t.folders&&i.load(t.folders[i._title])}),this}save(t=!0){const e={controllers:{},folders:{}};return this.controllers.forEach(i=>{if(!(i instanceof S)){if(i._name in e.controllers)throw new Error(`Cannot save GUI with duplicate property "${i._name}"`);e.controllers[i._name]=i.save()}}),t&&this.folders.forEach(i=>{if(i._title in e.folders)throw new Error(`Cannot save GUI with duplicate folder "${i._title}"`);e.folders[i._title]=i.save()}),e}open(t=!0){return this._setClosed(!t),this.$title.setAttribute("aria-expanded",!this._closed),this.domElement.classList.toggle("closed",this._closed),this}close(){return this.open(!1)}_setClosed(t){this._closed!==t&&(this._closed=t,this._callOnOpenClose(this))}show(t=!0){return this._hidden=!t,this.domElement.style.display=this._hidden?"none":"",this}hide(){return this.show(!1)}openAnimated(t=!0){return this._setClosed(!t),this.$title.setAttribute("aria-expanded",!this._closed),requestAnimationFrame(()=>{const e=this.$children.clientHeight;this.$children.style.height=e+"px",this.domElement.classList.add("transition");const i=s=>{s.target===this.$children&&(this.$children.style.height="",this.domElement.classList.remove("transition"),this.$children.removeEventListener("transitionend",i))};this.$children.addEventListener("transitionend",i);const n=t?this.$children.scrollHeight:0;this.domElement.classList.toggle("closed",!t),requestAnimationFrame(()=>{this.$children.style.height=n+"px"})}),this}title(t){return this._title=t,this.$title.textContent=t,this}reset(t=!0){return(t?this.controllersRecursive():this.controllers).forEach(i=>i.reset()),this}onChange(t){return this._onChange=t,this}_callOnChange(t){this.parent&&this.parent._callOnChange(t),this._onChange!==void 0&&this._onChange.call(this,{object:t.object,property:t.property,value:t.getValue(),controller:t})}onFinishChange(t){return this._onFinishChange=t,this}_callOnFinishChange(t){this.parent&&this.parent._callOnFinishChange(t),this._onFinishChange!==void 0&&this._onFinishChange.call(this,{object:t.object,property:t.property,value:t.getValue(),controller:t})}onOpenClose(t){return this._onOpenClose=t,this}_callOnOpenClose(t){this.parent&&this.parent._callOnOpenClose(t),this._onOpenClose!==void 0&&this._onOpenClose.call(this,t)}destroy(){this.parent&&(this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.folders.splice(this.parent.folders.indexOf(this),1)),this.domElement.parentElement&&this.domElement.parentElement.removeChild(this.domElement),Array.from(this.children).forEach(t=>t.destroy())}controllersRecursive(){let t=Array.from(this.controllers);return this.folders.forEach(e=>{t=t.concat(e.controllersRecursive())}),t}foldersRecursive(){let t=Array.from(this.folders);return this.folders.forEach(e=>{t=t.concat(e.foldersRecursive())}),t}}function J(r){return r&&r.__esModule&&Object.prototype.hasOwnProperty.call(r,"default")?r.default:r}var $={exports:{}},K=$.exports,P;function Z(){return P||(P=1,function(r,t){(function(e,i){r.exports=i()})(K,function(){var e=function(){var i=0,n=document.createElement("div");function s(p){return n.appendChild(p.dom),p}function o(p){for(var m=0;m<n.children.length;m++)n.children[m].style.display=m===p?"block":"none";i=p}n.style.cssText="position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000",n.addEventListener("click",function(p){p.preventDefault(),o(++i%n.children.length)},!1);var l=(performance||Date).now(),u=l,c=0,f=s(new e.Panel("FPS","#0ff","#002")),g=s(new e.Panel("MS","#0f0","#020"));if(self.performance&&self.performance.memory)var w=s(new e.Panel("MB","#f08","#201"));return o(0),{REVISION:16,dom:n,addPanel:s,showPanel:o,begin:function(){l=(performance||Date).now()},end:function(){c++;var p=(performance||Date).now();if(g.update(p-l,200),u+1e3<=p&&(f.update(1e3*c/(p-u),100),u=p,c=0,w)){var m=performance.memory;w.update(m.usedJSHeapSize/1048576,m.jsHeapSizeLimit/1048576)}return p},update:function(){l=this.end()},domElement:n,setMode:o}};return e.Panel=function(i,n,s){var o=1/0,l=0,u=Math.round,c=u(window.devicePixelRatio||1),f=80*c,g=48*c,w=3*c,p=2*c,m=3*c,v=15*c,A=74*c,h=30*c,a=document.createElement("canvas");a.width=f,a.height=g,a.style.cssText="width:80px;height:48px";var d=a.getContext("2d");return d.font="bold "+9*c+"px Helvetica,Arial,sans-serif",d.textBaseline="top",d.fillStyle=s,d.fillRect(0,0,f,g),d.fillStyle=n,d.fillText(i,w,p),d.fillRect(m,v,A,h),d.fillStyle=s,d.globalAlpha=.9,d.fillRect(m,v,A,h),{dom:a,update:function(y,L){o=Math.min(o,y),l=Math.max(l,y),d.fillStyle=s,d.globalAlpha=1,d.fillRect(0,0,f,v),d.fillStyle=n,d.fillText(u(y)+" "+i+" ("+u(o)+"-"+u(l)+")",w,p),d.drawImage(a,m+c,v,A-c,h,m,v,A-c,h),d.fillRect(m+A-c,v,c,h),d.fillStyle=s,d.globalAlpha=.9,d.fillRect(m+A-c,v,c,u((1-y/L)*h))}}},e})}($)),$.exports}var q=Z();const Q=J(q);let b,E;const _={curveCount:500,segmentCount:42,triangles:0,isCubic:!0},C=new B({width:300,title:"Bezier Renderer Controls"});C.add(_,"curveCount",1,1e4,1).name("Curve Count").onChange(()=>{b.curveCount=_.curveCount,b.generateCurves()});C.add(_,"segmentCount",1,100,1).name("Segments per Curve").onChange(()=>{b.segmentCount=_.segmentCount});C.add(_,"isCubic").name("Cubic Bezier").onChange(()=>{b.isCubic=_.isCubic,b.generateCurves()});C.add({regenerate:()=>b.generateCurves()},"regenerate").name("Regenerate Curves");C.add({reset:()=>{b.zoom=1,b.panX=0,b.panY=0}},"reset").name("Reset View");C.add(_,"triangles",0,1e6).name("Triangles").disable().listen();async function tt(){try{E=new Q,E.showPanel(0),document.body.appendChild(E.dom),b=new V,await b.initialize(),console.log("WebGPU GPU tessellation renderer initialized!"),b.addEventListener("beforeRender",()=>E.begin()),b.addEventListener("afterRender",()=>E.end())}catch(r){console.error("Failed to initialize WebGPU:",r),document.body.innerHTML=`<h1>WebGPU Error</h1><p>${r.message}</p>`}}tt();
