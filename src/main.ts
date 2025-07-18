import { BezierRenderer } from ".";
import { GUI } from "lil-gui";
import "./style.css";

// Global functions
let renderer: BezierRenderer;

const state = {
  curveCount: 500,
  segmentCount: 42,
  fps: 0,
  triangles: 0,
  isCubic: true,
};

// Initialize GUI
const gui = new GUI({ width: 300, title: "Bezier Renderer Controls" });
gui
  .add(state, "curveCount", 1, 10000, 1)
  .name("Curve Count")
  .onChange(() => {
    renderer.curveCount = state.curveCount;
    renderer.generateCurves();
  });
gui
  .add(state, "segmentCount", 1, 100, 1)
  .name("Segments per Curve")
  .onChange(() => {
    renderer.segmentCount = state.segmentCount;
  });

gui
  .add(state, "isCubic")
  .name("Cubic Bezier")
  .onChange(() => {
    renderer.isCubic = state.isCubic;
    renderer.generateCurves();
  });

gui
  .add({ regenerate: () => renderer.generateCurves() }, "regenerate")
  .name("Regenerate Curves");
gui
  .add(
    {
      reset: () => {
        renderer.zoom = 1.0;
        renderer.panX = 0.0;
        renderer.panY = 0.0;
      },
    },
    "reset"
  )
  .name("Reset View");

// Add FPS display
const fps = gui.add(state, "fps", 0, 120).name("FPS").disable().listen();

// Add triangle count display
const triangles = gui
  .add(state, "triangles", 0, 1000000)
  .name("Triangles")
  .disable()
  .listen();

// Initialize
async function main() {
  try {
    renderer = new BezierRenderer();
    await renderer.initialize();
    console.log("WebGPU GPU tessellation renderer initialized!");

    // Set up FPS and triangle count sync
    setInterval(() => {
      state.fps = renderer.fps;
      state.triangles = renderer.triangles;
    }, 100); // Update every 100ms
  } catch (error) {
    console.error("Failed to initialize WebGPU:", error);
    document.body.innerHTML = `<h1>WebGPU Error</h1><p>${error.message}</p>`;
  }
}

main();
