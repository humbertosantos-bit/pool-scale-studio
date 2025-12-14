import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Line, Circle, Polygon, Text, Group, Point } from 'fabric';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2, Redo2, Grid3X3, Magnet, RotateCcw } from 'lucide-react';

interface ManualTracingCanvasProps {
  onStateChange?: (state: any) => void;
}

type DrawingMode = 'none' | 'property' | 'house' | 'scale' | 'pool';

interface DrawnShape {
  id: string;
  type: 'property' | 'house';
  points: { x: number; y: number }[];
  fabricObject?: Polygon;
}

interface UndoAction {
  type: 'add_point' | 'complete_shape' | 'move_vertex';
  data: any;
}

export const ManualTracingCanvas: React.FC<ManualTracingCanvasProps> = ({ onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  
  // Drawing state
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [propertyShape, setPropertyShape] = useState<DrawnShape | null>(null);
  const [houseShapes, setHouseShapes] = useState<DrawnShape[]>([]);
  
  // Scale state
  const [scaleReference, setScaleReference] = useState<{ length: number; pixelLength: number } | null>(null);
  const [scaleUnit, setScaleUnit] = useState<'feet' | 'meters'>('feet');
  const [isScaled, setIsScaled] = useState(false);
  
  // Drawing helpers
  const [previewLine, setPreviewLine] = useState<Line | null>(null);
  const [vertexMarkers, setVertexMarkers] = useState<Circle[]>([]);
  const [drawnLines, setDrawnLines] = useState<Line[]>([]);
  
  // Snapping options
  const [gridSnapping, setGridSnapping] = useState(false);
  const [angleSnapping, setAngleSnapping] = useState(false);
  const [vertexSnapping, setVertexSnapping] = useState(true);
  
  // Undo/Redo
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  
  // Refs for event handlers
  const drawingModeRef = useRef<DrawingMode>('none');
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const previewLineRef = useRef<Line | null>(null);
  const propertyShapeRef = useRef<DrawnShape | null>(null);

  // Grid settings
  const GRID_SIZE = 20;
  const SNAP_DISTANCE = 10;
  const CLOSE_DISTANCE = 15;

  // Create arrow cursor
  const createArrowCursor = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path d="M0 0 L0 16 L4 12 L7 19 L9 18 L6 11 L12 11 Z" fill="#000000" stroke="#ffffff" stroke-width="1"/>
    </svg>`;
    const encoded = encodeURIComponent(svg);
    return `url('data:image/svg+xml,${encoded}') 0 0, default`;
  };

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: '#f8fafc',
      selection: false,
    });

    // Draw subtle grid
    drawGrid(canvas, container.clientWidth, container.clientHeight);
    
    setFabricCanvas(canvas);

    const handleResize = () => {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      drawGrid(canvas, container.clientWidth, container.clientHeight);
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Draw subtle grid
  const drawGrid = (canvas: FabricCanvas, width: number, height: number) => {
    // Remove old grid lines
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).isGrid) {
        canvas.remove(obj);
      }
    });

    // Draw new grid lines
    for (let x = 0; x <= width; x += GRID_SIZE) {
      const line = new Line([x, 0, x, height], {
        stroke: '#e2e8f0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      });
      (line as any).isGrid = true;
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }
    for (let y = 0; y <= height; y += GRID_SIZE) {
      const line = new Line([0, y, width, y], {
        stroke: '#e2e8f0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      });
      (line as any).isGrid = true;
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }
  };

  // Snap point to grid if enabled
  const snapToGrid = (point: { x: number; y: number }): { x: number; y: number } => {
    if (!gridSnapping) return point;
    return {
      x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
    };
  };

  // Snap to angle if enabled
  const snapToAngle = (point: { x: number; y: number }, lastPoint: { x: number; y: number }): { x: number; y: number } => {
    if (!angleSnapping || !lastPoint) return point;
    
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Snap to 45° increments
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    
    return {
      x: lastPoint.x + Math.cos(snapAngle) * distance,
      y: lastPoint.y + Math.sin(snapAngle) * distance,
    };
  };

  // Snap to existing vertex if enabled
  const snapToVertex = (point: { x: number; y: number }): { x: number; y: number } => {
    if (!vertexSnapping) return point;
    
    const allPoints: { x: number; y: number }[] = [];
    if (propertyShapeRef.current) {
      allPoints.push(...propertyShapeRef.current.points);
    }
    houseShapes.forEach(house => allPoints.push(...house.points));
    
    for (const p of allPoints) {
      const dist = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
      if (dist < SNAP_DISTANCE) {
        return { x: p.x, y: p.y };
      }
    }
    
    return point;
  };

  // Apply all snapping
  const applySnapping = (point: { x: number; y: number }): { x: number; y: number } => {
    let snapped = point;
    
    const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
    if (lastPoint && angleSnapping) {
      snapped = snapToAngle(snapped, lastPoint);
    }
    
    snapped = snapToVertex(snapped);
    snapped = snapToGrid(snapped);
    
    return snapped;
  };

  // Check if point is close to first point (to close shape)
  const isCloseToFirstPoint = (point: { x: number; y: number }): boolean => {
    if (currentPointsRef.current.length < 3) return false;
    const first = currentPointsRef.current[0];
    const dist = Math.sqrt(Math.pow(first.x - point.x, 2) + Math.pow(first.y - point.y, 2));
    return dist < CLOSE_DISTANCE;
  };

  // Check if point is inside property
  const isPointInsideProperty = (point: { x: number; y: number }): boolean => {
    if (!propertyShapeRef.current) return false;
    const pts = propertyShapeRef.current.points;
    
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Start drawing mode
  const startDrawingMode = (mode: DrawingMode) => {
    if (!fabricCanvas) return;
    
    if (mode === 'house' && !propertyShapeRef.current) {
      toast.error('Please draw the property boundary first');
      return;
    }
    
    if (mode === 'house' && !isScaled) {
      toast.error('Please set the scale before drawing the house');
      return;
    }
    
    setDrawingMode(mode);
    drawingModeRef.current = mode;
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    const cursor = createArrowCursor();
    fabricCanvas.defaultCursor = cursor;
    fabricCanvas.hoverCursor = cursor;
    
    toast.info(mode === 'property' 
      ? 'Click to place vertices. Click near the first point to close the shape.'
      : 'Click to place vertices inside the property boundary.');
  };

  // Complete the current shape
  const completeShape = useCallback(() => {
    if (!fabricCanvas || currentPointsRef.current.length < 3) {
      toast.error('At least 3 points are required to create a shape');
      return;
    }

    const points = [...currentPointsRef.current];
    const mode = drawingModeRef.current;

    // Remove preview elements
    drawnLines.forEach(line => fabricCanvas.remove(line));
    vertexMarkers.forEach(marker => fabricCanvas.remove(marker));
    if (previewLineRef.current) {
      fabricCanvas.remove(previewLineRef.current);
      previewLineRef.current = null;
    }

    // Create polygon
    const fabricPoints = points.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: mode === 'property' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.2)',
      stroke: mode === 'property' ? '#22c55e' : '#3b82f6',
      strokeWidth: mode === 'property' ? 2 : 2,
      strokeDashArray: mode === 'property' ? [8, 4] : undefined,
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = mode;
    
    fabricCanvas.add(polygon);

    // Add vertex markers for editing
    const newMarkers: Circle[] = [];
    points.forEach((p, index) => {
      const marker = new Circle({
        left: p.x,
        top: p.y,
        radius: 5,
        fill: mode === 'property' ? '#22c55e' : '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: false,
        hasBorders: false,
      });
      (marker as any).vertexIndex = index;
      (marker as any).parentPolygon = polygon;
      (marker as any).parentPoints = points;
      (marker as any).shapeType = mode;
      
      fabricCanvas.add(marker);
      newMarkers.push(marker);
    });

    // Add edge length labels if scaled
    if (scaleReference) {
      addEdgeLengthLabels(fabricCanvas, points);
    }

    const shape: DrawnShape = {
      id: `${mode}-${Date.now()}`,
      type: mode as 'property' | 'house',
      points,
      fabricObject: polygon,
    };

    if (mode === 'property') {
      setPropertyShape(shape);
      propertyShapeRef.current = shape;
      toast.success('Property boundary drawn! Now set the scale.');
    } else if (mode === 'house') {
      setHouseShapes(prev => [...prev, shape]);
      toast.success('House footprint added!');
    }

    // Reset state
    setDrawingMode('none');
    drawingModeRef.current = 'none';
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setDrawnLines([]);
    setVertexMarkers([]);
    
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.hoverCursor = 'move';
    fabricCanvas.renderAll();

    // Push to undo stack
    setUndoStack(prev => [...prev, { type: 'complete_shape', data: shape }]);
    setRedoStack([]);
  }, [fabricCanvas, drawnLines, vertexMarkers, scaleReference]);

  // Add edge length labels
  const addEdgeLengthLabels = (canvas: FabricCanvas, points: { x: number; y: number }[]) => {
    if (!scaleReference) return;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const realDist = (pixelDist * scaleReference.length) / scaleReference.pixelLength;
      
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      let label: string;
      if (scaleUnit === 'feet') {
        const feet = Math.floor(realDist);
        const inches = Math.round((realDist - feet) * 12);
        label = `${feet}'${inches}"`;
      } else {
        label = `${realDist.toFixed(2)}m`;
      }

      const text = new Text(label, {
        left: midX,
        top: midY - 12,
        fontSize: 11,
        fill: '#374151',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      (text as any).isEdgeLabel = true;
      canvas.add(text);
    }
  };

  // Handle canvas mouse events
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      if (drawingModeRef.current === 'none') return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      let snappedPoint = applySnapping({ x: pointer.x, y: pointer.y });

      // Check if drawing house and point is outside property
      if (drawingModeRef.current === 'house' && !isPointInsideProperty(snappedPoint)) {
        toast.error('House must be drawn inside the property boundary');
        return;
      }

      // Check if closing shape
      if (isCloseToFirstPoint(snappedPoint)) {
        completeShape();
        return;
      }

      // Add point
      const newPoints = [...currentPointsRef.current, snappedPoint];
      currentPointsRef.current = newPoints;
      setCurrentPoints(newPoints);

      // Add vertex marker
      const marker = new Circle({
        left: snappedPoint.x,
        top: snappedPoint.y,
        radius: 4,
        fill: drawingModeRef.current === 'property' ? '#22c55e' : '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      fabricCanvas.add(marker);
      setVertexMarkers(prev => [...prev, marker]);

      // Add line from previous point
      if (newPoints.length > 1) {
        const prev = newPoints[newPoints.length - 2];
        const line = new Line([prev.x, prev.y, snappedPoint.x, snappedPoint.y], {
          stroke: drawingModeRef.current === 'property' ? '#22c55e' : '#3b82f6',
          strokeWidth: 2,
          strokeDashArray: drawingModeRef.current === 'property' ? [8, 4] : undefined,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(line);
        setDrawnLines(prev => [...prev, line]);
      }

      fabricCanvas.renderAll();

      // Push to undo stack
      setUndoStack(prev => [...prev, { type: 'add_point', data: snappedPoint }]);
      setRedoStack([]);
    };

    const handleMouseMove = (e: any) => {
      if (drawingModeRef.current === 'none' || currentPointsRef.current.length === 0) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      let snappedPoint = applySnapping({ x: pointer.x, y: pointer.y });
      
      const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];

      // Update or create preview line
      if (previewLineRef.current) {
        previewLineRef.current.set({
          x2: snappedPoint.x,
          y2: snappedPoint.y,
        });
      } else {
        const line = new Line([lastPoint.x, lastPoint.y, snappedPoint.x, snappedPoint.y], {
          stroke: drawingModeRef.current === 'property' ? '#22c55e' : '#3b82f6',
          strokeWidth: 1,
          strokeDashArray: [5, 3],
          selectable: false,
          evented: false,
          opacity: 0.7,
        });
        fabricCanvas.add(line);
        previewLineRef.current = line;
        setPreviewLine(line);
      }

      fabricCanvas.renderAll();
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
    };
  }, [fabricCanvas, completeShape, gridSnapping, angleSnapping, vertexSnapping]);

  // Start scale mode
  const startScaleMode = () => {
    if (!fabricCanvas || !propertyShapeRef.current) {
      toast.error('Please draw the property boundary first');
      return;
    }

    setDrawingMode('scale');
    drawingModeRef.current = 'scale';
    
    const cursor = createArrowCursor();
    fabricCanvas.defaultCursor = cursor;
    fabricCanvas.hoverCursor = cursor;
    
    let firstPoint: { x: number; y: number } | null = null;
    let scalePreviewLine: Line | null = null;
    let firstDot: Circle | null = null;

    const handleScaleMouseMove = (e: any) => {
      if (!firstPoint) return;
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      if (scalePreviewLine) {
        scalePreviewLine.set({ x2: pointer.x, y2: pointer.y });
      } else {
        scalePreviewLine = new Line([firstPoint.x, firstPoint.y, pointer.x, pointer.y], {
          stroke: '#ef4444',
          strokeWidth: 1,
          strokeDashArray: [5, 3],
          selectable: false,
          evented: false,
          opacity: 0.7,
        });
        fabricCanvas.add(scalePreviewLine);
      }
      fabricCanvas.renderAll();
    };

    const handleScaleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      if (!firstPoint) {
        firstPoint = { x: pointer.x, y: pointer.y };
        firstDot = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 3,
          fill: '#ef4444',
          stroke: '#ffffff',
          strokeWidth: 1,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(firstDot);
        fabricCanvas.renderAll();
        toast.info('Now click the second point');
      } else {
        const secondPoint = { x: pointer.x, y: pointer.y };
        const pixelLength = Math.sqrt(
          Math.pow(secondPoint.x - firstPoint.x, 2) + Math.pow(secondPoint.y - firstPoint.y, 2)
        );

        let realLength: number | null = null;
        
        if (scaleUnit === 'feet') {
          const feet = prompt('Enter feet:');
          const inches = prompt('Enter inches:');
          
          if (feet !== null && inches !== null) {
            const feetNum = parseFloat(feet) || 0;
            const inchesNum = parseFloat(inches) || 0;
            realLength = feetNum + inchesNum / 12;
          }
        } else {
          const meters = prompt('Enter the real-world length (in meters):');
          if (meters && !isNaN(Number(meters))) {
            realLength = Number(meters);
          }
        }

        if (realLength !== null && realLength > 0) {
          setScaleReference({ length: realLength, pixelLength });
          setIsScaled(true);
          toast.success('Scale set! All measurements will now use real-world units.');
          
          // Update edge labels for property
          if (propertyShapeRef.current) {
            // Remove old labels
            const objects = fabricCanvas.getObjects();
            objects.forEach(obj => {
              if ((obj as any).isEdgeLabel) {
                fabricCanvas.remove(obj);
              }
            });
            
            addEdgeLengthLabels(fabricCanvas, propertyShapeRef.current.points);
          }
        }

        // Cleanup
        if (scalePreviewLine) fabricCanvas.remove(scalePreviewLine);
        if (firstDot) fabricCanvas.remove(firstDot);
        
        fabricCanvas.off('mouse:down', handleScaleMouseDown);
        fabricCanvas.off('mouse:move', handleScaleMouseMove);
        
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.hoverCursor = 'move';
        
        setDrawingMode('none');
        drawingModeRef.current = 'none';
        fabricCanvas.renderAll();
      }
    };

    fabricCanvas.on('mouse:down', handleScaleMouseDown);
    fabricCanvas.on('mouse:move', handleScaleMouseMove);
    
    toast.info('Click the first reference point on the property boundary');
  };

  // Undo last action
  const undo = () => {
    if (undoStack.length === 0) return;
    
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastAction]);

    if (lastAction.type === 'add_point' && fabricCanvas) {
      // Remove last point
      const newPoints = currentPointsRef.current.slice(0, -1);
      currentPointsRef.current = newPoints;
      setCurrentPoints(newPoints);

      // Remove last marker
      if (vertexMarkers.length > 0) {
        const lastMarker = vertexMarkers[vertexMarkers.length - 1];
        fabricCanvas.remove(lastMarker);
        setVertexMarkers(prev => prev.slice(0, -1));
      }

      // Remove last line
      if (drawnLines.length > 0) {
        const lastLine = drawnLines[drawnLines.length - 1];
        fabricCanvas.remove(lastLine);
        setDrawnLines(prev => prev.slice(0, -1));
      }

      fabricCanvas.renderAll();
    }
  };

  // Redo last action
  const redo = () => {
    if (redoStack.length === 0) return;
    
    const lastAction = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastAction]);

    // Re-apply the action
    if (lastAction.type === 'add_point' && fabricCanvas) {
      const point = lastAction.data;
      const newPoints = [...currentPointsRef.current, point];
      currentPointsRef.current = newPoints;
      setCurrentPoints(newPoints);

      // Add marker
      const marker = new Circle({
        left: point.x,
        top: point.y,
        radius: 4,
        fill: drawingModeRef.current === 'property' ? '#22c55e' : '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      fabricCanvas.add(marker);
      setVertexMarkers(prev => [...prev, marker]);

      // Add line
      if (newPoints.length > 1) {
        const prev = newPoints[newPoints.length - 2];
        const line = new Line([prev.x, prev.y, point.x, point.y], {
          stroke: drawingModeRef.current === 'property' ? '#22c55e' : '#3b82f6',
          strokeWidth: 2,
          strokeDashArray: drawingModeRef.current === 'property' ? [8, 4] : undefined,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(line);
        setDrawnLines(prev => [...prev, line]);
      }

      fabricCanvas.renderAll();
    }
  };

  // Reset canvas
  const resetCanvas = () => {
    if (!fabricCanvas) return;
    
    // Remove all non-grid objects
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if (!(obj as any).isGrid) {
        fabricCanvas.remove(obj);
      }
    });
    
    setPropertyShape(null);
    propertyShapeRef.current = null;
    setHouseShapes([]);
    setScaleReference(null);
    setIsScaled(false);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setDrawnLines([]);
    setVertexMarkers([]);
    setDrawingMode('none');
    drawingModeRef.current = 'none';
    setUndoStack([]);
    setRedoStack([]);
    
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.hoverCursor = 'move';
    fabricCanvas.renderAll();
    
    toast.success('Canvas reset');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b p-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 border-r pr-3">
          <Button
            size="sm"
            variant={drawingMode === 'property' ? 'default' : 'outline'}
            onClick={() => startDrawingMode('property')}
            disabled={!!propertyShape}
          >
            Draw Property
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={startScaleMode}
            disabled={!propertyShape || isScaled}
          >
            Set Scale
          </Button>
          <Button
            size="sm"
            variant={drawingMode === 'house' ? 'default' : 'outline'}
            onClick={() => startDrawingMode('house')}
            disabled={!isScaled}
          >
            Draw House
          </Button>
        </div>

        <div className="flex items-center gap-2 border-r pr-3">
          <Button size="sm" variant="ghost" onClick={undo} disabled={undoStack.length === 0}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={redo} disabled={redoStack.length === 0}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-r pr-3">
          <Button
            size="sm"
            variant={gridSnapping ? 'secondary' : 'ghost'}
            onClick={() => setGridSnapping(!gridSnapping)}
            title="Grid Snapping"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={angleSnapping ? 'secondary' : 'ghost'}
            onClick={() => setAngleSnapping(!angleSnapping)}
            title="Angle Snapping (45°/90°)"
          >
            90°
          </Button>
          <Button
            size="sm"
            variant={vertexSnapping ? 'secondary' : 'ghost'}
            onClick={() => setVertexSnapping(!vertexSnapping)}
            title="Vertex Snapping"
          >
            <Magnet className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-r pr-3">
          <select
            value={scaleUnit}
            onChange={(e) => setScaleUnit(e.target.value as 'feet' | 'meters')}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="feet">Feet</option>
            <option value="meters">Meters</option>
          </select>
        </div>

        <Button size="sm" variant="destructive" onClick={resetCanvas}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>

        {drawingMode !== 'none' && drawingMode !== 'scale' && currentPoints.length >= 3 && (
          <Button size="sm" variant="default" onClick={completeShape} className="ml-auto">
            Close Shape
          </Button>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-slate-100 border-b px-3 py-1.5 text-xs text-slate-600 flex items-center gap-4">
        <span>Property: {propertyShape ? '✓ Drawn' : '○ Not drawn'}</span>
        <span>Scale: {isScaled ? '✓ Set' : '○ Not set'}</span>
        <span>Houses: {houseShapes.length}</span>
        {drawingMode !== 'none' && (
          <span className="ml-auto font-medium text-primary">
            Mode: {drawingMode === 'property' ? 'Drawing Property' : drawingMode === 'house' ? 'Drawing House' : 'Setting Scale'}
            {currentPoints.length > 0 && ` (${currentPoints.length} points)`}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
