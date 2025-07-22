export class Camera extends EventTarget {
  position = { x: 0, y: 0 };
  zoom: number = 10;
  width: number = 0;
  height: number = 0;
  maxZoom: number = 1e3;
  minZoom: number = 1e-3;
  canvas: HTMLCanvasElement;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private rect!: DOMRect;
  private devicePixelRatio: number = window.devicePixelRatio || 1;

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.width = canvas.clientWidth / this.devicePixelRatio;
    this.height = canvas.clientHeight / this.devicePixelRatio;
    this.position.x = (this.width / 2) * this.zoom;
    this.position.y = (-this.height / 2) * this.zoom;

    this.updateRect();
    this.setupEventHandlers();
  }

  private updateRect = () => {
    this.rect = this.canvas.getBoundingClientRect();
    this.updateCameraDimensions();
  };

  updateCameraDimensions() {
    this.width = this.canvas.width / this.devicePixelRatio;
    this.height = this.canvas.height / this.devicePixelRatio;
  }

  private setupEventHandlers() {
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
    this.canvas.addEventListener("mouseleave", this.onMouseUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private setXY(event: MouseEvent) {
    const { x, y } = this.getCanvasPosition(event);
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  private getCanvasPosition(event: MouseEvent | WheelEvent): {
    x: number;
    y: number;
  } {
    const rect = this.rect;
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private onMouseDown = (event: MouseEvent) => {
    this.isDragging = true;
    this.setXY(event);
    this.canvas.style.cursor = "grabbing";
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) {
      this.setXY(event);
      return;
    }

    const { x, y } = this.getCanvasPosition(event);

    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;

    this.move(dx, -dy);

    this.setXY(event);
    this.dispatchEvent(new Event("update"));
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.canvas.style.cursor = "grab";
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();

    const { x, y } = this.getCanvasPosition(event);

    // Calculate target zoom using momentum
    const zoomFactor = 1 + event.deltaY * 0.01;
    this.zoomAroundPoint(zoomFactor, x, y);
    this.dispatchEvent(new Event("update"));
  };

  zoomAroundPoint(zoomFactor: number, screenX: number, screenY: number) {
    // Compute and clamp the proposed new zoom level
    const newZoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.zoom * zoomFactor)
    );

    // Convert the screen point to world coordinates
    const worldX = this.position.x + (screenX - this.width / 2) * this.zoom;
    const worldY = this.position.y - (screenY - this.height / 2) * this.zoom;

    // Adjust the camera position to keep the world point under the mouse cursor
    const zoomRatio = newZoom / this.zoom;
    this.position.x = worldX - (worldX - this.position.x) * zoomRatio;
    this.position.y = worldY - (worldY - this.position.y) * zoomRatio;

    // Update the zoom
    this.zoom = newZoom;
  }

  move(dx: number, dy: number) {
    this.position.x -= dx * this.zoom;
    this.position.y -= dy * this.zoom;
  }

  getScale() {
    return (this.zoom * Math.min(this.width, this.height)) / 2;
  }

  getViewProjMatrix(aspect: number): Float32Array {
    const scale = this.getScale();
    // prettier-ignore
    return new Float32Array([
      1 / (scale * aspect),                                       0, 0, 0,
      0,                                                  1 / scale, 0, 0,
      0,                                                          0, 1, 0,
      -this.position.x / (scale * aspect), -this.position.y / scale, 0, 1
    ]);
  }

  debugState() {
    console.log("Camera State:", {
      position: this.position,
      zoom: this.zoom,
      width: this.width,
      height: this.height,
    });
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
    this.canvas.removeEventListener("mouseleave", this.onMouseUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("resize", this.updateRect);
  }
}
