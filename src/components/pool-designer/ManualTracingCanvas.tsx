import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Line, Circle, Polygon, Text, Group, Point, Pattern, Rect, Gradient, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Undo2, Redo2, Grid3X3, Magnet, RotateCcw, Move, Trash2, ZoomIn, ZoomOut, Eye, EyeOff, Maximize, Waves, ChevronDown, Plus, Pencil } from 'lucide-react';

interface ManualTracingCanvasProps {
  onStateChange?: (state: any) => void;
}

type DrawingMode = 'none' | 'property' | 'house' | 'pool' | 'move-house' | 'move-pool' | 'rotate-pool';
type UnitType = 'ft' | 'm';

interface DrawnShape {
  id: string;
  type: 'property' | 'house' | 'pool';
  points: { x: number; y: number }[];
  fabricObject?: Polygon;
  name?: string;
  widthFeet?: number;
  lengthFeet?: number;
}

interface PresetPool {
  name: string;
  displayName: string;
  widthFeet: number;
  widthInches: number;
  lengthFeet: number;
  lengthInches: number;
}

// Predefined pool models
const PRESET_POOLS: PresetPool[] = [
  { name: 'azoria-12x20', displayName: 'Azoria 12x20', widthFeet: 11, widthInches: 0, lengthFeet: 19, lengthInches: 0 },
  { name: 'azoria-12x22', displayName: 'Azoria 12x22', widthFeet: 10, widthInches: 9, lengthFeet: 21, lengthInches: 5.5 },
  { name: 'azoria-12x24', displayName: 'Azoria 12x24', widthFeet: 11, widthInches: 0, lengthFeet: 23, lengthInches: 0 },
  { name: 'azoria-12x26', displayName: 'Azoria 12x26', widthFeet: 11, widthInches: 0, lengthFeet: 25, lengthInches: 0 },
  { name: 'azoria-12x27', displayName: 'Azoria 12x27', widthFeet: 10, widthInches: 9, lengthFeet: 26, lengthInches: 9.5 },
];

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
  const [poolShapes, setPoolShapes] = useState<DrawnShape[]>([]);
  
  // Custom pool dimensions input
  const [customPoolWidth, setCustomPoolWidth] = useState<string>('12');
  const [customPoolLength, setCustomPoolLength] = useState<string>('24');
  const [showCustomPoolInput, setShowCustomPoolInput] = useState(false);
  
  // Pool movement state
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number | null>(null);
  const [isDraggingPool, setIsDraggingPool] = useState(false);
  const poolDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const originalPoolPointsRef = useRef<{ x: number; y: number }[] | null>(null);
  
  // Pool rotation state
  const [isRotatingPool, setIsRotatingPool] = useState(false);
  const rotatingPoolIndexRef = useRef<number | null>(null);
  const rotationStartAngleRef = useRef<number>(0);
  const originalPoolRotationRef = useRef<number>(0);
  const poolRotationsRef = useRef<{ [key: string]: number }>({});
  
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
  const poolShapesRef = useRef<DrawnShape[]>([]);
  const unitRef = useRef<UnitType>('ft');

  // Grid settings - each grid square = 1 meter
  const GRID_SIZE = 20; // 20 pixels = 1 meter
  const PIXELS_PER_METER = GRID_SIZE;
  const METERS_TO_FEET = 3.28084;
  const SNAP_DISTANCE = 10;
  const CLOSE_DISTANCE = 15;

  // Create hatch pattern for house/roof with white background
  const createHatchPattern = (): Pattern => {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 10;
    patternCanvas.height = 10;
    const ctx = patternCanvas.getContext('2d');
    if (ctx) {
      // Fill white background first
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 10, 10);
      // Draw diagonal hatch line
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(10, 0);
      ctx.stroke();
    }
    return new Pattern({
      source: patternCanvas,
      repeat: 'repeat',
    });
  };
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);

  useEffect(() => {
    houseShapesRef.current = houseShapes;
  }, [houseShapes]);

  useEffect(() => {
    poolShapesRef.current = poolShapes;
  }, [poolShapes]);

  // Create water gradient for pools (uses Fabric.js Gradient)
  const createWaterGradient = (points: { x: number; y: number }[]): Gradient<'linear'> => {
    // Calculate bounding box
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    return new Gradient({
      type: 'linear',
      coords: {
        x1: 0,
        y1: 0,
        x2: width,
        y2: height,
      },
      colorStops: [
        { offset: 0, color: '#0EA5E9' },    // Sky blue
        { offset: 0.3, color: '#38BDF8' },  // Light blue
        { offset: 0.6, color: '#7DD3FC' },  // Lighter blue
        { offset: 0.85, color: '#BAE6FD' }, // Very light blue
        { offset: 1, color: '#FFFFFF' },    // White
      ],
    });
  };

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
      // Escape key to exit any mode
      if (e.key === 'Escape') {
        setDrawingMode('none');
        drawingModeRef.current = 'none';
        if (fabricCanvas) {
          fabricCanvas.defaultCursor = 'default';
          fabricCanvas.hoverCursor = 'move';
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
  // Function to add an independent, rotatable north indicator
  const addNorthIndicator = async (canvas: FabricCanvas) => {
    const northSize = 60;
    const canvasWidth = canvas.width!;
    const padding = 60;
    
    // Load the north.png image
    const northImgModule = await import('@/assets/north.png');
    const northImg = await FabricImage.fromURL(northImgModule.default);
    
    // Scale the north image to appropriate size
    const northScale = northSize / Math.max(northImg.width!, northImg.height!);
    northImg.set({
      scaleX: northScale,
      scaleY: northScale,
      originX: 'center',
      originY: 'center',
    });

    // Create sunrise circle (yellow) on the East side (right of north)
    const sunCircleSize = 12;
    const sunOffset = northSize / 2 + 10;
    const sunriseCircle = new Circle({
      radius: sunCircleSize / 2,
      fill: '#FFD700',
      stroke: '#FFA500',
      strokeWidth: 1,
      left: sunOffset,
      top: 0,
      originX: 'center',
      originY: 'center',
    });

    // Create sunset circle (blue) on the West side (left of north)
    const sunsetCircle = new Circle({
      radius: sunCircleSize / 2,
      fill: '#4A90D9',
      stroke: '#2E5B8A',
      strokeWidth: 1,
      left: -sunOffset,
      top: 0,
      originX: 'center',
      originY: 'center',
    });

    // Group the north indicator with sun circles - make it selectable and rotatable
    const northGroup = new Group([sunsetCircle, northImg, sunriseCircle], {
      left: canvasWidth - padding,
      top: padding,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockScalingX: true,
      lockScalingY: true,
    });
    
    // Only show rotation control
    (northGroup as any).setControlsVisibility?.({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
      bl: false,
      br: false,
      tl: false,
      tr: false,
      mtr: true, // rotation control only
    });
    
    (northGroup as any).isNorthIndicator = true;

    canvas.add(northGroup);
    canvas.bringObjectToFront(northGroup);
  };

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
    
    // Add north indicator
    addNorthIndicator(canvas);
    
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
      
      // Remove old edge labels and vertex markers
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).shapeId === shape.id && ((obj as any).isEdgeLabel || (obj as any).isVertexMarker)) {
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
      
      // Add new vertex markers
      newPoints.forEach((p, index) => {
        const marker = new Circle({
          left: p.x,
          top: p.y,
          radius: 3,
          fill: '#22c55e',
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
        (marker as any).parentPoints = newPoints;
        (marker as any).shapeType = 'property';
        (marker as any).shapeId = shape.id;
        (marker as any).isVertexMarker = true;
        fabricCanvas.add(marker);
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
      
      // Remove old edge labels and vertex markers
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).shapeId === house.id && ((obj as any).isEdgeLabel || (obj as any).isVertexMarker)) {
          fabricCanvas.remove(obj);
        }
      });
      
      // Create new polygon with hatch pattern
      const fabricPoints = newPoints.map(p => new Point(p.x, p.y));
      const polygon = new Polygon(fabricPoints, {
        fill: createHatchPattern(),
        stroke: '#000000',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      (polygon as any).shapeType = 'house';
      fabricCanvas.add(polygon);
      
      // Add new vertex markers
      newPoints.forEach((p, index) => {
        const marker = new Circle({
          left: p.x,
          top: p.y,
          radius: 1.5,
          fill: '#000000',
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
        (marker as any).parentPoints = newPoints;
        (marker as any).shapeType = 'house';
        (marker as any).shapeId = house.id;
        (marker as any).isVertexMarker = true;
        fabricCanvas.add(marker);
      });
      
      // No edge labels for houses
      
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

  // Convert pixels to meters
  const pixelsToMeters = (pixels: number): number => {
    return pixels / PIXELS_PER_METER;
  };

  // Convert pixels to current unit
  const pixelsToUnit = (pixels: number): number => {
    const meters = pixels / PIXELS_PER_METER;
    return unitRef.current === 'ft' ? meters * METERS_TO_FEET : meters;
  };

  // Format measurement based on unit
  const formatMeasurement = (pixels: number): string => {
    if (unitRef.current === 'm') {
      const meters = pixelsToMeters(pixels);
      return `${meters.toFixed(2)} m`;
    } else {
      const feet = pixelsToMeters(pixels) * METERS_TO_FEET;
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
    
    if ((mode === 'house' || mode === 'pool') && !propertyShapeRef.current) {
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
    
    if (mode === 'property') {
      toast.info('Click to place vertices. Click near the first point to close the shape. (1 grid square = 1 m)');
    } else if (mode === 'house') {
      toast.info('Click to place vertices inside the property boundary.');
    } else if (mode === 'pool') {
      toast.info('Click to draw a custom pool shape inside the property boundary.');
    }
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

    // Determine fill and stroke based on mode
    let fill: any;
    let stroke: string;
    let strokeDashArray: number[] | undefined;
    
    if (mode === 'property') {
      fill = 'rgba(34, 197, 94, 0.1)';
      stroke = '#22c55e';
      strokeDashArray = [8, 4];
    } else if (mode === 'house') {
      fill = createHatchPattern();
      stroke = '#000000';
    } else if (mode === 'pool') {
      fill = createWaterGradient(points);
      stroke = '#000000'; // Black contour for pools
    } else {
      fill = 'rgba(100, 100, 100, 0.1)';
      stroke = '#666666';
    }

    // Create polygon
    const fabricPoints = points.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill,
      stroke,
      strokeWidth: 2,
      strokeDashArray,
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = mode;
    
    fabricCanvas.add(polygon);

    // Add vertex markers for editing
    const newMarkers: Circle[] = [];
    const markerColor = mode === 'property' ? '#22c55e' : '#000000'; // Black markers for house and pool
    points.forEach((p, index) => {
      const marker = new Circle({
        left: p.x,
        top: p.y,
        radius: mode === 'property' ? 3 : 2,
        fill: markerColor,
        stroke: '#ffffff',
        strokeWidth: mode === 'property' ? 2 : 1,
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
    
    // Add edge length labels only for property
    if (mode === 'property') {
      addEdgeLengthLabels(fabricCanvas, points, shapeId);
    }
    
    // Add pool name label and edge measurements for drawn pools
    if (mode === 'pool') {
      addPoolNameLabel(fabricCanvas, points, shapeId, 'Custom Pool');
      addPoolEdgeLabels(fabricCanvas, points, shapeId);
    }

    const shape: DrawnShape = {
      id: shapeId,
      type: mode as 'property' | 'house' | 'pool',
      points,
      fabricObject: polygon,
    };

    if (mode === 'property') {
      setPropertyShape(shape);
      propertyShapeRef.current = shape;
      toast.success('Property boundary drawn! You can now draw the house or pool.');
    } else if (mode === 'house') {
      setHouseShapes(prev => [...prev, shape]);
      toast.success('House footprint added!');
    } else if (mode === 'pool') {
      setPoolShapes(prev => [...prev, shape]);
      toast.success('Pool added!');
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
        fontFamily: 'Poppins, sans-serif',
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

  // Add pool name label inside with 5% padding and auto-sizing text
  const addPoolNameLabel = (canvas: FabricCanvas, points: { x: number; y: number }[], shapeId: string, name: string) => {
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Calculate available space with 5% padding on each side
    const availableWidth = width * 0.9;
    const availableHeight = height * 0.9;
    
    // Start with a base font size and scale down to fit
    let fontSize = Math.min(availableHeight * 0.3, 16); // Max 16px or 30% of height
    
    // Estimate text width (approximate: each character ~0.6 * fontSize)
    const estimatedTextWidth = name.length * fontSize * 0.6;
    if (estimatedTextWidth > availableWidth) {
      fontSize = (availableWidth / name.length) / 0.6;
    }
    
    // Ensure minimum readable size
    fontSize = Math.max(fontSize, 6);
    
    // Center the label in the pool
    const labelX = minX + width / 2;
    const labelY = minY + height / 2;
    
    const nameLabel = new Text(name, {
      left: labelX,
      top: labelY,
      fontSize: fontSize,
      fill: '#000000',
      fontWeight: 'bold',
      fontFamily: 'Poppins, sans-serif',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    (nameLabel as any).isPoolLabel = true;
    (nameLabel as any).shapeId = shapeId;
    canvas.add(nameLabel);
  };
  
  // Add pool edge measurements
  const addPoolEdgeLabels = (canvas: FabricCanvas, points: { x: number; y: number }[], shapeId: string) => {
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
        fontSize: 10,
        fill: '#374151',
        fontFamily: 'Poppins, sans-serif',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      (text as any).isPoolEdgeLabel = true;
      (text as any).shapeId = shapeId;
      canvas.add(text);
    }
  };

  // Refresh all edge labels when unit changes
  const refreshEdgeLabels = useCallback(() => {
    if (!fabricCanvas) return;
    
    // Remove all existing edge labels and pool labels
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).isEdgeLabel || (obj as any).isPoolLabel || (obj as any).isPoolEdgeLabel) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Re-add labels for property only
    if (propertyShapeRef.current) {
      addEdgeLengthLabels(fabricCanvas, propertyShapeRef.current.points, propertyShapeRef.current.id);
    }
    
    // Re-add pool name labels and edge labels
    poolShapesRef.current.forEach(pool => {
      addPoolNameLabel(fabricCanvas, pool.points, pool.id, pool.name || 'Custom Pool');
      addPoolEdgeLabels(fabricCanvas, pool.points, pool.id);
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
      
      if (drawingModeRef.current === 'none' || drawingModeRef.current === 'move-house' || drawingModeRef.current === 'move-pool' || drawingModeRef.current === 'rotate-pool') return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      let snappedPoint = applySnapping({ x: pointer.x, y: pointer.y });

      // Check if drawing house or pool and point is outside property
      if ((drawingModeRef.current === 'house' || drawingModeRef.current === 'pool') && !isPointInsideProperty(snappedPoint)) {
        toast.error(`${drawingModeRef.current === 'house' ? 'House' : 'Pool'} must be drawn inside the property boundary`);
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
      const markerColor = drawingModeRef.current === 'property' ? '#22c55e' : drawingModeRef.current === 'pool' ? '#0EA5E9' : '#3b82f6';
      const marker = new Circle({
        left: snappedPoint.x,
        top: snappedPoint.y,
        radius: 4,
        fill: markerColor,
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
        const lineColor = drawingModeRef.current === 'property' ? '#22c55e' : drawingModeRef.current === 'pool' ? '#0EA5E9' : '#3b82f6';
        const line = new Line([prev.x, prev.y, snappedPoint.x, snappedPoint.y], {
          stroke: lineColor,
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
      
      if (drawingModeRef.current === 'none' || drawingModeRef.current === 'move-house' || drawingModeRef.current === 'move-pool' || drawingModeRef.current === 'rotate-pool' || currentPointsRef.current.length === 0) return;
      
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
          fontFamily: 'Poppins, sans-serif',
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

    // Handle pool movement
    const handlePoolMouseDown = (e: any) => {
      if (drawingModeRef.current !== 'move-pool') return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      // Check if clicked inside any pool
      for (let i = 0; i < poolShapesRef.current.length; i++) {
        const pool = poolShapesRef.current[i];
        if (isPointInsidePolygon({ x: pointer.x, y: pointer.y }, pool.points)) {
          setSelectedPoolIndex(i);
          setIsDraggingPool(true);
          poolDragStartRef.current = { x: pointer.x, y: pointer.y };
          originalPoolPointsRef.current = pool.points.map(p => ({ ...p }));
          return;
        }
      }
    };

    const handlePoolMouseMove = (e: any) => {
      if (!isDraggingPool || selectedPoolIndex === null || !poolDragStartRef.current || !originalPoolPointsRef.current) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      const dx = pointer.x - poolDragStartRef.current.x;
      const dy = pointer.y - poolDragStartRef.current.y;
      
      // Calculate new points
      const newPoints = originalPoolPointsRef.current.map(p => ({
        x: p.x + dx,
        y: p.y + dy,
      }));
      
      // Check if all points are still inside property
      const allInside = newPoints.every(p => isPointInsideProperty(p));
      if (!allInside) return;
      
      // Update pool shape
      updatePoolPosition(selectedPoolIndex, newPoints);
    };

    const handlePoolMouseUp = () => {
      if (isDraggingPool) {
        setIsDraggingPool(false);
        poolDragStartRef.current = null;
        originalPoolPointsRef.current = null;
      }
    };

    // Handle pool rotation
    const handleRotatePoolMouseDown = (e: any) => {
      if (drawingModeRef.current !== 'rotate-pool') return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      // Check if clicked inside any pool
      for (let i = 0; i < poolShapesRef.current.length; i++) {
        const pool = poolShapesRef.current[i];
        if (isPointInsidePolygon({ x: pointer.x, y: pointer.y }, pool.points)) {
          rotatingPoolIndexRef.current = i;
          setIsRotatingPool(true);
          
          // Calculate center of pool
          const centerX = pool.points.reduce((sum, p) => sum + p.x, 0) / pool.points.length;
          const centerY = pool.points.reduce((sum, p) => sum + p.y, 0) / pool.points.length;
          
          // Calculate initial angle from center to click point
          rotationStartAngleRef.current = Math.atan2(pointer.y - centerY, pointer.x - centerX);
          originalPoolPointsRef.current = pool.points.map(p => ({ ...p }));
          originalPoolRotationRef.current = poolRotationsRef.current[pool.id] || 0;
          return;
        }
      }
    };

    const handleRotatePoolMouseMove = (e: any) => {
      if (!isRotatingPool || rotatingPoolIndexRef.current === null || !originalPoolPointsRef.current) return;
      
      const pool = poolShapesRef.current[rotatingPoolIndexRef.current];
      if (!pool) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      // Calculate center of original pool
      const centerX = originalPoolPointsRef.current.reduce((sum, p) => sum + p.x, 0) / originalPoolPointsRef.current.length;
      const centerY = originalPoolPointsRef.current.reduce((sum, p) => sum + p.y, 0) / originalPoolPointsRef.current.length;
      
      // Calculate current angle
      const currentAngle = Math.atan2(pointer.y - centerY, pointer.x - centerX);
      let deltaAngle = currentAngle - rotationStartAngleRef.current;
      
      // Snap to 45 degrees if Shift is pressed
      if (shiftPressedRef.current) {
        const snapAngle = Math.PI / 4; // 45 degrees
        deltaAngle = Math.round(deltaAngle / snapAngle) * snapAngle;
      }
      
      // Rotate points around center
      const newPoints = originalPoolPointsRef.current.map(p => {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const cos = Math.cos(deltaAngle);
        const sin = Math.sin(deltaAngle);
        return {
          x: centerX + dx * cos - dy * sin,
          y: centerY + dx * sin + dy * cos,
        };
      });
      
      // Update pool shape
      updatePoolPosition(rotatingPoolIndexRef.current, newPoints);
      poolRotationsRef.current[pool.id] = originalPoolRotationRef.current + deltaAngle;
    };

    const handleRotatePoolMouseUp = () => {
      if (isRotatingPool) {
        setIsRotatingPool(false);
        rotatingPoolIndexRef.current = null;
        originalPoolPointsRef.current = null;
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
    fabricCanvas.on('mouse:down', handlePoolMouseDown);
    fabricCanvas.on('mouse:move', handlePoolMouseMove);
    fabricCanvas.on('mouse:up', handlePoolMouseUp);
    fabricCanvas.on('mouse:down', handleRotatePoolMouseDown);
    fabricCanvas.on('mouse:move', handleRotatePoolMouseMove);
    fabricCanvas.on('mouse:up', handleRotatePoolMouseUp);
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
      fabricCanvas.off('mouse:down', handlePoolMouseDown);
      fabricCanvas.off('mouse:move', handlePoolMouseMove);
      fabricCanvas.off('mouse:up', handlePoolMouseUp);
      fabricCanvas.off('mouse:down', handleRotatePoolMouseDown);
      fabricCanvas.off('mouse:move', handleRotatePoolMouseMove);
      fabricCanvas.off('mouse:up', handleRotatePoolMouseUp);
      fabricCanvas.off('mouse:up', handlePanMouseUp);
      fabricCanvas.off('mouse:down', handleVertexMouseDown);
      fabricCanvas.off('mouse:move', handleVertexMouseMove);
      fabricCanvas.off('mouse:up', handleVertexMouseUp);
    };
  }, [fabricCanvas, completeShape, gridSnapping, vertexSnapping, isDraggingHouse, selectedHouseIndex, isDraggingPool, selectedPoolIndex, isRotatingPool, isPanning]);

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
    
    // Create new polygon with hatch pattern
    const fabricPoints = newPoints.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: createHatchPattern(),
      stroke: '#000000',
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
        radius: 1.5,
        fill: '#000000',
        stroke: '#ffffff',
        strokeWidth: 1,
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

  // Update pool position
  const updatePoolPosition = (index: number, newPoints: { x: number; y: number }[]) => {
    if (!fabricCanvas) return;
    
    const pool = poolShapesRef.current[index];
    if (!pool) return;
    
    // Remove old polygon
    if (pool.fabricObject) {
      fabricCanvas.remove(pool.fabricObject);
    }
    
    // Remove old edge labels, vertex markers, and pool label
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeId === pool.id) {
        fabricCanvas.remove(obj);
      }
      if ((obj as any).parentPolygon === pool.fabricObject) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Create new polygon with water gradient and black stroke
    const fabricPoints = newPoints.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: createWaterGradient(newPoints),
      stroke: '#000000',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = 'pool';
    fabricCanvas.add(polygon);
    
    // Add new vertex markers
    newPoints.forEach((p, idx) => {
      const marker = new Circle({
        left: p.x,
        top: p.y,
        radius: 2,
        fill: '#000000',
        stroke: '#ffffff',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      (marker as any).vertexIndex = idx;
      (marker as any).parentPolygon = polygon;
      fabricCanvas.add(marker);
    });
    
    // Add pool name label and edge measurements
    addPoolNameLabel(fabricCanvas, newPoints, pool.id, pool.name || 'Custom Pool');
    addPoolEdgeLabels(fabricCanvas, newPoints, pool.id);
    
    // Update state
    const updatedPool: DrawnShape = {
      ...pool,
      points: newPoints,
      fabricObject: polygon,
    };
    
    setPoolShapes(prev => {
      const newShapes = [...prev];
      newShapes[index] = updatedPool;
      return newShapes;
    });
    poolShapesRef.current[index] = updatedPool;
    
    fabricCanvas.renderAll();
  };

  // Exit any drawing/move mode
  const exitMode = () => {
    if (!fabricCanvas) return;
    setDrawingMode('none');
    drawingModeRef.current = 'none';
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.hoverCursor = 'move';
  };

  // Start move house mode (toggle)
  const startMoveHouseMode = () => {
    if (!fabricCanvas) return;
    
    // Toggle off if already in move-house mode
    if (drawingMode === 'move-house') {
      exitMode();
      toast.info('Exited move house mode');
      return;
    }
    
    if (houseShapes.length === 0) {
      toast.error('No houses to move');
      return;
    }
    
    setDrawingMode('move-house');
    drawingModeRef.current = 'move-house';
    fabricCanvas.defaultCursor = 'move';
    fabricCanvas.hoverCursor = 'move';
    toast.info('Click and drag a house to move it. Click button again or press Escape to exit.');
  };

  // Start move pool mode (toggle)
  const startMovePoolMode = () => {
    if (!fabricCanvas) return;
    
    // Toggle off if already in move-pool mode
    if (drawingMode === 'move-pool') {
      exitMode();
      toast.info('Exited move pool mode');
      return;
    }
    
    if (poolShapes.length === 0) {
      toast.error('No pools to move');
      return;
    }
    
    setDrawingMode('move-pool');
    drawingModeRef.current = 'move-pool';
    fabricCanvas.defaultCursor = 'move';
    fabricCanvas.hoverCursor = 'move';
    toast.info('Click and drag a pool to move it. Click button again or press Escape to exit.');
  };

  // Start rotate pool mode (toggle)
  const startRotatePoolMode = () => {
    if (!fabricCanvas) return;
    
    // Toggle off if already in rotate-pool mode
    if (drawingMode === 'rotate-pool') {
      exitMode();
      toast.info('Exited rotate pool mode');
      return;
    }
    
    if (poolShapes.length === 0) {
      toast.error('No pools to rotate');
      return;
    }
    
    setDrawingMode('rotate-pool');
    drawingModeRef.current = 'rotate-pool';
    fabricCanvas.defaultCursor = 'crosshair';
    fabricCanvas.hoverCursor = 'crosshair';
    toast.info('Click and drag a pool to rotate it. Hold Shift to snap to 45°. Press Escape to exit.');
  };

  // Add preset pool
  const addPresetPool = (preset: PresetPool) => {
    if (!fabricCanvas || !propertyShapeRef.current) {
      toast.error('Please draw the property boundary first');
      return;
    }
    
    // Convert feet and inches to total feet, then to meters, then to pixels
    const widthFeet = preset.widthFeet + preset.widthInches / 12;
    const lengthFeet = preset.lengthFeet + preset.lengthInches / 12;
    const widthMeters = widthFeet / METERS_TO_FEET;
    const lengthMeters = lengthFeet / METERS_TO_FEET;
    const widthPixels = widthMeters * PIXELS_PER_METER;
    const lengthPixels = lengthMeters * PIXELS_PER_METER;
    
    // Find center of property
    const propPoints = propertyShapeRef.current.points;
    const centerX = propPoints.reduce((sum, p) => sum + p.x, 0) / propPoints.length;
    const centerY = propPoints.reduce((sum, p) => sum + p.y, 0) / propPoints.length;
    
    // Create rectangular pool points centered at property center
    const halfWidth = widthPixels / 2;
    const halfLength = lengthPixels / 2;
    const poolPoints = [
      { x: centerX - halfWidth, y: centerY - halfLength },
      { x: centerX + halfWidth, y: centerY - halfLength },
      { x: centerX + halfWidth, y: centerY + halfLength },
      { x: centerX - halfWidth, y: centerY + halfLength },
    ];
    
    createPoolShape(poolPoints, preset.displayName, widthFeet, lengthFeet);
  };

  // Add custom sized pool
  const addCustomPool = () => {
    if (!fabricCanvas || !propertyShapeRef.current) {
      toast.error('Please draw the property boundary first');
      return;
    }
    
    const widthFeet = parseFloat(customPoolWidth) || 12;
    const lengthFeet = parseFloat(customPoolLength) || 24;
    
    if (widthFeet <= 0 || lengthFeet <= 0) {
      toast.error('Please enter valid dimensions');
      return;
    }
    
    // Convert feet to meters, then to pixels
    const widthMeters = widthFeet / METERS_TO_FEET;
    const lengthMeters = lengthFeet / METERS_TO_FEET;
    const widthPixels = widthMeters * PIXELS_PER_METER;
    const lengthPixels = lengthMeters * PIXELS_PER_METER;
    
    // Find center of property
    const propPoints = propertyShapeRef.current.points;
    const centerX = propPoints.reduce((sum, p) => sum + p.x, 0) / propPoints.length;
    const centerY = propPoints.reduce((sum, p) => sum + p.y, 0) / propPoints.length;
    
    // Create rectangular pool points
    const halfWidth = widthPixels / 2;
    const halfLength = lengthPixels / 2;
    const poolPoints = [
      { x: centerX - halfWidth, y: centerY - halfLength },
      { x: centerX + halfWidth, y: centerY - halfLength },
      { x: centerX + halfWidth, y: centerY + halfLength },
      { x: centerX - halfWidth, y: centerY + halfLength },
    ];
    
    createPoolShape(poolPoints, `Custom ${widthFeet}'x${lengthFeet}'`, widthFeet, lengthFeet);
    setShowCustomPoolInput(false);
  };

  // Create pool shape helper
  const createPoolShape = (points: { x: number; y: number }[], name: string, widthFeet: number, lengthFeet: number) => {
    if (!fabricCanvas) return;
    
    const shapeId = `pool-${Date.now()}`;
    
    const fabricPoints = points.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: createWaterGradient(points),
      stroke: '#000000',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = 'pool';
    fabricCanvas.add(polygon);
    
    // Add vertex markers
    points.forEach((p, index) => {
      const marker = new Circle({
        left: p.x,
        top: p.y,
        radius: 2,
        fill: '#000000',
        stroke: '#ffffff',
        strokeWidth: 1,
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
      (marker as any).shapeType = 'pool';
      (marker as any).shapeId = shapeId;
      (marker as any).isVertexMarker = true;
      fabricCanvas.add(marker);
    });
    
    // Add pool name label and edge measurements
    addPoolNameLabel(fabricCanvas, points, shapeId, name);
    addPoolEdgeLabels(fabricCanvas, points, shapeId);
    
    const shape: DrawnShape = {
      id: shapeId,
      type: 'pool',
      points,
      fabricObject: polygon,
      name,
      widthFeet,
      lengthFeet,
    };
    
    setPoolShapes(prev => [...prev, shape]);
    poolShapesRef.current = [...poolShapesRef.current, shape];
    
    fabricCanvas.renderAll();
    toast.success(`${name} pool added!`);
  };

  // Delete last pool
  const deleteLastPool = () => {
    if (!fabricCanvas || poolShapesRef.current.length === 0) return;
    
    const lastPool = poolShapesRef.current[poolShapesRef.current.length - 1];
    
    // Remove polygon
    if (lastPool.fabricObject) {
      fabricCanvas.remove(lastPool.fabricObject);
    }
    
    // Remove edge labels, vertex markers, and pool label
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeId === lastPool.id || (obj as any).parentPolygon === lastPool.fabricObject) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Update state
    setPoolShapes(prev => prev.slice(0, -1));
    poolShapesRef.current = poolShapesRef.current.slice(0, -1);
    
    fabricCanvas.renderAll();
    toast.success('Pool deleted');
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
    houseShapesRef.current = [];
    setPoolShapes([]);
    poolShapesRef.current = [];
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

        {/* Pool Section */}
        <div className="flex items-center gap-2 border-r pr-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={!propertyShape} className="gap-1">
                <Waves className="h-4 w-4" />
                Add Pool
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white z-50">
              <DropdownMenuLabel>Preset Pools</DropdownMenuLabel>
              {PRESET_POOLS.map((preset) => (
                <DropdownMenuItem key={preset.name} onClick={() => addPresetPool(preset)}>
                  <span className="flex-1">{preset.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({preset.widthFeet}'{preset.widthInches > 0 ? `${preset.widthInches}"` : ''} × {preset.lengthFeet}'{preset.lengthInches > 0 ? `${preset.lengthInches}"` : ''})
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCustomPoolInput(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Custom Dimensions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => startDrawingMode('pool')}>
                <Pencil className="h-4 w-4 mr-2" />
                Draw Custom Shape
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {showCustomPoolInput && (
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border">
              <div className="flex items-center gap-1">
                <Label className="text-xs">W:</Label>
                <Input
                  type="number"
                  value={customPoolWidth}
                  onChange={(e) => setCustomPoolWidth(e.target.value)}
                  className="w-14 h-7 text-xs"
                  placeholder="12"
                />
                <span className="text-xs">ft</span>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">L:</Label>
                <Input
                  type="number"
                  value={customPoolLength}
                  onChange={(e) => setCustomPoolLength(e.target.value)}
                  className="w-14 h-7 text-xs"
                  placeholder="24"
                />
                <span className="text-xs">ft</span>
              </div>
              <Button size="sm" className="h-7 text-xs" onClick={addCustomPool}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCustomPoolInput(false)}>
                ✕
              </Button>
            </div>
          )}
          
          <Button
            size="sm"
            variant={drawingMode === 'move-pool' ? 'default' : 'outline'}
            onClick={startMovePoolMode}
            disabled={poolShapes.length === 0}
            title="Move Pool"
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={drawingMode === 'rotate-pool' ? 'default' : 'outline'}
            onClick={startRotatePoolMode}
            disabled={poolShapes.length === 0}
            title="Rotate Pool (Shift = 45° snap)"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={deleteLastPool}
            disabled={poolShapes.length === 0}
            title="Delete Last Pool"
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

        {drawingMode !== 'none' && drawingMode !== 'move-house' && drawingMode !== 'move-pool' && drawingMode !== 'rotate-pool' && currentPoints.length >= 3 && (
          <Button size="sm" variant="default" onClick={completeShape} className="ml-auto">
            Close Shape
          </Button>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-slate-100 border-b px-3 py-1.5 text-xs text-slate-600 flex items-center gap-4">
        <span>Property: {propertyShape ? '✓ Drawn' : '○ Not drawn'}</span>
        <span>Houses: {houseShapes.length}</span>
        <span className="text-sky-600">Pools: {poolShapes.length}</span>
        <span>Unit: {unit === 'ft' ? 'Feet' : 'Meters'}</span>
        {shiftPressed && <span className="text-primary font-medium">⇧ Angle Snap Active</span>}
        {spacePressed && <span className="text-primary font-medium">Pan Mode</span>}
        {drawingMode !== 'none' && (
          <span className="ml-auto font-medium text-primary">
            Mode: {drawingMode === 'property' ? 'Drawing Property' : drawingMode === 'house' ? 'Drawing House' : drawingMode === 'pool' ? 'Drawing Pool' : drawingMode === 'move-house' ? 'Moving House' : drawingMode === 'move-pool' ? 'Moving Pool' : 'Rotating Pool'}
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
