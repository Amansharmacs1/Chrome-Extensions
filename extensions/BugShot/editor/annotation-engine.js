/**
 * BugShot - Canvas Annotation Engine
 * Multi-layer drawing engine supporting Vector Arrows, Rectangles, Ellipses,
 * Freehand Paths, High-Contrast Text Pills, Highlighters, and True Pixelation/Blur.
 */

export class AnnotationEngine {
  /**
   * @param {HTMLCanvasElement} bgCanvas - Canvas holding base screenshot
   * @param {HTMLCanvasElement} overlayCanvas - Interactive canvas holding dynamic annotations
   */
  constructor(bgCanvas, overlayCanvas) {
    this.bgCanvas = bgCanvas;
    this.overlayCanvas = overlayCanvas;
    this.bgCtx = bgCanvas.getContext('2d');
    this.overlayCtx = overlayCanvas.getContext('2d');

    this.shapes = [];
    this.activeTool = 'arrow';
    this.activeColor = '#ef4444'; // Default red
    this.activeStrokeWidth = 4;
    this.activeFontSize = 20;

    this.isDrawing = false;
    this.currentShape = null;

    this.width = 0;
    this.height = 0;
  }

  /**
   * Loads base screenshot image onto the background canvas
   * @param {string} dataUrl
   * @returns {Promise<{ width: number, height: number }>}
   */
  async loadBaseImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.width = img.naturalWidth || img.width;
        this.height = img.naturalHeight || img.height;

        this.bgCanvas.width = this.width;
        this.bgCanvas.height = this.height;
        this.overlayCanvas.width = this.width;
        this.overlayCanvas.height = this.height;

        this.bgCtx.clearRect(0, 0, this.width, this.height);
        this.bgCtx.drawImage(img, 0, 0);

        this.redraw();
        resolve({ width: this.width, height: this.height });
      };
      img.onerror = (e) => reject(new Error('Failed to load base screenshot: ' + e));
      img.src = dataUrl;
    });
  }

  setTool(tool) {
    this.activeTool = tool;
  }

  setColor(color) {
    this.activeColor = color;
  }

  setStrokeWidth(width) {
    this.activeStrokeWidth = Math.max(1, width);
  }

  setFontSize(size) {
    this.activeFontSize = Math.max(10, size);
  }

  setShapes(shapes) {
    this.shapes = Array.isArray(shapes) ? [...shapes] : [];
    this.redraw();
  }

  getShapes() {
    return JSON.parse(JSON.stringify(this.shapes));
  }

  clear() {
    this.shapes = [];
    this.redraw();
  }

  // Mouse / Pointer Interaction handlers
  handlePointerDown(x, y) {
    this.isDrawing = true;
    const base = {
      id: `shp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: this.activeTool,
      color: this.activeColor,
      strokeWidth: this.activeStrokeWidth
    };

    switch (this.activeTool) {
      case 'arrow':
        this.currentShape = { ...base, startX: x, startY: y, endX: x, endY: y };
        break;
      case 'rectangle':
        this.currentShape = { ...base, x, y, width: 0, height: 0 };
        break;
      case 'circle':
        this.currentShape = { ...base, cx: x, cy: y, rx: 0, ry: 0 };
        break;
      case 'brush':
        this.currentShape = { ...base, points: [{ x, y }] };
        break;
      case 'highlight':
        this.currentShape = { ...base, x, y, width: 0, height: 0, opacity: 0.35 };
        break;
      case 'blur':
        this.currentShape = { ...base, x, y, width: 0, height: 0, radius: 10 };
        break;
      case 'text':
        // Prompt for text input or place inline
        const textVal = prompt('Enter annotation text:');
        if (textVal && textVal.trim()) {
          this.shapes.push({
            ...base,
            x,
            y,
            text: textVal.trim(),
            fontSize: this.activeFontSize
          });
          this.redraw();
        }
        this.isDrawing = false;
        this.currentShape = null;
        return;
    }

    this.renderOverlay();
  }

  handlePointerMove(x, y) {
    if (!this.isDrawing || !this.currentShape) return;

    switch (this.currentShape.tool) {
      case 'arrow':
        this.currentShape.endX = x;
        this.currentShape.endY = y;
        break;
      case 'rectangle':
      case 'highlight':
      case 'blur':
        this.currentShape.width = x - this.currentShape.x;
        this.currentShape.height = y - this.currentShape.y;
        break;
      case 'circle':
        this.currentShape.rx = Math.abs(x - this.currentShape.cx);
        this.currentShape.ry = Math.abs(y - this.currentShape.cy);
        break;
      case 'brush':
        this.currentShape.points.push({ x, y });
        break;
    }

    this.renderOverlay();
  }

  handlePointerUp() {
    if (!this.isDrawing) return null;
    this.isDrawing = false;

    if (this.currentShape) {
      // Normalize negative rectangle widths/heights
      if (['rectangle', 'highlight', 'blur'].includes(this.currentShape.tool)) {
        if (this.currentShape.width < 0) {
          this.currentShape.x += this.currentShape.width;
          this.currentShape.width = Math.abs(this.currentShape.width);
        }
        if (this.currentShape.height < 0) {
          this.currentShape.y += this.currentShape.height;
          this.currentShape.height = Math.abs(this.currentShape.height);
        }
      }

      // Filter out tiny accidental clicks
      let isValid = true;
      if (['rectangle', 'highlight', 'blur'].includes(this.currentShape.tool)) {
        isValid = this.currentShape.width > 5 && this.currentShape.height > 5;
      } else if (this.currentShape.tool === 'circle') {
        isValid = this.currentShape.rx > 5 || this.currentShape.ry > 5;
      } else if (this.currentShape.tool === 'arrow') {
        const dist = Math.hypot(this.currentShape.endX - this.currentShape.startX, this.currentShape.endY - this.currentShape.startY);
        isValid = dist > 5;
      } else if (this.currentShape.tool === 'brush') {
        isValid = this.currentShape.points.length > 1;
      }

      if (isValid) {
        this.shapes.push(this.currentShape);
      }
      this.currentShape = null;
    }

    this.redraw();
    return this.getShapes();
  }

  /**
   * Renders static shapes + dynamic in-progress shape
   */
  redraw() {
    this.overlayCtx.clearRect(0, 0, this.width, this.height);

    for (const shape of this.shapes) {
      this.renderShape(this.overlayCtx, shape);
    }
  }

  renderOverlay() {
    this.redraw();
    if (this.currentShape) {
      this.renderShape(this.overlayCtx, this.currentShape);
    }
  }

  /**
   * Draws a single shape onto target canvas context
   */
  renderShape(ctx, shape) {
    ctx.save();
    ctx.strokeStyle = shape.color || '#ef4444';
    ctx.lineWidth = shape.strokeWidth || 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (shape.tool) {
      case 'arrow': {
        const { startX, startY, endX, endY } = shape;
        const angle = Math.atan2(endY - startY, endX - startX);
        const headLength = Math.max(16, shape.strokeWidth * 3.5);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = shape.color;
        ctx.fill();
        break;
      }

      case 'rectangle': {
        const x = Math.min(shape.x, shape.x + shape.width);
        const y = Math.min(shape.y, shape.y + shape.height);
        const w = Math.abs(shape.width);
        const h = Math.abs(shape.height);

        ctx.strokeRect(x, y, w, h);
        break;
      }

      case 'circle': {
        ctx.beginPath();
        ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      }

      case 'brush': {
        if (!shape.points || shape.points.length === 0) break;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
        break;
      }

      case 'highlight': {
        const x = Math.min(shape.x, shape.x + shape.width);
        const y = Math.min(shape.y, shape.y + shape.height);
        const w = Math.abs(shape.width);
        const h = Math.abs(shape.height);

        ctx.fillStyle = shape.color || '#f59e0b';
        ctx.globalAlpha = shape.opacity || 0.35;
        ctx.fillRect(x, y, w, h);
        break;
      }

      case 'blur': {
        // True Canvas Pixelation Algorithm - genuinely scrambles underlying pixels!
        const x = Math.round(Math.min(shape.x, shape.x + shape.width));
        const y = Math.round(Math.min(shape.y, shape.y + shape.height));
        const w = Math.round(Math.abs(shape.width));
        const h = Math.round(Math.abs(shape.height));

        if (w > 0 && h > 0) {
          this.applyPixelation(ctx, x, y, w, h, 12);
        }
        break;
      }

      case 'text': {
        const fontSize = shape.fontSize || 20;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const textMetrics = ctx.measureText(shape.text);
        const textW = textMetrics.width;
        const textH = fontSize * 1.2;

        // Dark pill background for maximum legibility on any screenshot background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = shape.color || '#ef4444';
        ctx.lineWidth = 2;

        const padX = 8;
        const padY = 4;
        const rectX = shape.x - padX;
        const rectY = shape.y - textH + padY;
        const rectW = textW + padX * 2;
        const rectH = textH + padY * 2;

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(rectX, rectY, rectW, rectH, 6) : ctx.rect(rectX, rectY, rectW, rectH);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(shape.text, shape.x, shape.y);
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Performs real pixelation of the underlying image area onto the canvas
   */
  applyPixelation(ctx, x, y, width, height, blockSize = 12) {
    try {
      // Sample source pixels from background canvas
      const imgData = this.bgCtx.getImageData(x, y, width, height);
      const data = imgData.data;

      for (let by = 0; by < height; by += blockSize) {
        for (let bx = 0; bx < width; bx += blockSize) {
          // Compute average color in block
          let r = 0, g = 0, b = 0, count = 0;
          const curBlockW = Math.min(blockSize, width - bx);
          const curBlockH = Math.min(blockSize, height - by);

          for (let py = 0; py < curBlockH; py++) {
            for (let px = 0; px < curBlockW; px++) {
              const idx = ((by + py) * width + (bx + px)) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              count++;
            }
          }

          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          // Fill block with average
          for (let py = 0; py < curBlockH; py++) {
            for (let px = 0; px < curBlockW; px++) {
              const idx = ((by + py) * width + (bx + px)) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
            }
          }
        }
      }

      ctx.putImageData(imgData, x, y);

      // Draw subtle dashed boundary around redacted region
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
    } catch (err) {
      // Fallback opaque redacted box if cross-origin image blocks getImageData
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, width, height);
    }
  }

  /**
   * Exports combined background and all annotations as a single high-res PNG Data URL
   * @returns {string} PNG Data URL
   */
  exportToDataUrl() {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const exportCtx = exportCanvas.getContext('2d');

    // 1. Draw base image
    exportCtx.drawImage(this.bgCanvas, 0, 0);

    // 2. Draw overlay annotations
    exportCtx.drawImage(this.overlayCanvas, 0, 0);

    return exportCanvas.toDataURL('image/png');
  }
}
