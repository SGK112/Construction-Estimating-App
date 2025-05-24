/**
 * Interactive Drawing Module
 * 
 * This module provides functionality for the interactive layout drawing feature
 * of the Construction Estimator app, allowing users to draw their own countertop
 * layouts directly on screen.
 */

class DrawingCanvas {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.width = options.width || window.innerWidth;
    this.height = options.height || window.innerHeight;
    this.scale = options.scale || 1;
    this.offset = options.offset || { x: 0, y: 0 };
    this.gridSize = options.gridSize || 20;
    this.showGrid = options.showGrid !== undefined ? options.showGrid : true;
    this.shapes = [];
    this.selectedShape = null;
    this.activeTool = null;
    this.tools = {};
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySteps = options.maxHistorySteps || 20;
    this.onChange = options.onChange || (() => {});
    
    this.initialize();
  }
  
  initialize() {
    // Set up canvas size and event listeners
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    
    // Set up touch and mouse event handlers
    this.setupEventListeners();
  }
  
  resize() {
    // Handle canvas resizing logic
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    
    this.render();
  }
  
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Prevent context menu on right-click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  handleMouseDown(event) {
    event.preventDefault();
    
    const point = this.getCanvasPoint(event);
    
    if (this.activeTool) {
      this.activeTool.handleMouseDown(event);
    } else {
      // Check if clicked on a shape
      const clickedShape = this.findShapeAt(point);
      
      if (clickedShape) {
        this.selectShape(clickedShape);
      } else {
        this.deselectShape();
      }
    }
    
    this.render();
  }
  
  handleMouseMove(event) {
    event.preventDefault();
    
    if (this.activeTool) {
      this.activeTool.handleMouseMove(event);
    }
    
    this.render();
  }
  
  handleMouseUp(event) {
    event.preventDefault();
    
    if (this.activeTool) {
      this.activeTool.handleMouseUp(event);
    }
    
    this.render();
  }
  
  handleTouchStart(event) {
    event.preventDefault();
    
    const touch = event.touches[0];
    const simulatedEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => {}
    };
    
    this.handleMouseDown(simulatedEvent);
  }
  
  handleTouchMove(event) {
    event.preventDefault();
    
    const touch = event.touches[0];
    const simulatedEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => {}
    };
    
    this.handleMouseMove(simulatedEvent);
  }
  
  handleTouchEnd(event) {
    event.preventDefault();
    
    const simulatedEvent = {
      preventDefault: () => {}
    };
    
    this.handleMouseUp(simulatedEvent);
  }
  
  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - this.offset.x) / this.scale,
      y: (event.clientY - rect.top - this.offset.y) / this.scale
    };
  }
  
  findShapeAt(point) {
    // Search in reverse order to find top-most shape first
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.shapes[i].contains(point)) {
        return this.shapes[i];
      }
    }
    return null;
  }
  
  selectShape(shape) {
    this.deselectShape();
    this.selectedShape = shape;
    shape.selected = true;
    this.onChange();
  }
  
  deselectShape() {
    if (this.selectedShape) {
      this.selectedShape.selected = false;
      this.selectedShape = null;
      this.onChange();
    }
  }
  
  addShape(shape) {
    this.shapes.push(shape);
    this.saveState();
    this.onChange();
  }
  
  removeShape(shape) {
    const index = this.shapes.indexOf(shape);
    if (index !== -1) {
      this.shapes.splice(index, 1);
      if (this.selectedShape === shape) {
        this.selectedShape = null;
      }
      this.saveState();
      this.onChange();
    }
  }
  
  clearShapes() {
    this.shapes = [];
    this.selectedShape = null;
    this.saveState();
    this.onChange();
  }
  
  setActiveTool(toolName) {
    if (this.activeTool) {
      this.activeTool.deactivate();
    }
    
    this.activeTool = this.tools[toolName] || null;
    
    if (this.activeTool) {
      this.activeTool.activate();
    }
  }
  
  registerTool(name, tool) {
    this.tools[name] = tool;
  }
  
  saveState() {
    // Remove any states after current index if we've gone back in history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    // Create a deep copy of shapes for history
    const shapesCopy = this.shapes.map(shape => shape.clone());
    
    // Add to history
    this.history.push(shapesCopy);
    this.historyIndex++;
    
    // Limit history size
    if (this.history.length > this.maxHistorySteps) {
      this.history.shift();
      this.historyIndex--;
    }
  }
  
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.shapes = this.history[this.historyIndex].map(shape => shape.clone());
      this.selectedShape = null;
      this.onChange();
      this.render();
    }
  }
  
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.shapes = this.history[this.historyIndex].map(shape => shape.clone());
      this.selectedShape = null;
      this.onChange();
      this.render();
    }
  }
  
  drawGrid() {
    const { ctx, gridSize, width, height, offset, scale } = this;
    
    ctx.save();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // Calculate grid starting points
    const startX = (offset.x % (gridSize * scale)) - gridSize * scale;
    const startY = (offset.y % (gridSize * scale)) - gridSize * scale;
    
    // Draw vertical lines
    for (let x = startX; x < width + gridSize * scale; x += gridSize * scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y < height + gridSize * scale; y += gridSize * scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  drawShapes() {
    this.shapes.forEach(shape => {
      shape.draw(this.ctx, this.scale, this.offset);
    });
  }
  
  drawToolPreview() {
    if (this.activeTool) {
      this.activeTool.drawPreview(this.ctx);
    }
  }
  
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid if enabled
    if (this.showGrid) {
      this.drawGrid();
    }
    
    // Draw all shapes
    this.drawShapes();
    
    // Draw current tool preview
    this.drawToolPreview();
  }
  
  exportToJSON() {
    return JSON.stringify({
      shapes: this.shapes.map(shape => shape.toJSON())
    });
  }
  
  importFromJSON(json) {
    try {
      const data = JSON.parse(json);
      this.shapes = data.shapes.map(shapeData => {
        return Shape.fromJSON(shapeData);
      });
      this.selectedShape = null;
      this.saveState();
      this.onChange();
      this.render();
      return true;
    } catch (error) {
      console.error('Error importing drawing data:', error);
      return false;
    }
  }
}

class Shape {
  constructor(type, properties) {
    this.type = type; // 'rectangle', 'L-shape', 'U-shape', 'island', 'custom'
    this.properties = properties;
    this.selected = false;
  }
  
  draw(ctx, scale, offset) {
    // Drawing logic based on shape type
    console.warn('Draw method not implemented for base Shape class');
  }
  
  contains(point) {
    // Hit testing logic
    console.warn('Contains method not implemented for base Shape class');
    return false;
  }
  
  getArea() {
    // Calculate area based on shape type and properties
    console.warn('GetArea method not implemented for base Shape class');
    return 0;
  }
  
  getBoundingBox() {
    // Return bounding box for selection
    console.warn('GetBoundingBox method not implemented for base Shape class');
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  clone() {
    // Create a deep copy of this shape
    console.warn('Clone method not implemented for base Shape class');
    return new Shape(this.type, JSON.parse(JSON.stringify(this.properties)));
  }
  
  toJSON() {
    return {
      type: this.type,
      properties: this.properties
    };
  }
  
  static fromJSON(data) {
    switch (data.type) {
      case 'rectangle':
        return new Rectangle(
          data.properties.x,
          data.properties.y,
          data.properties.width,
          data.properties.depth
        );
      case 'L-shape':
        return new LShape(
          data.properties.x,
          data.properties.y,
          data.properties.width,
          data.properties.depth,
          data.properties.cutoutWidth,
          data.properties.cutoutDepth
        );
      case 'U-shape':
        return new UShape(
          data.properties.x,
          data.properties.y,
          data.properties.width,
          data.properties.depth,
          data.properties.leftCutoutWidth,
          data.properties.rightCutoutWidth,
          data.properties.cutoutDepth
        );
      case 'island':
        return new Island(
          data.properties.x,
          data.properties.y,
          data.properties.width,
          data.properties.depth
        );
      case 'custom':
        return new CustomShape(
          data.properties.points
        );
      default:
        console.error('Unknown shape type:', data.type);
        return new Shape(data.type, data.properties);
    }
  }
}

class Rectangle extends Shape {
  constructor(x, y, width, depth) {
    super('rectangle', { x, y, width, depth });
  }
  
  draw(ctx, scale, offset) {
    const { x, y, width, depth } = this.properties;
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    ctx.beginPath();
    ctx.rect(x, y, width, depth);
    ctx.fillStyle = this.selected ? '#a3c2e8' : '#d1e0f3';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    
    // Draw dimensions
    this.drawDimensions(ctx, scale);
    
    ctx.restore();
  }
  
  contains(point) {
    const { x, y, width, depth } = this.properties;
    return (
      point.x >= x && 
      point.x <= x + width && 
      point.y >= y && 
      point.y <= y + depth
    );
  }
  
  getArea() {
    return this.properties.width * this.properties.depth;
  }
  
  getBoundingBox() {
    const { x, y, width, depth } = this.properties;
    return { x, y, width, depth };
  }
  
  drawDimensions(ctx, scale) {
    const { x, y, width, depth } = this.properties;
    const padding = 10 / scale;
    const fontSize = 14 / scale;
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Width dimension
    ctx.fillText(`${Math.round(width)}px`, x + width / 2, y - padding);
    
    // Depth dimension
    ctx.save();
    ctx.translate(x - padding, y + depth / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${Math.round(depth)}px`, 0, 0);
    ctx.restore();
  }
  
  clone() {
    return new Rectangle(
      this.properties.x,
      this.properties.y,
      this.properties.width,
      this.properties.depth
    );
  }
}

class LShape extends Shape {
  constructor(x, y, width, depth, cutoutWidth, cutoutDepth) {
    super('L-shape', { x, y, width, depth, cutoutWidth, cutoutDepth });
  }
  
  draw(ctx, scale, offset) {
    const { x, y, width, depth, cutoutWidth, cutoutDepth } = this.properties;
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // Draw L-shape using path
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + depth);
    ctx.lineTo(x + width - cutoutWidth, y + depth);
    ctx.lineTo(x + width - cutoutWidth, y + depth - cutoutDepth);
    ctx.lineTo(x, y + depth - cutoutDepth);
    ctx.closePath();
    
    ctx.fillStyle = this.selected ? '#a3c2e8' : '#d1e0f3';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    
    // Draw dimensions
    this.drawDimensions(ctx, scale);
    
    ctx.restore();
  }
  
  contains(point) {
    const { x, y, width, depth, cutoutWidth, cutoutDepth } = this.properties;
    
    // Check if point is in the main rectangle
    if (point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + depth) {
      // Check if point is NOT in the cutout rectangle
      if (point.x >= x + width - cutoutWidth && point.x <= x + width && 
          point.y >= y + depth - cutoutDepth && point.y <= y + depth) {
        return false;
      }
      return true;
    }
    return false;
  }
  
  getArea() {
    const { width, depth, cutoutWidth, cutoutDepth } = this.properties;
    return (width * depth) - (cutoutWidth * cutoutDepth);
  }
  
  getBoundingBox() {
    const { x, y, width, depth } = this.properties;
    return { x, y, width, depth };
  }
  
  drawDimensions(ctx, scale) {
    const { x, y, width, depth, cutoutWidth, cutoutDepth } = this.properties;
    const padding = 10 / scale;
    const fontSize = 14 / scale;
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Width dimension
    ctx.fillText(`${Math.round(width)}px`, x + width / 2, y - padding);
    
    // Depth dimension
    ctx.save();
    ctx.translate(x - padding, y + (depth - cutoutDepth) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${Math.round(depth - cutoutDepth)}px`, 0, 0);
    ctx.restore();
    
    // Cutout width dimension
    ctx.fillText(`${Math.round(cutoutWidth)}px`, x + width - cutoutWidth / 2, y + depth + padding);
    
    // Cutout depth dimension
    ctx.save();
    ctx.translate(x + width + padding, y + depth - cutoutDepth / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${Math.round(cutoutDepth)}px`, 0, 0);
    ctx.restore();
  }
  
  clone() {
    return new LShape(
      this.properties.x,
      this.properties.y,
      this.properties.width,
      this.properties.depth,
      this.properties.cutoutWidth,
      this.properties.cutoutDepth
    );
  }
}

class UShape extends Shape {
  constructor(x, y, width, depth, leftCutoutWidth, rightCutoutWidth, cutoutDepth) {
    super('U-shape', { 
      x, y, width, depth, 
      leftCutoutWidth, rightCutoutWidth, cutoutDepth 
    });
  }
  
  draw(ctx, scale, offset) {
    const { 
      x, y, width, depth, 
      leftCutoutWidth, rightCutoutWidth, cutoutDepth 
    } = this.properties;
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // Draw U-shape using path
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + depth);
    ctx.lineTo(x, y + depth);
    ctx.lineTo(x, y + depth - cutoutDepth);
    ctx.lineTo(x + leftCutoutWidth, y + depth - cutoutDepth);
    ctx.lineTo(x + leftCutoutWidth, y + depth - 2);
    ctx.lineTo(x + width - rightCutoutWidth, y + depth - 2);
    ctx.lineTo(x + width - rightCutoutWidth, y + depth - cutoutDepth);
    ctx.lineTo(x + width, y + depth - cutoutDepth);
    ctx.lineTo(x + width, y);
    ctx.closePath();
    
    ctx.fillStyle = this.selected ? '#a3c2e8' : '#d1e0f3';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    
    // Draw dimensions
    this.drawDimensions(ctx, scale);
    
    ctx.restore();
  }
  
  contains(point) {
    const { 
      x, y, width, depth, 
      leftCutoutWidth, rightCutoutWidth, cutoutDepth 
    } = this.properties;
    
    // Check if point is in the main rectangle
    if (point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + depth) {
      // Check if point is NOT in the cutout rectangle
      if (point.x >= x + leftCutoutWidth && point.x <= x + width - rightCutoutWidth && 
          point.y >= y + depth - cutoutDepth && point.y <= y + depth) {
        return false;
      }
      return true;
    }
    return false;
  }
  
  getArea() {
    const { 
      width, depth, 
      leftCutoutWidth, rightCutoutWidth, cutoutDepth 
    } = this.properties;
    
    const cutoutWidth = width - leftCutoutWidth - rightCutoutWidth;
    return (width * depth) - (cutoutWidth * cutoutDepth);
  }
  
  getBoundingBox() {
    const { x, y, width, depth } = this.properties;
    return { x, y, width, depth };
  }
  
  drawDimensions(ctx, scale) {
    const { 
      x, y, width, depth, 
      leftCutoutWidth, rightCutoutWidth, cutoutDepth 
    } = this.properties;
    
    const padding = 10 / scale;
    const fontSize = 14 / scale;
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Width dimension
    ctx.fillText(`${Math.round(width)}px`, x + width / 2, y - padding);
    
    // Left section width
    ctx.fillText(`${Math.round(leftCutoutWidth)}px`, x + leftCutoutWidth / 2, y + depth - cutoutDepth / 2);
    
    // Middle cutout width
    ctx.fillText(`${Math.round(width - leftCutoutWidth - rightCutoutWidth)}px`, 
      x + leftCutoutWidth + (width - leftCutoutWidth - rightCutoutWidth) / 2, 
      y + depth + padding);
    
    // Right section width
    ctx.fillText(`${Math.round(rightCutoutWidth)}px`, 
      x + width - rightCutoutWidth / 2, 
      y + depth - cutoutDepth / 2);
    
    // Depth dimension
    ctx.save();
    ctx.translate(x - padding, y + depth / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${Math.round(depth)}px`, 0, 0);
    ctx.restore();
    
    // Cutout depth dimension
    ctx.save();
    ctx.translate(x + leftCutoutWidth + padding, y + depth - cutoutDepth / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${Math.round(cutoutDepth)}px`, 0, 0);
    ctx.restore();
  }
  
  clone() {
    return new UShape(
      this.properties.x,
      this.properties.y,
      this.properties.width,
      this.properties.depth,
      this.properties.leftCutoutWidth,
      this.properties.rightCutoutWidth,
      this.properties.cutoutDepth
    );
  }
}

class Island extends Shape {
  constructor(x, y, width, depth) {
    super('island', { x, y, width, depth });
  }
  
  draw(ctx, scale, offset) {
    const { x, y, width, depth } = this.properties;
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    ctx.beginPath();
    ctx.rect(x, y, width, depth);
    ctx.fillStyle = this.selected ? '#a3c2e8' : '#d1e0f3';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    
    // Add island indicator
    ctx.beginPath();
    ctx.moveTo(x + width / 4, y + depth / 2);
    ctx.lineTo(x + width * 3 / 4, y + depth / 2);
    ctx.moveTo(x + width / 2, y + depth / 4);
    ctx.lineTo(x + width / 2, y + depth * 3 / 4);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
    
    // Draw dimensions
    this.drawDimensions(ctx, scale);
    
    ctx.restore();
  }
  
  contains(point) {
    const { x, y, width, depth } = this.properties;
    return (
      point.x >= x && 
      point.x <= x + width && 
      point.y >= y && 
      point.y <= y + depth
    );
  }
  
  getArea() {
    return this.properties.width * this.properties.depth;
  }
  
  getBoundingBox() {
    const { x, y, width, depth } = this.properties;
    return { x, y, width, depth };
  }
  
  drawDimensions(ctx, scale) {
    const { x, y, width, depth } = this.properties;
    const padding = 10 / scale;
    const fontSize = 14 / scale;
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Width dimension
    ctx.fillText(`${Math.round(width)}px`, x + width / 2, y - padding);
    
    // Depth dimension
    ctx.save();
    ctx.translate(x - padding, y + depth / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${Math.round(depth)}px`, 0, 0);
    ctx.restore();
  }
  
  clone() {
    return new Island(
      this.properties.x,
      this.properties.y,
      this.properties.width,
      this.properties.depth
    );
  }
}

class CustomShape extends Shape {
  constructor(points) {
    super('custom', { points: points || [] });
  }
  
  draw(ctx, scale, offset) {
    const { points } = this.properties;
    
    if (points.length < 3) return;
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.closePath();
    ctx.fillStyle = this.selected ? '#a3c2e8' : '#d1e0f3';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    
    ctx.restore();
  }
  
  contains(point) {
    const { points } = this.properties;
    
    if (points.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  }
  
  getArea() {
    const { points } = this.properties;
    
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    return Math.abs(area / 2);
  }
  
  getBoundingBox() {
    const { points } = this.properties;
    
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    
    for (let i = 1; i < points.length; i++) {
      minX = Math.min(minX, points[i].x);
      minY = Math.min(minY, points[i].y);
      maxX = Math.max(maxX, points[i].x);
      maxY = Math.max(maxY, points[i].y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  clone() {
    return new CustomShape(
      JSON.parse(JSON.stringify(this.properties.points))
    );
  }
}

class DrawingTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = false;
    this.startPoint = null;
    this.currentPoint = null;
  }
  
  activate() {
    this.active = true;
  }
  
  deactivate() {
    this.active = false;
    this.startPoint = null;
    this.currentPoint = null;
  }
  
  handleMouseDown(event) {
    if (!this.active) return;
    
    this.startPoint = this.canvas.getCanvasPoint(event);
  }
  
  handleMouseMove(event) {
    if (!this.active || !this.startPoint) return;
    
    this.currentPoint = this.canvas.getCanvasPoint(event);
    this.canvas.render();
  }
  
  handleMouseUp(event) {
    if (!this.active || !this.startPoint) return;
    
    const endPoint = this.canvas.getCanvasPoint(event);
    this.complete(endPoint);
    
    this.startPoint = null;
    this.currentPoint = null;
    this.canvas.render();
  }
  
  complete(endPoint) {
    // To be implemented by subclasses
    console.warn('Complete method not implemented for base DrawingTool class');
  }
  
  drawPreview(ctx) {
    // To be implemented by subclasses
    console.warn('DrawPreview method not implemented for base DrawingTool class');
  }
}

class RectangleTool extends DrawingTool {
  complete(endPoint) {
    const x = Math.min(this.startPoint.x, endPoint.x);
    const y = Math.min(this.startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - this.startPoint.x);
    const depth = Math.abs(endPoint.y - this.startPoint.y);
    
    if (width > 10 && depth > 10) {
      const rectangle = new Rectangle(x, y, width, depth);
      this.canvas.addShape(rectangle);
    }
  }
  
  drawPreview(ctx) {
    if (!this.startPoint || !this.currentPoint) return;
    
    const x = Math.min(this.startPoint.x, this.currentPoint.x);
    const y = Math.min(this.startPoint.y, this.currentPoint.y);
    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const depth = Math.abs(this.currentPoint.y - this.startPoint.y);
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, depth);
    ctx.fillStyle = 'rgba(209, 224, 243, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    
    // Draw dimensions
    if (width > 30 && depth > 30) {
      const padding = 10;
      const fontSize = 14;
      
      ctx.fillStyle = '#2c3e50';
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.setLineDash([]);
      
      // Width dimension
      ctx.fillText(`${Math.round(width)}px`, x + width / 2, y - padding);
      
      // Depth dimension
      ctx.save();
      ctx.translate(x - padding, y + depth / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${Math.round(depth)}px`, 0, 0);
      ctx.restore();
    }
    
    ctx.restore();
  }
}

class LShapeTool extends DrawingTool {
  complete(endPoint) {
    const x = Math.min(this.startPoint.x, endPoint.x);
    const y = Math.min(this.startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - this.startPoint.x);
    const depth = Math.abs(endPoint.y - this.startPoint.y);
    
    if (width > 20 && depth > 20) {
      // Default cutout is 1/3 of the total size
      const cutoutWidth = width / 3;
      const cutoutDepth = depth / 3;
      
      const lShape = new LShape(x, y, width, depth, cutoutWidth, cutoutDepth);
      this.canvas.addShape(lShape);
    }
  }
  
  drawPreview(ctx) {
    if (!this.startPoint || !this.currentPoint) return;
    
    const x = Math.min(this.startPoint.x, this.currentPoint.x);
    const y = Math.min(this.startPoint.y, this.currentPoint.y);
    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const depth = Math.abs(this.currentPoint.y - this.startPoint.y);
    
    if (width < 20 || depth < 20) return;
    
    // Default cutout is 1/3 of the total size
    const cutoutWidth = width / 3;
    const cutoutDepth = depth / 3;
    
    ctx.save();
    
    // Draw L-shape using path
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + depth);
    ctx.lineTo(x + width - cutoutWidth, y + depth);
    ctx.lineTo(x + width - cutoutWidth, y + depth - cutoutDepth);
    ctx.lineTo(x, y + depth - cutoutDepth);
    ctx.closePath();
    
    ctx.fillStyle = 'rgba(209, 224, 243, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    
    ctx.restore();
  }
}

class UShapeTool extends DrawingTool {
  complete(endPoint) {
    const x = Math.min(this.startPoint.x, endPoint.x);
    const y = Math.min(this.startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - this.startPoint.x);
    const depth = Math.abs(endPoint.y - this.startPoint.y);
    
    if (width > 30 && depth > 30) {
      // Default cutouts
      const leftCutoutWidth = width / 4;
      const rightCutoutWidth = width / 4;
      const cutoutDepth = depth / 3;
      
      const uShape = new UShape(
        x, y, width, depth, 
        leftCutoutWidth, rightCutoutWidth, cutoutDepth
      );
      this.canvas.addShape(uShape);
    }
  }
  
  drawPreview(ctx) {
    if (!this.startPoint || !this.currentPoint) return;
    
    const x = Math.min(this.startPoint.x, this.currentPoint.x);
    const y = Math.min(this.startPoint.y, this.currentPoint.y);
    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const depth = Math.abs(this.currentPoint.y - this.startPoint.y);
    
    if (width < 30 || depth < 30) return;
    
    // Default cutouts
    const leftCutoutWidth = width / 4;
    const rightCutoutWidth = width / 4;
    const cutoutDepth = depth / 3;
    
    ctx.save();
    
    // Draw U-shape using path
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + depth);
    ctx.lineTo(x, y + depth);
    ctx.lineTo(x, y + depth - cutoutDepth);
    ctx.lineTo(x + leftCutoutWidth, y + depth - cutoutDepth);
    ctx.lineTo(x + leftCutoutWidth, y + depth - 2);
    ctx.lineTo(x + width - rightCutoutWidth, y + depth - 2);
    ctx.lineTo(x + width - rightCutoutWidth, y + depth - cutoutDepth);
    ctx.lineTo(x + width, y + depth - cutoutDepth);
    ctx.lineTo(x + width, y);
    ctx.closePath();
    
    ctx.fillStyle = 'rgba(209, 224, 243, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    
    ctx.restore();
  }
}

class IslandTool extends DrawingTool {
  complete(endPoint) {
    const x = Math.min(this.startPoint.x, endPoint.x);
    const y = Math.min(this.startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - this.startPoint.x);
    const depth = Math.abs(endPoint.y - this.startPoint.y);
    
    if (width > 10 && depth > 10) {
      const island = new Island(x, y, width, depth);
      this.canvas.addShape(island);
    }
  }
  
  drawPreview(ctx) {
    if (!this.startPoint || !this.currentPoint) return;
    
    const x = Math.min(this.startPoint.x, this.currentPoint.x);
    const y = Math.min(this.startPoint.y, this.currentPoint.y);
    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const depth = Math.abs(this.currentPoint.y - this.startPoint.y);
    
    ctx.save();
    
    // Draw rectangle
    ctx.beginPath();
    ctx.rect(x, y, width, depth);
    ctx.fillStyle = 'rgba(209, 224, 243, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    
    // Add island indicator
    if (width > 30 && depth > 30) {
      ctx.beginPath();
      ctx.moveTo(x + width / 4, y + depth / 2);
      ctx.lineTo(x + width * 3 / 4, y + depth / 2);
      ctx.moveTo(x + width / 2, y + depth / 4);
      ctx.lineTo(x + width / 2, y + depth * 3 / 4);
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

class FreehandTool extends DrawingTool {
  constructor(canvas) {
    super(canvas);
    this.points = [];
    this.minDistance = 10; // Minimum distance between points
  }
  
  handleMouseDown(event) {
    if (!this.active) return;
    
    this.startPoint = this.canvas.getCanvasPoint(event);
    this.points = [this.startPoint];
  }
  
  handleMouseMove(event) {
    if (!this.active || !this.startPoint) return;
    
    this.currentPoint = this.canvas.getCanvasPoint(event);
    
    // Add point if it's far enough from the last point
    const lastPoint = this.points[this.points.length - 1];
    const dx = this.currentPoint.x - lastPoint.x;
    const dy = this.currentPoint.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance >= this.minDistance) {
      this.points.push(this.currentPoint);
    }
    
    this.canvas.render();
  }
  
  complete(endPoint) {
    if (this.points.length < 3) return;
    
    // Simplify the points to reduce complexity
    const simplifiedPoints = this.simplifyPoints(this.points, 5);
    
    if (simplifiedPoints.length >= 3) {
      const customShape = new CustomShape(simplifiedPoints);
      this.canvas.addShape(customShape);
    }
  }
  
  drawPreview(ctx) {
    if (this.points.length < 2) return;
    
    ctx.save();
    
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    
    if (this.currentPoint && this.points.length > 0) {
      ctx.lineTo(this.currentPoint.x, this.currentPoint.y);
    }
    
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    
    ctx.restore();
  }
  
  simplifyPoints(points, tolerance) {
    if (points.length <= 2) return points;
    
    // Douglas-Peucker algorithm
    const findPerpendicularDistance = (p, p1, p2) => {
      const slope = (p2.y - p1.y) / (p2.x - p1.x);
      const intercept = p1.y - (slope * p1.x);
      
      if (isFinite(slope)) {
        // For non-vertical lines
        const a = -slope;
        const b = 1;
        const c = -intercept;
        return Math.abs(a * p.x + b * p.y + c) / Math.sqrt(a * a + b * b);
      } else {
        // For vertical lines
        return Math.abs(p.x - p1.x);
      }
    };
    
    const douglasPeucker = (points, startIndex, endIndex, tolerance) => {
      if (endIndex <= startIndex + 1) {
        return;
      }
      
      let maxDistance = 0;
      let maxIndex = 0;
      
      const startPoint = points[startIndex];
      const endPoint = points[endIndex];
      
      for (let i = startIndex + 1; i < endIndex; i++) {
        const distance = findPerpendicularDistance(points[i], startPoint, endPoint);
        
        if (distance > maxDistance) {
          maxDistance = distance;
          maxIndex = i;
        }
      }
      
      if (maxDistance > tolerance) {
        // Recursively simplify the two segments
        douglasPeucker(points, startIndex, maxIndex, tolerance);
        douglasPeucker(points, maxIndex, endIndex, tolerance);
      } else {
        // Mark points between start and end for removal
        for (let i = startIndex + 1; i < endIndex; i++) {
          points[i].remove = true;
        }
      }
    };
    
    // Clone points to avoid modifying the original array
    const workingPoints = points.map(p => ({ x: p.x, y: p.y, remove: false }));
    
    // Apply Douglas-Peucker algorithm
    douglasPeucker(workingPoints, 0, workingPoints.length - 1, tolerance);
    
    // Filter out points marked for removal
    return workingPoints.filter(p => !p.remove);
  }
}

class SelectionTool extends DrawingTool {
  constructor(canvas) {
    super(canvas);
    this.selectedShape = null;
    this.dragOffset = { x: 0, y: 0 };
    this.isDragging = false;
  }
  
  handleMouseDown(event) {
    if (!this.active) return;
    
    this.startPoint = this.canvas.getCanvasPoint(event);
    
    // Check if clicked on a shape
    const clickedShape = this.canvas.findShapeAt(this.startPoint);
    
    if (clickedShape) {
      this.selectedShape = clickedShape;
      this.canvas.selectShape(clickedShape);
      
      // Calculate drag offset
      this.dragOffset = {
        x: this.startPoint.x - clickedShape.properties.x,
        y: this.startPoint.y - clickedShape.properties.y
      };
      
      this.isDragging = true;
    } else {
      this.canvas.deselectShape();
      this.selectedShape = null;
      this.isDragging = false;
    }
  }
  
  handleMouseMove(event) {
    if (!this.active || !this.isDragging || !this.selectedShape) return;
    
    this.currentPoint = this.canvas.getCanvasPoint(event);
    
    // Update shape position
    this.selectedShape.properties.x = this.currentPoint.x - this.dragOffset.x;
    this.selectedShape.properties.y = this.currentPoint.y - this.dragOffset.y;
    
    this.canvas.render();
  }
  
  handleMouseUp(event) {
    if (!this.active || !this.isDragging) return;
    
    this.isDragging = false;
    
    if (this.selectedShape) {
      this.canvas.saveState();
    }
  }
  
  drawPreview(ctx) {
    // No preview needed for selection tool
  }
}

class MeasurementManager {
  constructor(canvas, unitSystem = 'imperial') {
    this.canvas = canvas;
    this.unitSystem = unitSystem; // 'imperial' or 'metric'
    this.pixelsPerInch = 10; // Default scale: 10 pixels = 1 inch
  }
  
  setUnitSystem(system) {
    this.unitSystem = system;
  }
  
  setScale(pixelsPerInch) {
    this.pixelsPerInch = pixelsPerInch;
  }
  
  pixelsToInches(pixels) {
    return pixels / this.pixelsPerInch;
  }
  
  inchesToPixels(inches) {
    return inches * this.pixelsPerInch;
  }
  
  formatMeasurement(inches) {
    if (this.unitSystem === 'imperial') {
      const feet = Math.floor(inches / 12);
      const remainingInches = Math.round(inches % 12 * 10) / 10;
      
      if (feet > 0) {
        return `${feet}' ${remainingInches}"`;
      } else {
        return `${remainingInches}"`;
      }
    } else {
      // Convert to centimeters for metric
      const cm = Math.round(inches * 2.54 * 10) / 10;
      return `${cm} cm`;
    }
  }
  
  calculateArea(shape) {
    const areaInSquarePixels = shape.getArea();
    const areaInSquareInches = this.pixelsToInches(Math.sqrt(areaInSquarePixels)) ** 2;
    
    if (this.unitSystem === 'imperial') {
      const areaInSquareFeet = areaInSquareInches / 144;
      return {
        value: areaInSquareFeet,
        formatted: `${Math.round(areaInSquareFeet * 100) / 100} sq ft`
      };
    } else {
      const areaInSquareMeters = areaInSquareInches * 0.00064516;
      return {
        value: areaInSquareMeters,
        formatted: `${Math.round(areaInSquareMeters * 100) / 100} m²`
      };
    }
  }
  
  calculateTotalArea() {
    let totalArea = 0;
    
    this.canvas.shapes.forEach(shape => {
      totalArea += this.calculateArea(shape).value;
    });
    
    return {
      value: totalArea,
      formatted: this.unitSystem === 'imperial' 
        ? `${Math.round(totalArea * 100) / 100} sq ft`
        : `${Math.round(totalArea * 100) / 100} m²`
    };
  }
}

class DrawingManager {
  constructor(canvasElement, options = {}) {
    this.canvas = new DrawingCanvas(canvasElement, options);
    this.measurementManager = new MeasurementManager(this.canvas, options.unitSystem);
    
    // Register tools
    this.registerTools();
    
    // Set default tool
    this.setActiveTool('rectangle');
  }
  
  registerTools() {
    // Create tools
    const rectangleTool = new RectangleTool(this.canvas);
    const lShapeTool = new LShapeTool(this.canvas);
    const uShapeTool = new UShapeTool(this.canvas);
    const islandTool = new IslandTool(this.canvas);
    const freehandTool = new FreehandTool(this.canvas);
    const selectionTool = new SelectionTool(this.canvas);
    
    // Register tools with canvas
    this.canvas.registerTool('rectangle', rectangleTool);
    this.canvas.registerTool('l-shape', lShapeTool);
    this.canvas.registerTool('u-shape', uShapeTool);
    this.canvas.registerTool('island', islandTool);
    this.canvas.registerTool('freehand', freehandTool);
    this.canvas.registerTool('selection', selectionTool);
  }
  
  setActiveTool(toolName) {
    this.canvas.setActiveTool(toolName);
  }
  
  undo() {
    this.canvas.undo();
  }
  
  redo() {
    this.canvas.redo();
  }
  
  clear() {
    this.canvas.clearShapes();
  }
  
  setUnitSystem(system) {
    this.measurementManager.setUnitSystem(system);
    this.canvas.render();
  }
  
  setScale(pixelsPerInch) {
    this.measurementManager.setScale(pixelsPerInch);
    this.canvas.render();
  }
  
  calculateTotalArea() {
    return this.measurementManager.calculateTotalArea();
  }
  
  exportDrawing() {
    return this.canvas.exportToJSON();
  }
  
  importDrawing(json) {
    return this.canvas.importFromJSON(json);
  }
}

// Export the module
export {
  DrawingManager,
  Shape,
  Rectangle,
  LShape,
  UShape,
  Island,
  CustomShape
};
