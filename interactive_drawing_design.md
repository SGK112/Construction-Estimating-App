# Interactive Layout Drawing Feature Design

## Overview
This document outlines the design for an enhanced interactive layout drawing feature for the Construction Estimator app. The feature will allow customers to draw their own countertop layouts directly on screen, providing a more intuitive and user-friendly experience.

## Core Requirements
1. Allow users to draw custom countertop layouts on screen
2. Fix visualization issues from previous versions
3. Provide accurate measurements and cost estimates based on drawn layouts
4. Support both desktop and mobile interactions
5. Include clear instructions and visual feedback
6. Integrate seamlessly with existing estimation logic

## User Interface Components

### Drawing Canvas
- **HTML5 Canvas Element**: Provides the foundation for drawing functionality
- **Responsive Sizing**: Automatically adjusts to screen size and orientation
- **Grid System**: Optional grid overlay for precision drawing
- **Zoom and Pan Controls**: Allow users to navigate larger layouts

### Drawing Tools
1. **Freeform Drawing Tool**: For custom shapes and curves
2. **Shape Tools**:
   - Rectangle tool for standard countertops
   - L-shape tool for corner countertops
   - U-shape tool for U-shaped kitchens
   - Island tool for kitchen islands
3. **Selection Tool**: For selecting and modifying existing shapes
4. **Eraser Tool**: For removing parts of the drawing
5. **Measurement Tool**: For adding dimension lines

### Control Panel
- **Tool Selection**: Icons for selecting different drawing tools
- **Property Controls**: For adjusting properties of selected elements
  - Width/depth inputs with validation
  - Edge type selection
  - Material thickness options
- **Undo/Redo Buttons**: For correcting mistakes
- **Clear Canvas Button**: For starting over
- **Save Layout Button**: For saving the current design

### Measurement and Annotation
- **Automatic Dimensioning**: Show measurements as shapes are drawn
- **Manual Dimension Lines**: Allow users to add custom dimension lines
- **Area Calculation**: Automatically calculate square footage
- **Annotation Tool**: For adding notes to specific areas

## Technical Implementation

### Canvas Management
```javascript
class DrawingCanvas {
  constructor(canvasElement, options) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.width = options.width || window.innerWidth;
    this.height = options.height || window.innerHeight;
    this.scale = options.scale || 1;
    this.offset = options.offset || { x: 0, y: 0 };
    this.gridSize = options.gridSize || 20;
    this.showGrid = options.showGrid || true;
    
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
  }
  
  // Event handlers and drawing methods...
  
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
}
```

### Shape Management
```javascript
class Shape {
  constructor(type, properties) {
    this.type = type; // 'rectangle', 'L-shape', 'U-shape', 'island', 'custom'
    this.properties = properties;
    this.selected = false;
  }
  
  draw(ctx, scale, offset) {
    // Drawing logic based on shape type
  }
  
  contains(point) {
    // Hit testing logic
    return false;
  }
  
  getArea() {
    // Calculate area based on shape type and properties
    return 0;
  }
  
  getBoundingBox() {
    // Return bounding box for selection
    return { x: 0, y: 0, width: 0, height: 0 };
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
    // Draw dimension lines and measurements
  }
}

// Similar classes for L-shape, U-shape, Island, and Custom shapes
```

### Drawing Tools
```javascript
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
  }
  
  drawPreview(ctx) {
    // To be implemented by subclasses
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
    ctx.restore();
    
    // Draw dimensions
    this.drawPreviewDimensions(ctx, x, y, width, depth);
  }
  
  drawPreviewDimensions(ctx, x, y, width, depth) {
    // Draw dimension lines and measurements for preview
  }
}

// Similar classes for other tools: LShapeTool, UShapeTool, IslandTool, etc.
```

### Measurement and Estimation Integration
```javascript
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

class EstimationIntegrator {
  constructor(drawingManager, pricingData) {
    this.drawingManager = drawingManager;
    this.pricingData = pricingData;
    this.selectedMaterial = null;
    this.selectedEdgeType = null;
    this.selectedThickness = null;
    this.additionalOptions = {
      backsplash: false,
      backsplashHeight: 4, // inches
      demolition: false,
      waterfallEdge: false,
      waterfallSides: []
    };
  }
  
  setMaterial(materialId) {
    this.selectedMaterial = this.pricingData.materials.find(m => m.id === materialId);
  }
  
  setEdgeType(edgeType) {
    this.selectedEdgeType = edgeType;
  }
  
  setThickness(thickness) {
    this.selectedThickness = thickness;
  }
  
  setAdditionalOption(option, value) {
    this.additionalOptions[option] = value;
  }
  
  calculateEstimate() {
    if (!this.selectedMaterial || !this.selectedThickness) {
      return null;
    }
    
    const area = this.drawingManager.measurementManager.calculateTotalArea().value;
    
    // Base material cost
    let materialCost = area * this.selectedMaterial.pricePerSqFt;
    
    // Edge cost
    const perimeter = this.calculatePerimeter();
    let edgeCost = 0;
    
    if (this.selectedEdgeType && this.selectedEdgeType !== 'standard') {
      const edgePricing = this.pricingData.edges.find(e => e.type === this.selectedEdgeType);
      if (edgePricing) {
        edgeCost = perimeter * edgePricing.pricePerLinearFt;
      }
    }
    
    // Additional options
    let additionalCost = 0;
    
    if (this.additionalOptions.backsplash) {
      const backsplashArea = (perimeter * this.additionalOptions.backsplashHeight) / 144; // Convert to sq ft
      additionalCost += backsplashArea * this.selectedMaterial.pricePerSqFt;
    }
    
    if (this.additionalOptions.demolition) {
      additionalCost += area * this.pricingData.labor.demolition.pricePerSqFt;
    }
    
    if (this.additionalOptions.waterfallEdge && this.additionalOptions.waterfallSides.length > 0) {
      // Calculate waterfall edge area and cost
      // This is a simplified calculation
      const waterfallArea = this.calculateWaterfallArea();
      additionalCost += waterfallArea * this.selectedMaterial.pricePerSqFt;
    }
    
    // Labor cost
    const laborCost = area * this.pricingData.labor.installation.pricePerSqFt;
    
    // Total cost
    const totalCost = materialCost + edgeCost + additionalCost + laborCost;
    
    return {
      area,
      perimeter,
      materialCost,
      edgeCost,
      additionalCost,
      laborCost,
      totalCost,
      breakdown: {
        material: {
          name: this.selectedMaterial.name,
          area: area,
          pricePerSqFt: this.selectedMaterial.pricePerSqFt,
          cost: materialCost
        },
        edge: {
          type: this.selectedEdgeType,
          length: perimeter,
          pricePerLinearFt: this.selectedEdgeType !== 'standard' 
            ? this.pricingData.edges.find(e => e.type === this.selectedEdgeType).pricePerLinearFt 
            : 0,
          cost: edgeCost
        },
        additionalOptions: {
          backsplash: this.additionalOptions.backsplash,
          demolition: this.additionalOptions.demolition,
          waterfallEdge: this.additionalOptions.waterfallEdge,
          cost: additionalCost
        },
        labor: {
          area: area,
          pricePerSqFt: this.pricingData.labor.installation.pricePerSqFt,
          cost: laborCost
        }
      }
    };
  }
  
  calculatePerimeter() {
    // Calculate total perimeter of all shapes
    // This is a simplified calculation
    let totalPerimeter = 0;
    
    this.drawingManager.canvas.shapes.forEach(shape => {
      if (shape.type === 'rectangle') {
        const { width, depth } = shape.properties;
        totalPerimeter += 2 * (width + depth);
      } else if (shape.type === 'L-shape') {
        // L-shape perimeter calculation
      } else if (shape.type === 'U-shape') {
        // U-shape perimeter calculation
      } else if (shape.type === 'island') {
        // Island perimeter calculation
      } else {
        // Custom shape perimeter calculation
      }
    });
    
    return this.drawingManager.measurementManager.pixelsToInches(totalPerimeter) / 12; // Convert to feet
  }
  
  calculateWaterfallArea() {
    // Calculate waterfall edge area
    // This is a simplified calculation
    let waterfallArea = 0;
    
    // Implementation details...
    
    return waterfallArea;
  }
}
```

## User Experience Enhancements

### Loading Screen
- Animated logo or progress indicator
- Clear messaging about what's loading
- Tips or instructions displayed during loading

### Instructions
- Interactive tutorial for first-time users
- Tooltips for each tool and control
- Contextual help based on current action
- Video tutorial option

### Visual Feedback
- Highlighting of selected elements
- Snapping indicators for alignment
- Real-time measurement display
- Color coding for different countertop sections
- Visual confirmation for successful actions

## Mobile Considerations
- Touch-optimized controls with larger hit areas
- Gesture support:
  - Pinch to zoom
  - Two-finger pan
  - Double-tap to select
- Simplified interface for smaller screens
- Portrait and landscape orientation support
- Optimized performance for mobile devices

## Integration Points

### CSV Data Integration
- Connect with existing CSV ingestion module
- Use material pricing from CSV for real-time estimates
- Apply labor costs from CSV to calculations

### API Connections
- Connect to server endpoints for data retrieval
- Implement robust fallback mechanisms for offline use
- Cache pricing data for performance

### Estimation Logic
- Integrate drawing measurements with pricing calculations
- Update estimates in real-time as layout changes
- Support for multiple countertop sections and materials

## Implementation Phases

### Phase 1: Core Drawing Functionality
- Canvas setup and basic drawing tools
- Shape creation and manipulation
- Measurement system

### Phase 2: User Experience Enhancements
- Instructions and tooltips
- Loading screen
- Visual feedback improvements

### Phase 3: Integration
- Connect with CSV data
- Implement estimation logic
- API connections and fallback mechanisms

### Phase 4: Mobile Optimization
- Touch support
- Responsive design
- Performance optimization

### Phase 5: Testing and Validation
- Cross-browser testing
- Mobile device testing
- User feedback collection

## Conclusion
This interactive drawing feature will significantly enhance the Construction Estimator app by allowing customers to create custom layouts directly on screen. The intuitive interface, clear instructions, and real-time feedback will improve user experience while maintaining accurate estimation capabilities.
