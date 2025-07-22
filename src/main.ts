import { BezierRenderer } from ".";
import { GUI } from "lil-gui";
import Stats from "stats-js";
import "./style.css";

// Global functions
let renderer: BezierRenderer;
let stats: Stats;

const state = {
  curveCount: 500,
  segmentCount: 42,
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

// Add triangle count display
const triangles = gui
  .add(state, "triangles", 0, 1000000)
  .name("Triangles")
  .disable()
  .listen();

// Initialize
async function main() {
  try {
    // Initialize Stats.js FPS counter
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);

    renderer = new BezierRenderer();
    await renderer.initialize();
    console.log("WebGPU GPU tessellation renderer initialized!");

    renderer.addEventListener("beforeRender", () => stats.begin());
    renderer.addEventListener("afterRender", () => stats.end());
  } catch (error) {
    console.error("Failed to initialize WebGPU:", error);
    document.body.innerHTML = `<h1>WebGPU Error</h1><p>${error.message}</p>`;
  }
}

main();
