import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Line, Circle, Polygon, Text, Group, Point } from 'fabric';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2, Redo2, Grid3X3, Magnet, RotateCcw, Move, Trash2, ZoomIn, ZoomOut, Eye, EyeOff, Maximize } from 'lucide-react';

interface ManualTracingCanvasProps {
  onStateChange?: (state: any) => void;
}

type DrawingMode = 'none' | 'property' | 'house' | 'pool' | 'move-house';
type UnitType = 'ft' | 'm';

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
  
  // Unit toggle
  const [unit, setUnit] = useState<UnitType>('ft');
  
  // Shift key state for angle snapping
  const [shiftPressed, setShiftPressed] = useState(false);
  const shiftPressedRef = useRef(false);
  
  // House movement state
  const [selectedHouseIndex, setSelectedHouseIndex] = useState<number | null>(null);
  const [isDraggingHouse, setIsDraggingHouse] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const originalHousePointsRef = useRef<{ x: number; y: number }[] | null>(null);
  
  // Vertex dragging state
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const isDraggingVertexRef = useRef(false);
  const draggingVertexRef = useRef<{
    marker: Circle;
    vertexIndex: number;
    shapeType: 'property' | 'house';
    shapeId: string;
    startPoint: { x: number; y: number };
  } | null>(null);
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const spacePressedRef = useRef(false);
  
  // Grid visibility
  const [showGrid, setShowGrid] = useState(true);
  
  // Measurement label state
  const [measurementLabel, setMeasurementLabel] = useState<Text | null>(null);
  const measurementLabelRef = useRef<Text | null>(null);
  
  // Drawing helpers
  const [previewLine, setPreviewLine] = useState<Line | null>(null);
  const [vertexMarkers, setVertexMarkers] = useState<Circle[]>([]);
  const [drawnLines, setDrawnLines] = useState<Line[]>([]);
  const vertexMarkersRef = useRef<Circle[]>([]);
  const drawnLinesRef = useRef<Line[]>([]);
  
  // Snapping options
  const [gridSnapping, setGridSnapping] = useState(false);
  const [vertexSnapping, setVertexSnapping] = useState(true);
  
  // Undo/Redo
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  
  // Refs for event handlers
  const drawingModeRef = useRef<DrawingMode>('none');
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const previewLineRef = useRef<Line | null>(null);
  const propertyShapeRef = useRef<DrawnShape | null>(null);
  const houseShapesRef = useRef<DrawnShape[]>([]);
  const unitRef = useRef<UnitType>('ft');

  // Grid settings - each grid square = 1 ft
  const GRID_SIZE = 20; // 20 pixels = 1 foot
  const PIXELS_PER_FOOT = GRID_SIZE;
  const FEET_TO_METERS = 0.3048;
  const SNAP_DISTANCE = 10;
  const CLOSE_DISTANCE = 15;

  // Sync refs
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);

  useEffect(() => {
    houseShapesRef.current = houseShapes;
  }, [houseShapes]);

  // Create arrow cursor
  const createArrowCursor = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path d="M0 0 L0 16 L4 12 L7 19 L9 18 L6 11 L12 11 Z" fill="#000000" stroke="#ffffff" stroke-width="1"/>
    </svg>`;
    const encoded = encodeURIComponent(svg);
    return `url('data:image/svg+xml,${encoded}') 0 0, default`;
  };

  // Handle shift key for angle snapping and space for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(true);
        shiftPressedRef.current = true;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
        spacePressedRef.current = true;
        if (fabricCanvas) {
          fabricCanvas.defaultCursor = 'grab';
          fabricCanvas.hoverCursor = 'grab';
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
        shiftPressedRef.current = false;
      }
      if (e.key === ' ' || e.code === 'Space') {
        setSpacePressed(false);
        spacePressedRef.current = false;
        setIsPanning(false);
        lastPanPoint.current = null;
        if (fabricCanvas) {
          fabricCanvas.defaultCursor = 'default';
          fabricCanvas.hoverCursor = 'move';
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [fabricCanvas]);

  // Mouse wheel zoom
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleWheel = (opt: any) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY;
      let newZoom = fabricCanvas.getZoom();
      newZoom *= 0.999 ** delta;
      
      // Clamp zoom between 0.25 and 4
      newZoom = Math.max(0.25, Math.min(4, newZoom));
      
      // Zoom to mouse pointer position
      const pointer = fabricCanvas.getScenePoint(e);
      fabricCanvas.zoomToPoint(new Point(pointer.x, pointer.y), newZoom);
      
      setZoomLevel(newZoom);
      fabricCanvas.renderAll();
    };

    fabricCanvas.on('mouse:wheel', handleWheel);

    return () => {
      fabricCanvas.off('mouse:wheel', handleWheel);
    };
  }, [fabricCanvas]);

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
  const drawGrid = (canvas: FabricCanvas, width: number, height: number, visible: boolean = true) => {
    // Remove old grid lines
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).isGrid) {
        canvas.remove(obj);
      }
    });

    if (!visible) return;

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

  // Toggle grid visibility
  const toggleGrid = () => {
    if (!fabricCanvas || !containerRef.current) return;
    const newShowGrid = !showGrid;
    setShowGrid(newShowGrid);
    drawGrid(fabricCanvas, containerRef.current.clientWidth, containerRef.current.clientHeight, newShowGrid);
    fabricCanvas.renderAll();
  };

  // Snap point to grid if enabled
  const snapToGrid = (point: { x: number; y: number }): { x: number; y: number } => {
    if (!gridSnapping) return point;
    return {
      x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
    };
  };

  // Snap to angle when Shift is held (0°, 45°, 90°, 135°, 180°, etc.)
  // Also considers alignment with first point to help close the shape at 90°
  const snapToAngleWithShift = (point: { x: number; y: number }, lastPoint: { x: number; y: number }): { x: number; y: number } => {
    if (!shiftPressedRef.current || !lastPoint) return point;
    
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Standard 45° snap angle
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    
    // Check if we have at least 2 points and can align with first point
    const firstPoint = currentPointsRef.current[0];
    if (firstPoint && currentPointsRef.current.length >= 2) {
      // Calculate horizontal and vertical alignment to first point
      const alignHorizontalX = lastPoint.x + (point.x > lastPoint.x ? Math.abs(firstPoint.x - lastPoint.x) : -Math.abs(firstPoint.x - lastPoint.x));
      const alignVerticalY = lastPoint.y + (point.y > lastPoint.y ? Math.abs(firstPoint.y - lastPoint.y) : -Math.abs(firstPoint.y - lastPoint.y));
      
      // Check if aligning horizontally would put us at or past first point X
      const horizontalAlignDist = Math.abs(firstPoint.x - lastPoint.x);
      const verticalAlignDist = Math.abs(firstPoint.y - lastPoint.y);
      
      // If cursor is moving mostly horizontal and we can align X with first point
      if (Math.abs(dx) > Math.abs(dy) && horizontalAlignDist > 10) {
        // Check if the snapped point would be close to first point's X
        const snappedX = lastPoint.x + Math.cos(snapAngle) * distance;
        if (Math.abs(snappedX - firstPoint.x) < 30) {
          // Snap X to exactly match first point for perfect 90° closure
          return {
            x: firstPoint.x,
            y: lastPoint.y,
          };
        }
      }
      
      // If cursor is moving mostly vertical and we can align Y with first point
      if (Math.abs(dy) > Math.abs(dx) && verticalAlignDist > 10) {
        const snappedY = lastPoint.y + Math.sin(snapAngle) * distance;
        if (Math.abs(snappedY - firstPoint.y) < 30) {
          // Snap Y to exactly match first point for perfect 90° closure
          return {
            x: lastPoint.x,
            y: firstPoint.y,
          };
        }
      }
    }
    
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
    if (lastPoint && shiftPressedRef.current) {
      snapped = snapToAngleWithShift(snapped, lastPoint);
    }
    
    snapped = snapToVertex(snapped);
    snapped = snapToGrid(snapped);
    
    return snapped;
  };

  // Snap vertex drag to angles (0°, 45°, 90°) when Shift is held
  const snapVertexToAngle = (point: { x: number; y: number }, startPoint: { x: number; y: number }): { x: number; y: number } => {
    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 5) return point; // Don't snap for tiny movements
    
    const angle = Math.atan2(dy, dx);
    // Snap to nearest 45° angle (0°, 45°, 90°, 135°, 180°, etc.)
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    
    return {
      x: startPoint.x + Math.cos(snapAngle) * distance,
      y: startPoint.y + Math.sin(snapAngle) * distance,
    };
  };

  // Update vertex position in a shape
  const updateVertexPosition = (
    shapeType: 'property' | 'house',
    shapeId: string,
    vertexIndex: number,
    newPoint: { x: number; y: number }
  ) => {
    if (!fabricCanvas) return;
    
    if (shapeType === 'property' && propertyShapeRef.current) {
      const shape = propertyShapeRef.current;
      const newPoints = [...shape.points];
      newPoints[vertexIndex] = newPoint;
      
      // Remove old polygon
      if (shape.fabricObject) {
        fabricCanvas.remove(shape.fabricObject);
      }
      
      // Remove old edge labels
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).shapeId === shape.id && (obj as any).isEdgeLabel) {
          fabricCanvas.remove(obj);
        }
      });
      
      // Create new polygon
      const fabricPoints = newPoints.map(p => new Point(p.x, p.y));
      const polygon = new Polygon(fabricPoints, {
        fill: 'rgba(34, 197, 94, 0.1)',
        stroke: '#22c55e',
        strokeWidth: 2,
        strokeDashArray: [8, 4],
        selectable: false,
        evented: false,
      });
      (polygon as any).shapeType = 'property';
      fabricCanvas.add(polygon);
      fabricCanvas.sendObjectToBack(polygon);
      
      // Move grid to back
      objects.forEach(obj => {
        if ((obj as any).isGrid) {
          fabricCanvas.sendObjectToBack(obj);
        }
      });
      
      // Add new edge labels
      addEdgeLengthLabels(fabricCanvas, newPoints, shape.id);
      
      // Update refs and state
      const updatedShape: DrawnShape = {
        ...shape,
        points: newPoints,
        fabricObject: polygon,
      };
      propertyShapeRef.current = updatedShape;
      setPropertyShape(updatedShape);
      
    } else if (shapeType === 'house') {
      const houseIndex = houseShapesRef.current.findIndex(h => h.id === shapeId);
      if (houseIndex === -1) return;
      
      const house = houseShapesRef.current[houseIndex];
      const newPoints = [...house.points];
      newPoints[vertexIndex] = newPoint;
      
      // Check if all points are still inside property
      const allInside = newPoints.every(p => isPointInsideProperty(p));
      if (!allInside) return; // Don't allow moving outside property
      
      // Remove old polygon
      if (house.fabricObject) {
        fabricCanvas.remove(house.fabricObject);
      }
      
      // Remove old edge labels
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).shapeId === house.id && (obj as any).isEdgeLabel) {
          fabricCanvas.remove(obj);
        }
      });
      
      // Create new polygon
      const fabricPoints = newPoints.map(p => new Point(p.x, p.y));
      const polygon = new Polygon(fabricPoints, {
        fill: 'rgba(59, 130, 246, 0.2)',
        stroke: '#3b82f6',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      (polygon as any).shapeType = 'house';
      fabricCanvas.add(polygon);
      
      // Add new edge labels
      addEdgeLengthLabels(fabricCanvas, newPoints, house.id);
      
      // Update state
      const updatedHouse: DrawnShape = {
        ...house,
        points: newPoints,
        fabricObject: polygon,
      };
      
      houseShapesRef.current[houseIndex] = updatedHouse;
      setHouseShapes(prev => {
        const newShapes = [...prev];
        newShapes[houseIndex] = updatedHouse;
        return newShapes;
      });
    }
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

  // Convert pixels to feet
  const pixelsToFeet = (pixels: number): number => {
    return pixels / PIXELS_PER_FOOT;
  };

  // Convert pixels to current unit
  const pixelsToUnit = (pixels: number): number => {
    const feet = pixels / PIXELS_PER_FOOT;
    return unitRef.current === 'm' ? feet * FEET_TO_METERS : feet;
  };

  // Format measurement based on unit
  const formatMeasurement = (pixels: number): string => {
    if (unitRef.current === 'm') {
      const meters = pixelsToUnit(pixels);
      return `${meters.toFixed(2)} m`;
    } else {
      const feet = pixelsToFeet(pixels);
      const wholeFeet = Math.floor(feet);
      const inches = Math.round((feet - wholeFeet) * 12);
      if (inches === 12) {
        return `${wholeFeet + 1}'0"`;
      }
      return `${wholeFeet}'${inches}"`;
    }
  };

  // Start drawing mode
  const startDrawingMode = (mode: DrawingMode) => {
    if (!fabricCanvas) return;
    
    if (mode === 'house' && !propertyShapeRef.current) {
      toast.error('Please draw the property boundary first');
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
      ? 'Click to place vertices. Click near the first point to close the shape. (1 grid square = 1 ft)'
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
    const shapeId = `${mode}-${Date.now()}`;

    // Remove preview elements using refs for fresh data
    drawnLinesRef.current.forEach(line => fabricCanvas.remove(line));
    vertexMarkersRef.current.forEach(marker => fabricCanvas.remove(marker));
    if (previewLineRef.current) {
      fabricCanvas.remove(previewLineRef.current);
      previewLineRef.current = null;
    }
    // Remove any lingering measurement label from preview
    if (measurementLabelRef.current) {
      fabricCanvas.remove(measurementLabelRef.current);
      measurementLabelRef.current = null;
      setMeasurementLabel(null);
    }
    // Remove any temporary edge labels that were added during drawing
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).isTempEdgeLabel) {
        fabricCanvas.remove(obj);
      }
    });

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
        radius: 6,
        fill: mode === 'property' ? '#22c55e' : '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: true,
        hasControls: false,
        hasBorders: false,
        hoverCursor: 'pointer',
      });
      (marker as any).vertexIndex = index;
      (marker as any).parentPolygon = polygon;
      (marker as any).parentPoints = points;
      (marker as any).shapeType = mode;
      (marker as any).shapeId = shapeId;
      (marker as any).isVertexMarker = true;
      
      fabricCanvas.add(marker);
      newMarkers.push(marker);
    });
    
    // Add edge length labels (always, since 1 grid = 1 ft)
    addEdgeLengthLabels(fabricCanvas, points, shapeId);

    const shape: DrawnShape = {
      id: shapeId,
      type: mode as 'property' | 'house',
      points,
      fabricObject: polygon,
    };

    if (mode === 'property') {
      setPropertyShape(shape);
      propertyShapeRef.current = shape;
      toast.success('Property boundary drawn! You can now draw the house.');
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
    drawnLinesRef.current = [];
    setVertexMarkers([]);
    vertexMarkersRef.current = [];
    
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.hoverCursor = 'move';
    fabricCanvas.renderAll();

    // Push to undo stack
    setUndoStack(prev => [...prev, { type: 'complete_shape', data: shape }]);
    setRedoStack([]);
  }, [fabricCanvas]);

  // Add edge length labels
  const addEdgeLengthLabels = (canvas: FabricCanvas, points: { x: number; y: number }[], shapeId: string) => {
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      const label = formatMeasurement(pixelDist);

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
      (text as any).shapeId = shapeId;
      canvas.add(text);
    }
  };

  // Refresh all edge labels when unit changes
  const refreshEdgeLabels = useCallback(() => {
    if (!fabricCanvas) return;
    
    // Remove all existing edge labels
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).isEdgeLabel) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Re-add labels for property
    if (propertyShapeRef.current) {
      addEdgeLengthLabels(fabricCanvas, propertyShapeRef.current.points, propertyShapeRef.current.id);
    }
    
    // Re-add labels for houses
    houseShapesRef.current.forEach(house => {
      addEdgeLengthLabels(fabricCanvas, house.points, house.id);
    });
    
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  // Refresh labels when unit changes
  useEffect(() => {
    refreshEdgeLabels();
  }, [unit, refreshEdgeLabels]);

  // Handle canvas mouse events
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      // Handle panning with space key
      if (spacePressedRef.current) {
        setIsPanning(true);
        isPanningRef.current = true;
        const pointer = fabricCanvas.getPointer(e.e, true);
        lastPanPoint.current = { x: pointer.x, y: pointer.y };
        fabricCanvas.defaultCursor = 'grabbing';
        return;
      }
      
      if (drawingModeRef.current === 'none' || drawingModeRef.current === 'move-house') return;
      
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
      vertexMarkersRef.current = [...vertexMarkersRef.current, marker];
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
        drawnLinesRef.current = [...drawnLinesRef.current, line];
        setDrawnLines(prev => [...prev, line]);
      }

      // Remove measurement label after placing point (it will be recreated on next mouse move)
      if (measurementLabelRef.current) {
        fabricCanvas.remove(measurementLabelRef.current);
        measurementLabelRef.current = null;
        setMeasurementLabel(null);
      }

      // Remove preview line (it will be recreated on next mouse move)
      if (previewLineRef.current) {
        fabricCanvas.remove(previewLineRef.current);
        previewLineRef.current = null;
        setPreviewLine(null);
      }

      fabricCanvas.renderAll();

      // Push to undo stack
      setUndoStack(prev => [...prev, { type: 'add_point', data: snappedPoint }]);
      setRedoStack([]);
    };

    const handleMouseMove = (e: any) => {
      // Handle panning
      if (isPanningRef.current && lastPanPoint.current) {
        const pointer = fabricCanvas.getPointer(e.e, true);
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += pointer.x - lastPanPoint.current.x;
          vpt[5] += pointer.y - lastPanPoint.current.y;
          fabricCanvas.setViewportTransform(vpt);
          lastPanPoint.current = { x: pointer.x, y: pointer.y };
        }
        return;
      }
      
      if (drawingModeRef.current === 'none' || currentPointsRef.current.length === 0) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      let snappedPoint = applySnapping({ x: pointer.x, y: pointer.y });
      
      const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];

      // Calculate distance for measurement label
      const pixelDist = Math.sqrt(
        Math.pow(snappedPoint.x - lastPoint.x, 2) + Math.pow(snappedPoint.y - lastPoint.y, 2)
      );
      const measurementText = formatMeasurement(pixelDist);

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

      // Update or create measurement label
      const midX = (lastPoint.x + snappedPoint.x) / 2;
      const midY = (lastPoint.y + snappedPoint.y) / 2;

      if (measurementLabelRef.current) {
        measurementLabelRef.current.set({
          left: midX,
          top: midY - 16,
          text: measurementText,
        });
      } else {
        const label = new Text(measurementText, {
          left: midX,
          top: midY - 16,
          fontSize: 12,
          fill: '#1f2937',
          fontWeight: 'bold',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        (label as any).isMeasurementLabel = true;
        fabricCanvas.add(label);
        measurementLabelRef.current = label;
        setMeasurementLabel(label);
      }

      fabricCanvas.renderAll();
    };

    // Handle house movement
    const handleHouseMouseDown = (e: any) => {
      if (drawingModeRef.current !== 'move-house') return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      // Check if clicked inside any house
      for (let i = 0; i < houseShapesRef.current.length; i++) {
        const house = houseShapesRef.current[i];
        if (isPointInsidePolygon({ x: pointer.x, y: pointer.y }, house.points)) {
          setSelectedHouseIndex(i);
          setIsDraggingHouse(true);
          dragStartRef.current = { x: pointer.x, y: pointer.y };
          originalHousePointsRef.current = house.points.map(p => ({ ...p }));
          return;
        }
      }
    };

    const handleHouseMouseMove = (e: any) => {
      if (!isDraggingHouse || selectedHouseIndex === null || !dragStartRef.current || !originalHousePointsRef.current) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      const dx = pointer.x - dragStartRef.current.x;
      const dy = pointer.y - dragStartRef.current.y;
      
      // Calculate new points
      const newPoints = originalHousePointsRef.current.map(p => ({
        x: p.x + dx,
        y: p.y + dy,
      }));
      
      // Check if all points are still inside property
      const allInside = newPoints.every(p => isPointInsideProperty(p));
      if (!allInside) return;
      
      // Update house shape
      updateHousePosition(selectedHouseIndex, newPoints);
    };

    const handleHouseMouseUp = () => {
      if (isDraggingHouse) {
        setIsDraggingHouse(false);
        dragStartRef.current = null;
        originalHousePointsRef.current = null;
      }
    };

    const handlePanMouseUp = () => {
      if (isPanningRef.current) {
        setIsPanning(false);
        isPanningRef.current = false;
        lastPanPoint.current = null;
        if (spacePressedRef.current) {
          fabricCanvas.defaultCursor = 'grab';
        } else {
          fabricCanvas.defaultCursor = 'default';
        }
      }
    };

    // Vertex dragging handlers
    const handleVertexMouseDown = (e: any) => {
      if (drawingModeRef.current !== 'none' || spacePressedRef.current) return;
      
      const target = e.target;
      if (!target || !(target as any).isVertexMarker) return;
      
      const vertexIndex = (target as any).vertexIndex;
      const shapeType = (target as any).shapeType;
      const shapeId = (target as any).shapeId;
      
      setIsDraggingVertex(true);
      isDraggingVertexRef.current = true;
      draggingVertexRef.current = {
        marker: target as Circle,
        vertexIndex,
        shapeType,
        shapeId,
        startPoint: { x: target.left!, y: target.top! },
      };
      
      fabricCanvas.defaultCursor = 'grabbing';
    };

    const handleVertexMouseMove = (e: any) => {
      if (!isDraggingVertexRef.current || !draggingVertexRef.current) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      let newPoint = { x: pointer.x, y: pointer.y };
      
      // Apply Shift-key angle snapping
      if (shiftPressedRef.current) {
        const startPoint = draggingVertexRef.current.startPoint;
        newPoint = snapVertexToAngle(newPoint, startPoint);
      }
      
      // Apply grid snapping
      newPoint = snapToGrid(newPoint);
      
      // Update the marker position visually
      draggingVertexRef.current.marker.set({
        left: newPoint.x,
        top: newPoint.y,
      });
      
      // Update the shape
      updateVertexPosition(
        draggingVertexRef.current.shapeType,
        draggingVertexRef.current.shapeId,
        draggingVertexRef.current.vertexIndex,
        newPoint
      );
      
      fabricCanvas.renderAll();
    };

    const handleVertexMouseUp = () => {
      if (isDraggingVertexRef.current) {
        setIsDraggingVertex(false);
        isDraggingVertexRef.current = false;
        draggingVertexRef.current = null;
        fabricCanvas.defaultCursor = 'default';
      }
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:down', handleHouseMouseDown);
    fabricCanvas.on('mouse:move', handleHouseMouseMove);
    fabricCanvas.on('mouse:up', handleHouseMouseUp);
    fabricCanvas.on('mouse:up', handlePanMouseUp);
    fabricCanvas.on('mouse:down', handleVertexMouseDown);
    fabricCanvas.on('mouse:move', handleVertexMouseMove);
    fabricCanvas.on('mouse:up', handleVertexMouseUp);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:down', handleHouseMouseDown);
      fabricCanvas.off('mouse:move', handleHouseMouseMove);
      fabricCanvas.off('mouse:up', handleHouseMouseUp);
      fabricCanvas.off('mouse:up', handlePanMouseUp);
      fabricCanvas.off('mouse:down', handleVertexMouseDown);
      fabricCanvas.off('mouse:move', handleVertexMouseMove);
      fabricCanvas.off('mouse:up', handleVertexMouseUp);
    };
  }, [fabricCanvas, completeShape, gridSnapping, vertexSnapping, isDraggingHouse, selectedHouseIndex, isPanning]);

  // Check if point is inside a polygon
  const isPointInsidePolygon = (point: { x: number; y: number }, pts: { x: number; y: number }[]): boolean => {
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

  // Update house position
  const updateHousePosition = (index: number, newPoints: { x: number; y: number }[]) => {
    if (!fabricCanvas) return;
    
    const house = houseShapesRef.current[index];
    if (!house) return;
    
    // Remove old polygon and labels
    if (house.fabricObject) {
      fabricCanvas.remove(house.fabricObject);
    }
    
    // Remove old edge labels for this house
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeId === house.id) {
        fabricCanvas.remove(obj);
      }
      // Remove old vertex markers
      if ((obj as any).parentPolygon === house.fabricObject) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Create new polygon
    const fabricPoints = newPoints.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: 'rgba(59, 130, 246, 0.2)',
      stroke: '#3b82f6',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = 'house';
    fabricCanvas.add(polygon);
    
    // Add new vertex markers
    newPoints.forEach((p, idx) => {
      const marker = new Circle({
        left: p.x,
        top: p.y,
        radius: 5,
        fill: '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      (marker as any).vertexIndex = idx;
      (marker as any).parentPolygon = polygon;
      fabricCanvas.add(marker);
    });
    
    // Add new edge labels
    addEdgeLengthLabels(fabricCanvas, newPoints, house.id);
    
    // Update state
    const updatedHouse: DrawnShape = {
      ...house,
      points: newPoints,
      fabricObject: polygon,
    };
    
    setHouseShapes(prev => {
      const newShapes = [...prev];
      newShapes[index] = updatedHouse;
      return newShapes;
    });
    houseShapesRef.current[index] = updatedHouse;
    
    fabricCanvas.renderAll();
  };

  // Start move house mode
  const startMoveHouseMode = () => {
    if (!fabricCanvas) return;
    if (houseShapes.length === 0) {
      toast.error('No houses to move');
      return;
    }
    
    setDrawingMode('move-house');
    drawingModeRef.current = 'move-house';
    fabricCanvas.defaultCursor = 'move';
    fabricCanvas.hoverCursor = 'move';
    toast.info('Click and drag a house to move it');
  };


  // Delete last house
  const deleteLastHouse = () => {
    if (!fabricCanvas || houseShapesRef.current.length === 0) return;
    
    const lastHouse = houseShapesRef.current[houseShapesRef.current.length - 1];
    
    // Remove polygon
    if (lastHouse.fabricObject) {
      fabricCanvas.remove(lastHouse.fabricObject);
    }
    
    // Remove edge labels and vertex markers for this house
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeId === lastHouse.id || (obj as any).parentPolygon === lastHouse.fabricObject) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Update state
    setHouseShapes(prev => prev.slice(0, -1));
    houseShapesRef.current = houseShapesRef.current.slice(0, -1);
    
    fabricCanvas.renderAll();
    toast.success('House deleted');
  };

  // Zoom functions
  const zoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoomLevel + 0.25, 3);
    setZoomLevel(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const zoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoomLevel - 0.25, 0.5);
    setZoomLevel(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const resetView = () => {
    if (!fabricCanvas) return;
    setZoomLevel(1);
    fabricCanvas.setZoom(1);
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabricCanvas.renderAll();
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
            variant={drawingMode === 'house' ? 'default' : 'outline'}
            onClick={() => startDrawingMode('house')}
            disabled={!propertyShape}
          >
            Draw House
          </Button>
          <Button
            size="sm"
            variant={drawingMode === 'move-house' ? 'default' : 'outline'}
            onClick={startMoveHouseMode}
            disabled={houseShapes.length === 0}
            title="Move House"
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={deleteLastHouse}
            disabled={houseShapes.length === 0}
            title="Delete Last House"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-r pr-3">
          <Button size="sm" variant="ghost" onClick={zoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-600 min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
          <Button size="sm" variant="ghost" onClick={zoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={resetView} title="Reset View">
            <Maximize className="h-4 w-4" />
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
            variant={showGrid ? 'secondary' : 'ghost'}
            onClick={toggleGrid}
            title="Toggle Grid"
          >
            {showGrid ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
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
            variant={vertexSnapping ? 'secondary' : 'ghost'}
            onClick={() => setVertexSnapping(!vertexSnapping)}
            title="Vertex Snapping"
          >
            <Magnet className="h-4 w-4" />
          </Button>
        </div>

        {/* Unit Toggle */}
        <div className="flex items-center gap-1 border-r pr-3">
          <Button
            size="sm"
            variant={unit === 'ft' ? 'secondary' : 'ghost'}
            onClick={() => setUnit('ft')}
          >
            ft
          </Button>
          <Button
            size="sm"
            variant={unit === 'm' ? 'secondary' : 'ghost'}
            onClick={() => setUnit('m')}
          >
            m
          </Button>
        </div>

        <span className="text-xs text-slate-500 italic">(Shift: straight lines | Space: pan)</span>

        <Button size="sm" variant="destructive" onClick={resetCanvas}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>

        {drawingMode !== 'none' && drawingMode !== 'move-house' && currentPoints.length >= 3 && (
          <Button size="sm" variant="default" onClick={completeShape} className="ml-auto">
            Close Shape
          </Button>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-slate-100 border-b px-3 py-1.5 text-xs text-slate-600 flex items-center gap-4">
        <span>Property: {propertyShape ? '✓ Drawn' : '○ Not drawn'}</span>
        <span>Houses: {houseShapes.length}</span>
        <span>Unit: {unit === 'ft' ? 'Feet' : 'Meters'}</span>
        {shiftPressed && <span className="text-primary font-medium">⇧ Angle Snap Active</span>}
        {spacePressed && <span className="text-primary font-medium">Pan Mode</span>}
        {drawingMode !== 'none' && (
          <span className="ml-auto font-medium text-primary">
            Mode: {drawingMode === 'property' ? 'Drawing Property' : drawingMode === 'house' ? 'Drawing House' : 'Moving House'}
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
