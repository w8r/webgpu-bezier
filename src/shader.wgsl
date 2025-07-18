struct VertexInput {
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
