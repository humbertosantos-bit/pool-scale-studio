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
import { Undo2, Redo2, Grid3X3, Magnet, RotateCcw, Move, Trash2, ZoomIn, ZoomOut, Eye, EyeOff, Maximize, Waves, ChevronDown, Plus, Pencil, Ruler, Settings, Image, Lock, Unlock, Crosshair } from 'lucide-react';

interface ManualTracingCanvasProps {
  onStateChange?: (state: any) => void;
}

type DrawingMode = 'none' | 'property' | 'house' | 'pool' | 'move-house' | 'move-pool' | 'rotate-pool' | 'measure-draw' | 'paver' | 'scale-ref';
type UnitType = 'ft' | 'm';

interface MeasurementLine {
  id: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  fabricGroup?: Group;
  lengthPixels: number;
}

interface PaverDimensions {
  top: number; // feet
  bottom: number;
  left: number;
  right: number;
}

interface DrawnShape {
  id: string;
  type: 'property' | 'house' | 'pool' | 'paver';
  points: { x: number; y: number }[];
  fabricObject?: Polygon;
  name?: string;
  widthFeet?: number;
  lengthFeet?: number;
  copingSize?: number; // inches (12 or 16)
  paverDimensions?: PaverDimensions;
  isPreset?: boolean; // true for predefined pools, false for custom
}

interface StandalonePaver {
  id: string;
  points: { x: number; y: number }[];
  fabricObject?: Polygon | Rect;
  name: string;
  areaSqFt: number;
  areaWithWasteSqFt: number;
}

interface PoolCalculation {
  poolId: string;
  poolName: string;
  copingSqFt: number;
  paverNetSqFt: number;
  totalWithWasteSqFt: number;
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
  
  // Standalone paver zones
  const [standalonePavers, setStandalonePavers] = useState<StandalonePaver[]>([]);
  const standalonePaversRef = useRef<StandalonePaver[]>([]);
  const [showStandalonePaverInput, setShowStandalonePaverInput] = useState(false);
  const [standalonePaverWidthFeet, setStandalonePaverWidthFeet] = useState<string>('10');
  const [standalonePaverWidthInches, setStandalonePaverWidthInches] = useState<string>('0');
  const [standalonePaverLengthFeet, setStandalonePaverLengthFeet] = useState<string>('10');
  const [standalonePaverLengthInches, setStandalonePaverLengthInches] = useState<string>('0');
  const [standalonePaverName, setStandalonePaverName] = useState<string>('Paver Zone');
  
  // Measurement lines state
  const [measurementLines, setMeasurementLines] = useState<MeasurementLine[]>([]);
  const measurementLinesRef = useRef<MeasurementLine[]>([]);
  const [measurementStartPoint, setMeasurementStartPoint] = useState<{ x: number; y: number } | null>(null);
  const measurementStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const [measurementPreviewLine, setMeasurementPreviewLine] = useState<Line | null>(null);
  const measurementPreviewLineRef = useRef<Line | null>(null);
  const [measurementPreviewLabel, setMeasurementPreviewLabel] = useState<Text | null>(null);
  const measurementPreviewLabelRef = useRef<Text | null>(null);
  
  // Custom measurement input
  const [showMeasurementInput, setShowMeasurementInput] = useState(false);
  const [measurementFeet, setMeasurementFeet] = useState<string>('4');
  const [measurementInches, setMeasurementInches] = useState<string>('0');
  const [measurementMeters, setMeasurementMeters] = useState<string>('1.2');
  
// Custom pool dimensions input
  const [customPoolWidth, setCustomPoolWidth] = useState<string>('12');
  const [customPoolLength, setCustomPoolLength] = useState<string>('24');
  const [showCustomPoolInput, setShowCustomPoolInput] = useState(false);
  
  // Property input mode
  const [propertyInputMode, setPropertyInputMode] = useState<'draw' | 'measure'>('draw');
  const [showPropertyMeasureInput, setShowPropertyMeasureInput] = useState(false);
  const [propertyWidth, setPropertyWidth] = useState<string>('50');
  const [propertyLength, setPropertyLength] = useState<string>('100');
  
  // Coping and paver settings
  const [copingSize, setCopingSize] = useState<number>(12); // 12 or 16 inches (mandatory)
  const [paverTopFeet, setPaverTopFeet] = useState<string>('0');
  const [paverTopInches, setPaverTopInches] = useState<string>('0');
  const [paverBottomFeet, setPaverBottomFeet] = useState<string>('0');
  const [paverBottomInches, setPaverBottomInches] = useState<string>('0');
  const [paverLeftFeet, setPaverLeftFeet] = useState<string>('0');
  const [paverLeftInches, setPaverLeftInches] = useState<string>('0');
  const [paverRightFeet, setPaverRightFeet] = useState<string>('0');
  const [paverRightInches, setPaverRightInches] = useState<string>('0');
  const [showPaverSettings, setShowPaverSettings] = useState(false);
  
  // Pool editing state
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  
  // Pool calculations
  const [poolCalculations, setPoolCalculations] = useState<PoolCalculation[]>([]);
  
  // Selected item for deletion
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'house' | 'pool' | 'measurement' | 'paver' | null>(null);
  
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
  
  // Background image state
  const [backgroundImage, setBackgroundImage] = useState<FabricImage | null>(null);
  const backgroundImageRef = useRef<FabricImage | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5);
  const [backgroundLocked, setBackgroundLocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Scale reference state (2-point)
  const [scaleReferenceSet, setScaleReferenceSet] = useState(false);
  const [scalePixelsPerMeter, setScalePixelsPerMeter] = useState(20); // Default: 20px = 1m
  const scalePixelsPerMeterRef = useRef(20);
  const [scaleRefPoint1, setScaleRefPoint1] = useState<{ x: number; y: number } | null>(null);
  const scaleRefPoint1Ref = useRef<{ x: number; y: number } | null>(null);
  const [scaleRefPreviewLine, setScaleRefPreviewLine] = useState<Line | null>(null);
  const scaleRefPreviewLineRef = useRef<Line | null>(null);
  const [scaleRefMarkers, setScaleRefMarkers] = useState<Circle[]>([]);
  const scaleRefMarkersRef = useRef<Circle[]>([]);
  const [scaleRefLine, setScaleRefLine] = useState<Group | null>(null);
  const scaleRefLineRef = useRef<Group | null>(null);
  
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

  useEffect(() => {
    standalonePaversRef.current = standalonePavers;
  }, [standalonePavers]);

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

  // Offset polygon outward by a given distance (for coping around drawn pools)
  const offsetPolygon = (points: { x: number; y: number }[], offset: number): { x: number; y: number }[] => {
    const n = points.length;
    if (n < 3) return points;
    
    const result: { x: number; y: number }[] = [];
    
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const curr = points[i];
      const next = points[(i + 1) % n];
      
      // Calculate edge vectors
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      
      // Calculate edge lengths
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      if (len1 === 0 || len2 === 0) {
        result.push({ x: curr.x, y: curr.y });
        continue;
      }
      
      // Calculate outward normals (perpendicular to edges, pointing outward)
      // For a clockwise polygon, outward is to the left of the edge direction
      const nx1 = -dy1 / len1;
      const ny1 = dx1 / len1;
      const nx2 = -dy2 / len2;
      const ny2 = dx2 / len2;
      
      // Average the normals for the corner
      let nx = (nx1 + nx2) / 2;
      let ny = (ny1 + ny2) / 2;
      const nLen = Math.sqrt(nx * nx + ny * ny);
      
      if (nLen > 0) {
        nx /= nLen;
        ny /= nLen;
      }
      
      // Calculate the offset amount at this vertex (account for corner angle)
      const dot = nx1 * nx2 + ny1 * ny2;
      const angleFactor = Math.max(1 / Math.cos(Math.acos(Math.min(1, Math.max(-1, dot))) / 2), 1);
      const adjustedOffset = offset * Math.min(angleFactor, 2); // Cap to avoid extreme values
      
      result.push({
        x: curr.x + nx * adjustedOffset,
        y: curr.y + ny * adjustedOffset,
      });
    }
    
    return result;
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

  // Helper function to ensure background image is always at the very back
  const sendBackgroundToBack = useCallback((canvas: FabricCanvas) => {
    if (backgroundImageRef.current) {
      canvas.sendObjectToBack(backgroundImageRef.current);
    }
    // Then send grid behind it
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).isGrid) {
        canvas.sendObjectToBack(obj);
      }
    });
    // Now send background image to the very back again
    if (backgroundImageRef.current) {
      canvas.sendObjectToBack(backgroundImageRef.current);
    }
  }, []);

  // Scale measurement labels based on zoom level (only for measurement tool)
  const scaleMeasurementLabelsForZoom = useCallback((canvas: FabricCanvas, zoom: number) => {
    // For measurement labels, we want them to shrink when zooming in so they don't hide arrows
    // Scale factor is inverse of zoom - when zoomed in (zoom > 1), labels get smaller
    const baseFontSize = 7;
    const scaleFactor = 1 / zoom;
    // Clamp the scale factor to keep labels readable
    const clampedScale = Math.max(0.5, Math.min(2, scaleFactor));
    const newFontSize = baseFontSize * clampedScale;
    
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      // Scale labels inside measurement groups
      if ((obj as any).isMeasurementLine && obj instanceof Group) {
        const groupObjects = obj.getObjects();
        groupObjects.forEach(groupObj => {
          if (groupObj.type === 'text') {
            (groupObj as Text).set('fontSize', newFontSize);
          }
        });
      }
      // Scale preview measurement label
      if ((obj as any).isMeasurementPreviewLabel) {
        (obj as Text).set('fontSize', newFontSize);
      }
    });
    canvas.renderAll();
  }, []);

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
      
      // Clamp zoom between 0.25 and 6 (600%)
      newZoom = Math.max(0.25, Math.min(6, newZoom));
      
      // Zoom to mouse pointer position
      const pointer = fabricCanvas.getScenePoint(e);
      fabricCanvas.zoomToPoint(new Point(pointer.x, pointer.y), newZoom);
      
      setZoomLevel(newZoom);
      
      // Scale measurement labels for readability
      scaleMeasurementLabelsForZoom(fabricCanvas, newZoom);
    };

    fabricCanvas.on('mouse:wheel', handleWheel);

    return () => {
      fabricCanvas.off('mouse:wheel', handleWheel);
    };
  }, [fabricCanvas, scaleMeasurementLabelsForZoom]);

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

  // Handle background image upload
  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      
      // Remove existing background image if any
      if (backgroundImageRef.current) {
        fabricCanvas.remove(backgroundImageRef.current);
      }

      const img = await FabricImage.fromURL(dataUrl);
      
      // Scale image to fit canvas while maintaining aspect ratio
      const canvasWidth = fabricCanvas.width!;
      const canvasHeight = fabricCanvas.height!;
      const imgWidth = img.width!;
      const imgHeight = img.height!;
      
      const scaleX = canvasWidth / imgWidth;
      const scaleY = canvasHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
      
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        opacity: backgroundOpacity,
        selectable: !backgroundLocked,
        evented: !backgroundLocked,
        hasControls: true,
        hasBorders: true,
      });
      
      (img as any).isBackgroundImage = true;
      
      fabricCanvas.add(img);
      
      setBackgroundImage(img);
      backgroundImageRef.current = img;
      
      // Ensure background image is at the very back
      sendBackgroundToBack(fabricCanvas);
      
      fabricCanvas.renderAll();
      toast.success('Background image loaded. You can drag, scale, and rotate it to trace over.');
    };
    
    reader.readAsDataURL(file);
    
    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle background image lock
  const toggleBackgroundLock = () => {
    if (!backgroundImageRef.current || !fabricCanvas) return;
    
    const newLocked = !backgroundLocked;
    setBackgroundLocked(newLocked);
    
    backgroundImageRef.current.set({
      selectable: !newLocked,
      evented: !newLocked,
    });
    
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    toast.info(newLocked ? 'Background locked' : 'Background unlocked');
  };

  // Update background opacity
  const updateBackgroundOpacity = (opacity: number) => {
    setBackgroundOpacity(opacity);
    if (backgroundImageRef.current && fabricCanvas) {
      backgroundImageRef.current.set({ opacity });
      fabricCanvas.renderAll();
    }
  };

  // Remove background image
  const removeBackgroundImage = () => {
    if (!backgroundImageRef.current || !fabricCanvas) return;
    
    fabricCanvas.remove(backgroundImageRef.current);
    setBackgroundImage(null);
    backgroundImageRef.current = null;
    fabricCanvas.renderAll();
    toast.info('Background image removed');
  };

  // Start scale reference mode (2-point)
  const startScaleReferenceMode = () => {
    if (!fabricCanvas) return;
    
    // Toggle off if already in scale-ref mode
    if (drawingModeRef.current === 'scale-ref') {
      exitScaleRefMode();
      return;
    }
    
    // Clear any existing scale reference markers/line
    clearScaleReferenceVisuals();
    
    setDrawingMode('scale-ref');
    drawingModeRef.current = 'scale-ref';
    setScaleRefPoint1(null);
    scaleRefPoint1Ref.current = null;
    
    fabricCanvas.defaultCursor = 'crosshair';
    fabricCanvas.hoverCursor = 'crosshair';
    toast.info('Click two points on the image to set scale reference. A known distance between them.');
  };

  // Exit scale reference mode
  const exitScaleRefMode = () => {
    if (!fabricCanvas) return;
    
    setDrawingMode('none');
    drawingModeRef.current = 'none';
    setScaleRefPoint1(null);
    scaleRefPoint1Ref.current = null;
    
    // Remove preview line if any
    if (scaleRefPreviewLineRef.current) {
      fabricCanvas.remove(scaleRefPreviewLineRef.current);
      setScaleRefPreviewLine(null);
      scaleRefPreviewLineRef.current = null;
    }
    
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.hoverCursor = 'move';
    fabricCanvas.renderAll();
    toast.info('Exited scale reference mode');
  };

  // Clear scale reference visuals
  const clearScaleReferenceVisuals = () => {
    if (!fabricCanvas) return;
    
    // Remove markers
    scaleRefMarkersRef.current.forEach(marker => {
      fabricCanvas.remove(marker);
    });
    setScaleRefMarkers([]);
    scaleRefMarkersRef.current = [];
    
    // Remove line
    if (scaleRefLineRef.current) {
      fabricCanvas.remove(scaleRefLineRef.current);
      setScaleRefLine(null);
      scaleRefLineRef.current = null;
    }
    
    // Remove preview line
    if (scaleRefPreviewLineRef.current) {
      fabricCanvas.remove(scaleRefPreviewLineRef.current);
      setScaleRefPreviewLine(null);
      scaleRefPreviewLineRef.current = null;
    }
    
    fabricCanvas.renderAll();
  };

  // Handle scale reference click
  const handleScaleRefClick = (pointer: { x: number; y: number }) => {
    if (!fabricCanvas) return;
    
    if (!scaleRefPoint1Ref.current) {
      // First point
      scaleRefPoint1Ref.current = pointer;
      setScaleRefPoint1(pointer);
      
      // Add marker for first point (smaller like property/house markers)
      const marker = new Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 3,
        fill: '#22c55e',
        stroke: '#ffffff',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      (marker as any).isScaleRefMarker = true;
      fabricCanvas.add(marker);
      fabricCanvas.bringObjectToFront(marker);
      scaleRefMarkersRef.current.push(marker);
      setScaleRefMarkers([...scaleRefMarkersRef.current]);
      
      fabricCanvas.renderAll();
      toast.info('First point set. Click the second point.');
    } else {
      // Second point - prompt for distance
      const point1 = scaleRefPoint1Ref.current;
      const point2 = pointer;
      
      // Add marker for second point (smaller like property/house markers)
      const marker = new Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 3,
        fill: '#22c55e',
        stroke: '#ffffff',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      (marker as any).isScaleRefMarker = true;
      fabricCanvas.add(marker);
      fabricCanvas.bringObjectToFront(marker);
      scaleRefMarkersRef.current.push(marker);
      setScaleRefMarkers([...scaleRefMarkersRef.current]);
      
      // Remove preview line
      if (scaleRefPreviewLineRef.current) {
        fabricCanvas.remove(scaleRefPreviewLineRef.current);
        setScaleRefPreviewLine(null);
        scaleRefPreviewLineRef.current = null;
      }
      
      // Calculate pixel distance
      const dx = point2.x - point1.x;
      const dy = point2.y - point1.y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);
      
      // Prompt for real-world distance
      const distanceStr = prompt(`Enter the real-world distance between these two points (in ${unit === 'ft' ? 'feet' : 'meters'}):`);
      
      if (distanceStr && !isNaN(parseFloat(distanceStr))) {
        const realDistance = parseFloat(distanceStr);
        
        let realDistanceMeters: number;
        if (unit === 'ft') {
          realDistanceMeters = realDistance / METERS_TO_FEET;
        } else {
          realDistanceMeters = realDistance;
        }
        
        if (realDistanceMeters > 0) {
          // Calculate new pixels per meter
          const newPixelsPerMeter = pixelDistance / realDistanceMeters;
          setScalePixelsPerMeter(newPixelsPerMeter);
          scalePixelsPerMeterRef.current = newPixelsPerMeter;
          setScaleReferenceSet(true);
          
          const labelText = unit === 'ft' ? `${realDistance.toFixed(1)} ft` : `${realDistance.toFixed(2)} m`;
          
          toast.success(`Scale set! ${pixelDistance.toFixed(0)} pixels = ${labelText}`);
          
          // Clear scale reference visuals (markers and preview line) - scale value is kept
          clearScaleReferenceVisuals();
          
          // Exit scale ref mode
          setDrawingMode('none');
          drawingModeRef.current = 'none';
          setScaleRefPoint1(null);
          scaleRefPoint1Ref.current = null;
          fabricCanvas.defaultCursor = 'default';
          fabricCanvas.hoverCursor = 'move';
        }
      } else {
        // User cancelled - reset
        clearScaleReferenceVisuals();
        toast.info('Scale reference cancelled');
      }
      
      setScaleRefPoint1(null);
      scaleRefPoint1Ref.current = null;
      fabricCanvas.renderAll();
    }
  };

  // Reset scale reference
  const resetScaleReference = () => {
    clearScaleReferenceVisuals();
    setScalePixelsPerMeter(PIXELS_PER_METER);
    scalePixelsPerMeterRef.current = PIXELS_PER_METER;
    setScaleReferenceSet(false);
    toast.info('Scale reference reset to default');
  };

  // Get current pixels per meter (use custom scale if set, otherwise default)
  const getPixelsPerMeter = () => {
    return scalePixelsPerMeterRef.current;
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
        strokeWidth: 1,
        strokeDashArray: [8, 4],
        selectable: false,
        evented: false,
      });
      (polygon as any).shapeType = 'property';
      fabricCanvas.add(polygon);
      
      // Ensure background image and grid are at the very back
      sendBackgroundToBack(fabricCanvas);
      
      // Add new vertex markers
      newPoints.forEach((p, index) => {
        const marker = new Circle({
          left: p.x,
          top: p.y,
          radius: 3,
          fill: '#22c55e',
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
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      (polygon as any).shapeType = 'house';
      (polygon as any).shapeId = house.id;
      fabricCanvas.add(polygon);
      
      // Add new vertex markers
      newPoints.forEach((p, index) => {
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
      
      // Add house label ("maison")
      addHouseLabel(fabricCanvas, newPoints, house.id, 'maison');
      
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

  // Convert pixels to meters using the current scale
  const pixelsToMeters = (pixels: number): number => {
    return pixels / scalePixelsPerMeterRef.current;
  };

  // Convert pixels to current unit
  const pixelsToUnit = (pixels: number): number => {
    const meters = pixels / scalePixelsPerMeterRef.current;
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
    } else if (mode === 'paver') {
      toast.info('Click to trace a paver zone. Click near the first point to close the shape.');
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
      
      // Add coping around the drawn pool (follows perimeter shape)
      const currentScale = scalePixelsPerMeterRef.current;
      const copingSizeInFeet = copingSize / 12;
      const copingSizePixels = (copingSizeInFeet / METERS_TO_FEET) * currentScale;
      
      // Create offset polygon for coping (expand outward)
      const copingPoints = offsetPolygon(points, copingSizePixels);
      const copingFabricPoints = copingPoints.map(p => new Point(p.x, p.y));
      const copingPolygon = new Polygon(copingFabricPoints, {
        fill: '#525252', // Dark gray for coping
        stroke: '#000000',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      });
      (copingPolygon as any).shapeId = shapeId;
      (copingPolygon as any).isCoping = true;
      fabricCanvas.add(copingPolygon);
      
    } else if (mode === 'paver') {
      fill = '#d4d4d4'; // Light gray for standalone pavers
      stroke = '#78716c';
      strokeDashArray = [4, 2];
    } else {
      fill = 'rgba(100, 100, 100, 0.1)';
      stroke = '#666666';
    }

    // Create polygon
    const fabricPoints = points.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill,
      stroke,
      strokeWidth: mode === 'pool' ? 0.5 : 1,
      strokeDashArray,
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = mode;
    (polygon as any).shapeId = shapeId;
    
    fabricCanvas.add(polygon);

    // Add vertex markers for editing
    const newMarkers: Circle[] = [];
    const markerColor = mode === 'property' ? '#22c55e' : mode === 'paver' ? '#78716c' : '#000000';
    points.forEach((p, index) => {
      const marker = new Circle({
        left: p.x,
        top: p.y,
        radius: mode === 'property' ? 1.5 : (mode === 'pool' ? 0.5 : 1),
        fill: markerColor,
        stroke: '#ffffff',
        strokeWidth: mode === 'property' ? 0.5 : (mode === 'pool' ? 0.15 : 0.25),
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
      type: mode as 'property' | 'house' | 'pool' | 'paver',
      points,
      fabricObject: polygon,
    };

    if (mode === 'property') {
      setPropertyShape(shape);
      propertyShapeRef.current = shape;
      toast.success('Property boundary drawn! You can now draw the house or pool.');
    } else if (mode === 'house') {
      setHouseShapes(prev => [...prev, shape]);
      // Add "maison" label in the center of the house
      addHouseLabel(fabricCanvas, points, shapeId, 'maison');
      toast.success('House footprint added!');
    } else if (mode === 'pool') {
      setPoolShapes(prev => [...prev, shape]);
      toast.success('Pool added!');
    } else if (mode === 'paver') {
      // Calculate area for standalone paver
      const areaSqFt = calculatePolygonAreaSqFt(points);
      const areaWithWasteSqFt = areaSqFt * 1.10;
      const paverName = `Paver Zone ${standalonePaversRef.current.length + 1}`;
      
      const standalonePaver: StandalonePaver = {
        id: shapeId,
        points,
        fabricObject: polygon,
        name: paverName,
        areaSqFt: parseFloat(areaSqFt.toFixed(2)),
        areaWithWasteSqFt: parseFloat(areaWithWasteSqFt.toFixed(2)),
      };
      
      setStandalonePavers(prev => [...prev, standalonePaver]);
      standalonePaversRef.current = [...standalonePaversRef.current, standalonePaver];
      
      // Add paver name label with area
      addStandalonePaverLabel(fabricCanvas, points, shapeId, paverName, areaSqFt);
      
      toast.success(`Paver zone added! Area: ${areaSqFt.toFixed(2)} sq ft (${areaWithWasteSqFt.toFixed(2)} sq ft with 10% waste)`);
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

  // Add rectangular property from measurements
  const addRectangularProperty = useCallback(() => {
    if (!fabricCanvas) return;
    
    const widthValue = parseFloat(propertyWidth) || 0;
    const lengthValue = parseFloat(propertyLength) || 0;
    
    if (widthValue <= 0 || lengthValue <= 0) {
      toast.error('Please enter valid dimensions');
      return;
    }
    
    // Convert to meters based on unit selection
    let widthMeters: number;
    let lengthMeters: number;
    
    if (unit === 'ft') {
      widthMeters = widthValue / METERS_TO_FEET;
      lengthMeters = lengthValue / METERS_TO_FEET;
    } else {
      widthMeters = widthValue;
      lengthMeters = lengthValue;
    }
    
    const widthPixels = widthMeters * PIXELS_PER_METER;
    const lengthPixels = lengthMeters * PIXELS_PER_METER;
    
    // For display purposes
    const totalWidthFeet = unit === 'ft' ? widthValue : widthValue * METERS_TO_FEET;
    const totalLengthFeet = unit === 'ft' ? lengthValue : lengthValue * METERS_TO_FEET;
    
    // Center the property on the canvas
    const canvasWidth = fabricCanvas.width!;
    const canvasHeight = fabricCanvas.height!;
    const startX = (canvasWidth - widthPixels) / 2;
    const startY = (canvasHeight - lengthPixels) / 2;
    
    // Create rectangular points
    const points = [
      { x: startX, y: startY },
      { x: startX + widthPixels, y: startY },
      { x: startX + widthPixels, y: startY + lengthPixels },
      { x: startX, y: startY + lengthPixels },
    ];
    
    const shapeId = `property-${Date.now()}`;
    
    // Create polygon
    const fabricPoints = points.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: 'rgba(34, 197, 94, 0.1)',
      stroke: '#22c55e',
      strokeWidth: 1,
      strokeDashArray: [8, 4],
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = 'property';
    
    fabricCanvas.add(polygon);
    
    // Ensure background image and grid are at the very back
    sendBackgroundToBack(fabricCanvas);
    
    // Add vertex markers
    points.forEach((p, index) => {
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
      (marker as any).parentPoints = points;
      (marker as any).shapeType = 'property';
      (marker as any).shapeId = shapeId;
      (marker as any).isVertexMarker = true;
      
      fabricCanvas.add(marker);
    });
    
    // Add edge length labels
    addEdgeLengthLabels(fabricCanvas, points, shapeId);
    
    const shape: DrawnShape = {
      id: shapeId,
      type: 'property',
      points,
      fabricObject: polygon,
      widthFeet: totalWidthFeet,
      lengthFeet: totalLengthFeet,
    };
    
    setPropertyShape(shape);
    propertyShapeRef.current = shape;
    setShowPropertyMeasureInput(false);
    fabricCanvas.renderAll();
    toast.success('Property boundary created! You can now draw the house or pool.');
  }, [fabricCanvas, propertyWidth, propertyLength, unit]);

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
        top: midY - 6,
        fontSize: 6,
        fill: '#374151',
        fontFamily: 'Poppins, sans-serif',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
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

  // Add pool name label inside with 5% padding and auto-sizing text, aligned with the pool's length axis
  const addPoolNameLabel = (canvas: FabricCanvas, points: { x: number; y: number }[], shapeId: string, name: string, rotationAngle: number = 0, poolWidthFeet?: number, poolLengthFeet?: number) => {
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Determine if we need to add 90 degrees to align with length
    // If pool length > width, the text should be along the length (longer axis)
    // The pool is initially oriented with width horizontal and length vertical
    // So if length > width, we need to add 90 degrees to align text with the length
    let extraRotation = 0;
    if (poolLengthFeet && poolWidthFeet && poolLengthFeet > poolWidthFeet) {
      extraRotation = 90;
    }
    
    // Calculate available space - use the longer dimension for text
    const longerDim = Math.max(width, height);
    const shorterDim = Math.min(width, height);
    const availableWidth = longerDim * 0.9;
    const availableHeight = shorterDim * 0.9;
    
    // Start with a base font size and scale down to fit
    let fontSize = Math.min(availableHeight * 0.25, 9); // Max 9px or 25% of height
    
    // Estimate text width (approximate: each character ~0.55 * fontSize for bold)
    const estimatedTextWidth = name.length * fontSize * 0.55;
    if (estimatedTextWidth > availableWidth) {
      fontSize = (availableWidth / name.length) / 0.55;
    }
    
    // Ensure minimum readable size but cap at available space
    fontSize = Math.max(Math.min(fontSize, availableWidth / (name.length * 0.4)), 5);
    
    // Calculate center of pool polygon
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    
    const rotationDegrees = (rotationAngle * 180) / Math.PI + extraRotation;
    
    const nameLabel = new Text(name, {
      left: centerX,
      top: centerY,
      fontSize: fontSize,
      fill: '#000000',
      fontWeight: 'bold',
      fontFamily: 'Poppins, sans-serif',
      originX: 'center',
      originY: 'center',
      angle: rotationDegrees,
      selectable: false,
      evented: false,
    });
    (nameLabel as any).isPoolLabel = true;
    (nameLabel as any).shapeId = shapeId;
    canvas.add(nameLabel);
  };
  
  // Add house label ("maison") in the center
  const addHouseLabel = (canvas: FabricCanvas, points: { x: number; y: number }[], shapeId: string, name: string) => {
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Calculate available space with 10% padding
    const availableWidth = width * 0.8;
    const availableHeight = height * 0.8;
    
    // Start with a base font size and scale down to fit
    let fontSize = Math.min(availableHeight * 0.3, 10);
    
    // Estimate text width
    const estimatedTextWidth = name.length * fontSize * 0.6;
    if (estimatedTextWidth > availableWidth) {
      fontSize = (availableWidth / name.length) / 0.6;
    }
    
    // Ensure minimum readable size
    fontSize = Math.max(fontSize, 8);
    
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
    (nameLabel as any).isHouseLabel = true;
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
        top: midY - 6,
        fontSize: 5,
        fill: '#374151',
        fontFamily: 'Poppins, sans-serif',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
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

  // Calculate polygon area in sq ft using Shoelace formula
  const calculatePolygonAreaSqFt = (points: { x: number; y: number }[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Convert from pixels² to meters² then to feet²
    const areaMeters = area / (PIXELS_PER_METER * PIXELS_PER_METER);
    const areaFeet = areaMeters * (METERS_TO_FEET * METERS_TO_FEET);
    
    return areaFeet;
  };

  // Add label for standalone paver zones
  const addStandalonePaverLabel = (
    canvas: FabricCanvas,
    points: { x: number; y: number }[],
    shapeId: string,
    name: string,
    areaSqFt: number
  ) => {
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const areaWithWaste = (areaSqFt * 1.10).toFixed(1);
    const labelText = `${name}\n${areaSqFt.toFixed(1)} sq ft\n(${areaWithWaste} w/ waste)`;
    
    const nameLabel = new Text(labelText, {
      left: centerX,
      top: centerY,
      fontSize: 6,
      fill: '#44403c',
      fontWeight: 'bold',
      fontFamily: 'Poppins, sans-serif',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    (nameLabel as any).isStandalonePaverLabel = true;
    (nameLabel as any).shapeId = shapeId;
    canvas.add(nameLabel);
    
    // Add edge dimension labels for each side
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      const edgeLabel = formatMeasurement(pixelDist);

      const edgeText = new Text(edgeLabel, {
        left: midX,
        top: midY - 6,
        fontSize: 5,
        fill: '#78716c',
        fontFamily: 'Poppins, sans-serif',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      (edgeText as any).isStandalonePaverLabel = true;
      (edgeText as any).shapeId = shapeId;
      canvas.add(edgeText);
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
    
    // Re-add pool name labels and edge labels (only for custom pools)
    poolShapesRef.current.forEach(pool => {
      const rotationAngle = poolRotationsRef.current[pool.id] || 0;
      addPoolNameLabel(fabricCanvas, pool.points, pool.id, pool.name || 'Custom Pool', rotationAngle, pool.widthFeet, pool.lengthFeet);
      if (!pool.isPreset) {
        addPoolEdgeLabels(fabricCanvas, pool.points, pool.id);
      }
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
      
      // Handle measurement drawing mode
      if (drawingModeRef.current === 'measure-draw') {
        // Check if user clicked on an existing measurement - if so, let Fabric handle it (move/rotate)
        const target = e.target;
        if (target && (target as any).isMeasurementLine) {
          // User clicked on existing measurement - don't start new measurement
          // Fabric.js will handle selection and movement automatically
          return;
        }
        
        const pointer = fabricCanvas.getScenePoint(e.e);
        let snappedPoint = applySnapping({ x: pointer.x, y: pointer.y });
        
        // Apply angle snapping if Shift is pressed (straight lines)
        if (shiftPressedRef.current && measurementStartPointRef.current) {
          const dx = snappedPoint.x - measurementStartPointRef.current.x;
          const dy = snappedPoint.y - measurementStartPointRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          
          // Snap to 0°, 45°, 90°, etc.
          const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          snappedPoint = {
            x: measurementStartPointRef.current.x + Math.cos(snapAngle) * distance,
            y: measurementStartPointRef.current.y + Math.sin(snapAngle) * distance,
          };
        }
        
        if (!measurementStartPointRef.current) {
          // First click - set start point
          measurementStartPointRef.current = snappedPoint;
          setMeasurementStartPoint(snappedPoint);
          
          // Add a temporary marker (75% smaller for discreteness)
          const marker = new Circle({
            left: snappedPoint.x,
            top: snappedPoint.y,
            radius: 0.75,
            fill: '#dc2626',
            stroke: '#ffffff',
            strokeWidth: 0.25,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });
          (marker as any).isMeasurementTempMarker = true;
          fabricCanvas.add(marker);
          fabricCanvas.renderAll();
        } else {
          // Second click - complete the measurement
          addMeasurementFromPoints(measurementStartPointRef.current, snappedPoint);
          
          // Clean up temp marker, preview line, and preview label
          const objects = fabricCanvas.getObjects();
          objects.forEach(obj => {
            if ((obj as any).isMeasurementTempMarker || (obj as any).isMeasurementPreviewLine || (obj as any).isMeasurementPreviewLabel) {
              fabricCanvas.remove(obj);
            }
          });
          
          measurementStartPointRef.current = null;
          setMeasurementStartPoint(null);
          measurementPreviewLineRef.current = null;
          setMeasurementPreviewLine(null);
          measurementPreviewLabelRef.current = null;
          setMeasurementPreviewLabel(null);
          fabricCanvas.renderAll();
        }
        return;
      }
      
      // Handle scale reference mode
      if (drawingModeRef.current === 'scale-ref') {
        const pointer = fabricCanvas.getScenePoint(e.e);
        handleScaleRefClick({ x: pointer.x, y: pointer.y });
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

      // Add vertex marker (75% smaller for discreteness)
      const markerColor = drawingModeRef.current === 'property' ? '#22c55e' : drawingModeRef.current === 'pool' ? '#0EA5E9' : '#3b82f6';
      const marker = new Circle({
        left: snappedPoint.x,
        top: snappedPoint.y,
        radius: 1,
        fill: markerColor,
        stroke: '#ffffff',
        strokeWidth: 0.25,
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
          strokeWidth: 1,
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
      
      // Handle measurement preview
      if (drawingModeRef.current === 'measure-draw' && measurementStartPointRef.current) {
        const pointer = fabricCanvas.getScenePoint(e.e);
        let snappedPoint = applySnapping({ x: pointer.x, y: pointer.y });
        
        // Apply angle snapping if Shift is pressed (straight lines)
        if (shiftPressedRef.current) {
          const dx = snappedPoint.x - measurementStartPointRef.current.x;
          const dy = snappedPoint.y - measurementStartPointRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          
          // Snap to 0°, 45°, 90°, etc.
          const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          snappedPoint = {
            x: measurementStartPointRef.current.x + Math.cos(snapAngle) * distance,
            y: measurementStartPointRef.current.y + Math.sin(snapAngle) * distance,
          };
        }
        
        // Calculate measurement for real-time display
        const dx = snappedPoint.x - measurementStartPointRef.current.x;
        const dy = snappedPoint.y - measurementStartPointRef.current.y;
        const lengthPixels = Math.sqrt(dx * dx + dy * dy);
        const labelText = formatMeasurement(lengthPixels);
        const midX = (measurementStartPointRef.current.x + snappedPoint.x) / 2;
        const midY = (measurementStartPointRef.current.y + snappedPoint.y) / 2;
        
        // Calculate font size based on current zoom
        const currentZoom = fabricCanvas.getZoom();
        const baseFontSize = 7;
        const scaleFactor = Math.max(0.5, Math.min(2, 1 / currentZoom));
        const fontSize = baseFontSize * scaleFactor;
        
        // Update or create preview line
        if (measurementPreviewLineRef.current) {
          measurementPreviewLineRef.current.set({
            x2: snappedPoint.x,
            y2: snappedPoint.y,
          });
        } else {
          const line = new Line([
            measurementStartPointRef.current.x, 
            measurementStartPointRef.current.y, 
            snappedPoint.x, 
            snappedPoint.y
          ], {
            stroke: '#dc2626',
            strokeWidth: 1,
            strokeDashArray: [5, 3],
            selectable: false,
            evented: false,
            opacity: 0.7,
          });
          (line as any).isMeasurementPreviewLine = true;
          fabricCanvas.add(line);
          measurementPreviewLineRef.current = line;
          setMeasurementPreviewLine(line);
        }
        
        // Update or create preview label (real-time measurement display)
        if (measurementPreviewLabelRef.current) {
          measurementPreviewLabelRef.current.set({
            left: midX,
            top: midY - 10,
            text: labelText,
            fontSize: fontSize,
          });
        } else {
          const label = new Text(labelText, {
            left: midX,
            top: midY - 10,
            fontSize: fontSize,
            fill: '#dc2626',
            fontWeight: 'bold',
            fontFamily: 'Poppins, sans-serif',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });
          (label as any).isMeasurementPreviewLabel = true;
          fabricCanvas.add(label);
          measurementPreviewLabelRef.current = label;
          setMeasurementPreviewLabel(label);
        }
        
        fabricCanvas.renderAll();
        return;
      }
      
      // Handle scale reference preview
      if (drawingModeRef.current === 'scale-ref' && scaleRefPoint1Ref.current) {
        const pointer = fabricCanvas.getScenePoint(e.e);
        
        // Update or create preview line
        if (scaleRefPreviewLineRef.current) {
          scaleRefPreviewLineRef.current.set({
            x2: pointer.x,
            y2: pointer.y,
          });
        } else {
          const line = new Line([
            scaleRefPoint1Ref.current.x, 
            scaleRefPoint1Ref.current.y, 
            pointer.x, 
            pointer.y
          ], {
            stroke: '#22c55e',
            strokeWidth: 2,
            strokeDashArray: [6, 3],
            selectable: false,
            evented: false,
            opacity: 0.8,
          });
          (line as any).isScaleRefPreviewLine = true;
          fabricCanvas.add(line);
          scaleRefPreviewLineRef.current = line;
          setScaleRefPreviewLine(line);
        }
        
        fabricCanvas.renderAll();
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
          top: midY - 8,
          text: measurementText,
        });
      } else {
        const label = new Text(measurementText, {
          left: midX,
          top: midY - 8,
          fontSize: 7,
          fill: '#1f2937',
          fontWeight: 'bold',
          fontFamily: 'Poppins, sans-serif',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    
    // Handle rotation snapping for measurements (45° when Shift is pressed)
    const handleObjectRotating = (e: any) => {
      if (!e.e) return;
      const target = e.target;
      if (!target || !(target as any).isMeasurementLine) return;
      
      if ((e.e as MouseEvent).shiftKey) {
        const currentAngle = target.angle || 0;
        // Snap to 45-degree increments
        const snappedAngle = Math.round(currentAngle / 45) * 45;
        target.set('angle', snappedAngle);
        fabricCanvas.requestRenderAll();
      }
    };
    
    fabricCanvas.on('object:rotating', handleObjectRotating);
    
    // Handle selection of items by clicking
    const handleSelectionClick = (e: any) => {
      handleItemSelection(e);
    };
    fabricCanvas.on('mouse:dblclick', handleSelectionClick);

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
      fabricCanvas.off('object:rotating', handleObjectRotating);
      fabricCanvas.off('mouse:dblclick', handleSelectionClick);
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
      strokeWidth: 1,
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
    
    // Add house label ("maison")
    addHouseLabel(fabricCanvas, newPoints, house.id, 'maison');
    
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
    
    // Remove old polygon, coping, pavers, labels, and markers
    if (pool.fabricObject) {
      fabricCanvas.remove(pool.fabricObject);
    }
    
    // Remove all related objects (coping, pavers, labels, markers)
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeId === pool.id) {
        fabricCanvas.remove(obj);
      }
      if ((obj as any).parentPolygon === pool.fabricObject) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Get pool dimensions and settings
    const paverDims = pool.paverDimensions || { top: 0, bottom: 0, left: 0, right: 0 };
    const poolCopingSize = pool.copingSize || 12;
    
    // Get the stored rotation angle for this pool
    const rotationAngle = poolRotationsRef.current[pool.id] || 0;
    const rotationDegrees = (rotationAngle * 180) / Math.PI;
    
    // Calculate pool center from points
    const poolCenterX = newPoints.reduce((sum, p) => sum + p.x, 0) / newPoints.length;
    const poolCenterY = newPoints.reduce((sum, p) => sum + p.y, 0) / newPoints.length;
    
    // Calculate original pool dimensions (before rotation) using dynamic scale
    const currentScale = scalePixelsPerMeterRef.current;
    const widthFeet = pool.widthFeet || 12;
    const lengthFeet = pool.lengthFeet || 24;
    const poolWidth = (widthFeet / METERS_TO_FEET) * currentScale;
    const poolHeight = (lengthFeet / METERS_TO_FEET) * currentScale;
    
    // Calculate coping size in pixels
    const copingSizeInFeet = poolCopingSize / 12;
    const copingSizePixels = (copingSizeInFeet / METERS_TO_FEET) * currentScale;
    
    // Calculate paver dimensions in pixels
    // NOTE: Paver input includes coping, so total outer = pool + paver input (not pool + coping + pavers)
    const paverTopPixels = (paverDims.top / METERS_TO_FEET) * currentScale;
    const paverBottomPixels = (paverDims.bottom / METERS_TO_FEET) * currentScale;
    const paverLeftPixels = (paverDims.left / METERS_TO_FEET) * currentScale;
    const paverRightPixels = (paverDims.right / METERS_TO_FEET) * currentScale;
    
    // Total outer dimension = pool + paver input on each side (paver input includes coping)
    const totalOuterWidth = poolWidth + paverLeftPixels + paverRightPixels;
    const totalOuterHeight = poolHeight + paverTopPixels + paverBottomPixels;
    
    // Offset center based on asymmetric paver sizes (rotated)
    const baseOffsetX = (paverLeftPixels - paverRightPixels) / 2;
    const baseOffsetY = (paverTopPixels - paverBottomPixels) / 2;
    
    // Rotate the offset
    const cos = Math.cos(rotationAngle);
    const sin = Math.sin(rotationAngle);
    const rotatedOffsetX = baseOffsetX * cos - baseOffsetY * sin;
    const rotatedOffsetY = baseOffsetX * sin + baseOffsetY * cos;
    
    // Create paver zone rectangle (outermost) - light gray
    const hasPavers = paverDims.top > 0 || paverDims.bottom > 0 || paverDims.left > 0 || paverDims.right > 0;
    if (hasPavers) {
      const paverRect = new Rect({
        left: poolCenterX - rotatedOffsetX,
        top: poolCenterY - rotatedOffsetY,
        width: totalOuterWidth,
        height: totalOuterHeight,
        fill: '#d4d4d4',
        stroke: '#000000',
        strokeWidth: 0.5,
        originX: 'center',
        originY: 'center',
        angle: rotationDegrees,
        selectable: false,
        evented: false,
      });
      (paverRect as any).shapeId = pool.id;
      (paverRect as any).isPaverZone = true;
      fabricCanvas.add(paverRect);
      
      // Ensure background and grid are at the very back
      sendBackgroundToBack(fabricCanvas);
      
      // Keep property visible above grid
      const allObjects = fabricCanvas.getObjects();
      allObjects.forEach(obj => {
        if ((obj as any).shapeType === 'property') {
          fabricCanvas.sendObjectToBack(obj);
          fabricCanvas.bringObjectForward(obj);
          fabricCanvas.bringObjectForward(obj);
        }
      });
    }
    
    // Create coping rectangle (around pool) - dark gray
    const copingWidth = poolWidth + copingSizePixels * 2;
    const copingHeight = poolHeight + copingSizePixels * 2;
    
    const copingRect = new Rect({
      left: poolCenterX,
      top: poolCenterY,
      width: copingWidth,
      height: copingHeight,
      fill: '#525252',
      stroke: '#000000',
      strokeWidth: 0.5,
      originX: 'center',
      originY: 'center',
      angle: rotationDegrees,
      selectable: false,
      evented: false,
    });
    (copingRect as any).shapeId = pool.id;
    (copingRect as any).isCoping = true;
    fabricCanvas.add(copingRect);
    
    // Create new polygon with water gradient and black stroke
    const fabricPoints = newPoints.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: createWaterGradient(newPoints),
      stroke: '#000000',
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = 'pool';
    (polygon as any).shapeId = pool.id;
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
      (marker as any).shapeId = pool.id;
      fabricCanvas.add(marker);
    });
    
    // Add paver dimension labels
    if (hasPavers) {
      addPaverDimensionLabels(fabricCanvas, pool.id, poolCenterX, poolCenterY, totalOuterWidth, totalOuterHeight, paverDims, baseOffsetX, baseOffsetY, rotationDegrees);
    }
    
    // Add pool name label with rotation and edge measurements (only for custom pools)
    addPoolNameLabel(fabricCanvas, newPoints, pool.id, pool.name || 'Custom Pool', rotationAngle, pool.widthFeet, pool.lengthFeet);
    if (!pool.isPreset) {
      addPoolEdgeLabels(fabricCanvas, newPoints, pool.id);
    }
    
    // Ensure background image and grid are at the very back
    sendBackgroundToBack(fabricCanvas);
    
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
    
    // Convert feet and inches to total feet, then to meters, then to pixels using dynamic scale
    const widthFeet = preset.widthFeet + preset.widthInches / 12;
    const lengthFeet = preset.lengthFeet + preset.lengthInches / 12;
    const widthMeters = widthFeet / METERS_TO_FEET;
    const lengthMeters = lengthFeet / METERS_TO_FEET;
    const currentScale = scalePixelsPerMeterRef.current;
    const widthPixels = widthMeters * currentScale;
    const lengthPixels = lengthMeters * currentScale;
    
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
    
    createPoolShape(poolPoints, preset.displayName, widthFeet, lengthFeet, true);
    
    // Auto-deselect pool tool after adding
    exitMode();
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
    
    // Convert feet to meters, then to pixels using dynamic scale
    const widthMeters = widthFeet / METERS_TO_FEET;
    const lengthMeters = lengthFeet / METERS_TO_FEET;
    const currentScale = scalePixelsPerMeterRef.current;
    const widthPixels = widthMeters * currentScale;
    const lengthPixels = lengthMeters * currentScale;
    
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
    
    createPoolShape(poolPoints, `Custom ${widthFeet}'x${lengthFeet}'`, widthFeet, lengthFeet, false);
    setShowCustomPoolInput(false);
    
    // Auto-deselect pool tool after adding
    exitMode();
  };

  // Create pool shape helper with coping and pavers
  const createPoolShape = (points: { x: number; y: number }[], name: string, widthFeet: number, lengthFeet: number, isPreset: boolean = false) => {
    if (!fabricCanvas) return;
    
    const shapeId = `pool-${Date.now()}`;
    
    // Get paver dimensions (convert feet+inches to total feet)
    const paverDims: PaverDimensions = {
      top: (parseFloat(paverTopFeet) || 0) + (parseFloat(paverTopInches) || 0) / 12,
      bottom: (parseFloat(paverBottomFeet) || 0) + (parseFloat(paverBottomInches) || 0) / 12,
      left: (parseFloat(paverLeftFeet) || 0) + (parseFloat(paverLeftInches) || 0) / 12,
      right: (parseFloat(paverRightFeet) || 0) + (parseFloat(paverRightInches) || 0) / 12,
    };
    
    // Calculate coping size in pixels using dynamic scale
    const currentScale = scalePixelsPerMeterRef.current;
    const copingSizeInFeet = copingSize / 12;
    const copingSizePixels = (copingSizeInFeet / METERS_TO_FEET) * currentScale;
    
    // Calculate pool bounds
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    const poolWidth = maxX - minX;
    const poolHeight = maxY - minY;
    const poolCenterX = (minX + maxX) / 2;
    const poolCenterY = (minY + maxY) / 2;
    
    // Create paver zone rectangle (outermost) - light gray
    // NOTE: Paver input includes coping, so total outer = pool + paver input (not pool + coping + pavers)
    const paverTopPixels = (paverDims.top / METERS_TO_FEET) * currentScale;
    const paverBottomPixels = (paverDims.bottom / METERS_TO_FEET) * currentScale;
    const paverLeftPixels = (paverDims.left / METERS_TO_FEET) * currentScale;
    const paverRightPixels = (paverDims.right / METERS_TO_FEET) * currentScale;
    
    // Total outer dimension = pool + paver input on each side (paver input includes coping)
    const totalOuterWidth = poolWidth + paverLeftPixels + paverRightPixels;
    const totalOuterHeight = poolHeight + paverTopPixels + paverBottomPixels;
    
    // Offset center based on asymmetric paver sizes
    const offsetX = (paverLeftPixels - paverRightPixels) / 2;
    const offsetY = (paverTopPixels - paverBottomPixels) / 2;
    
    // Create paver zone rectangle
    const paverRect = new Rect({
      left: poolCenterX - offsetX,
      top: poolCenterY - offsetY,
      width: totalOuterWidth,
      height: totalOuterHeight,
      fill: '#d4d4d4', // Light gray for pavers
      stroke: '#000000',
      strokeWidth: 0.5,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    (paverRect as any).shapeId = shapeId;
    (paverRect as any).isPaverZone = true;
    fabricCanvas.add(paverRect);
    
    // Ensure background and grid are at the very back
    sendBackgroundToBack(fabricCanvas);
    
    // Keep property visible above grid
    const allObjs = fabricCanvas.getObjects();
    allObjs.forEach(obj => {
      if ((obj as any).shapeType === 'property') {
        fabricCanvas.sendObjectToBack(obj);
        fabricCanvas.bringObjectForward(obj);
        fabricCanvas.bringObjectForward(obj);
      }
    });
    // Also ensure property edge labels stay visible
    allObjs.forEach(obj => {
      if ((obj as any).isEdgeLabel && (obj as any).shapeId?.startsWith('property')) {
        fabricCanvas.bringObjectToFront(obj);
      }
    });
    
    // Create coping rectangle (around pool) - dark gray
    const copingWidth = poolWidth + copingSizePixels * 2;
    const copingHeight = poolHeight + copingSizePixels * 2;
    
    const copingRect = new Rect({
      left: poolCenterX,
      top: poolCenterY,
      width: copingWidth,
      height: copingHeight,
      fill: '#525252', // Dark gray for coping
      stroke: '#000000',
      strokeWidth: 0.5,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    (copingRect as any).shapeId = shapeId;
    (copingRect as any).isCoping = true;
    fabricCanvas.add(copingRect);
    
    // Create pool polygon
    const fabricPoints = points.map(p => new Point(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: createWaterGradient(points),
      stroke: '#000000',
      strokeWidth: 0.5,
      selectable: false,
      evented: false,
    });
    (polygon as any).shapeType = 'pool';
    (polygon as any).shapeId = shapeId;
    fabricCanvas.add(polygon);
    
    // Add vertex markers
    points.forEach((p, index) => {
      const marker = new Circle({
        left: p.x,
        top: p.y,
        radius: 1,
        fill: '#000000',
        stroke: '#ffffff',
        strokeWidth: 0.5,
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
    
    // Add paver dimension labels on each side (no rotation for new pools)
    addPaverDimensionLabels(fabricCanvas, shapeId, poolCenterX, poolCenterY, totalOuterWidth, totalOuterHeight, paverDims, offsetX, offsetY, 0);
    
    // Add pool name label
    addPoolNameLabel(fabricCanvas, points, shapeId, name, 0, widthFeet, lengthFeet);
    
    // Only add edge measurements for custom pools, not presets
    if (!isPreset) {
      addPoolEdgeLabels(fabricCanvas, points, shapeId);
    }
    
    // Ensure background image and grid are at the very back
    sendBackgroundToBack(fabricCanvas);
    
    // Ensure property stays above grid but below pool elements
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeType === 'property') {
        fabricCanvas.sendObjectToBack(obj);
        fabricCanvas.bringObjectForward(obj);
        fabricCanvas.bringObjectForward(obj);
      }
    });
    // Ensure property edge labels stay visible
    objects.forEach(obj => {
      if ((obj as any).isEdgeLabel && (obj as any).shapeId?.startsWith('property')) {
        fabricCanvas.bringObjectToFront(obj);
      }
    });
    
    const shape: DrawnShape = {
      id: shapeId,
      type: 'pool',
      points,
      fabricObject: polygon,
      name,
      widthFeet,
      lengthFeet,
      copingSize,
      paverDimensions: paverDims,
      isPreset,
    };
    
    setPoolShapes(prev => [...prev, shape]);
    poolShapesRef.current = [...poolShapesRef.current, shape];
    
    // Update calculations
    updatePoolCalculations(poolShapesRef.current);
    
    fabricCanvas.renderAll();
    toast.success(`${name} pool added!`);
  };
  
  // Add paver dimension labels
  const addPaverDimensionLabels = (
    canvas: FabricCanvas,
    shapeId: string,
    centerX: number,
    centerY: number,
    outerWidth: number,
    outerHeight: number,
    paverDims: PaverDimensions,
    offsetX: number,
    offsetY: number,
    rotationDegrees: number = 0
  ) => {
    const rotationRad = (rotationDegrees * Math.PI) / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    
    // Helper to rotate a point around center
    const rotatePoint = (x: number, y: number) => {
      const dx = x - centerX;
      const dy = y - centerY;
      return {
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
      };
    };
    
    const labelStyle = {
      fontSize: 5,
      fill: '#374151',
      fontFamily: 'Poppins, sans-serif',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      originX: 'center' as const,
      originY: 'center' as const,
      selectable: false,
      evented: false,
      angle: rotationDegrees,
    };
    
    // Top label
    if (paverDims.top > 0) {
      const baseX = centerX - offsetX;
      const baseY = centerY - offsetY - outerHeight / 2 + ((paverDims.top / METERS_TO_FEET) * PIXELS_PER_METER) / 2;
      const rotated = rotatePoint(baseX, baseY);
      const topLabel = new Text(`${paverDims.top} ft`, {
        ...labelStyle,
        left: rotated.x,
        top: rotated.y,
      });
      (topLabel as any).shapeId = shapeId;
      (topLabel as any).isPaverLabel = true;
      canvas.add(topLabel);
    }
    
    // Bottom label
    if (paverDims.bottom > 0) {
      const baseX = centerX - offsetX;
      const baseY = centerY - offsetY + outerHeight / 2 - ((paverDims.bottom / METERS_TO_FEET) * PIXELS_PER_METER) / 2;
      const rotated = rotatePoint(baseX, baseY);
      const bottomLabel = new Text(`${paverDims.bottom} ft`, {
        ...labelStyle,
        left: rotated.x,
        top: rotated.y,
      });
      (bottomLabel as any).shapeId = shapeId;
      (bottomLabel as any).isPaverLabel = true;
      canvas.add(bottomLabel);
    }
    
    // Left label
    if (paverDims.left > 0) {
      const baseX = centerX - offsetX - outerWidth / 2 + ((paverDims.left / METERS_TO_FEET) * PIXELS_PER_METER) / 2;
      const baseY = centerY - offsetY;
      const rotated = rotatePoint(baseX, baseY);
      const leftLabel = new Text(`${paverDims.left} ft`, {
        ...labelStyle,
        left: rotated.x,
        top: rotated.y,
      });
      (leftLabel as any).shapeId = shapeId;
      (leftLabel as any).isPaverLabel = true;
      canvas.add(leftLabel);
    }
    
    // Right label
    if (paverDims.right > 0) {
      const baseX = centerX - offsetX + outerWidth / 2 - ((paverDims.right / METERS_TO_FEET) * PIXELS_PER_METER) / 2;
      const baseY = centerY - offsetY;
      const rotated = rotatePoint(baseX, baseY);
      const rightLabel = new Text(`${paverDims.right} ft`, {
        ...labelStyle,
        left: rotated.x,
        top: rotated.y,
      });
      (rightLabel as any).shapeId = shapeId;
      (rightLabel as any).isPaverLabel = true;
      canvas.add(rightLabel);
    }
  };
  
  // Update pool calculations
  // NOTE: Paver input values INCLUDE coping. So if user enters 4 ft, it means 12" coping + 3 ft net pavers.
  // The visual shows the full input (4 ft), but calculation deducts coping to get net pavers.
  const updatePoolCalculations = (pools: DrawnShape[]) => {
    const calculations: PoolCalculation[] = pools.filter(p => p.type === 'pool').map(pool => {
      const widthFeet = pool.widthFeet || 0;
      const lengthFeet = pool.lengthFeet || 0;
      const copingSizeInches = pool.copingSize || 12;
      const copingSizeInFeet = copingSizeInches / 12;
      const paverDims = pool.paverDimensions || { top: 0, bottom: 0, left: 0, right: 0 };
      
      // Pool area
      const poolArea = widthFeet * lengthFeet;
      
      // Coping area = (pool + coping outer) - pool area
      const copingOuterWidth = widthFeet + (copingSizeInFeet * 2);
      const copingOuterLength = lengthFeet + (copingSizeInFeet * 2);
      const copingOuterArea = copingOuterWidth * copingOuterLength;
      const copingSqFt = copingOuterArea - poolArea;
      
      // Net paver dimensions = input - coping (since input includes coping)
      const netPaverTop = Math.max(0, paverDims.top - copingSizeInFeet);
      const netPaverBottom = Math.max(0, paverDims.bottom - copingSizeInFeet);
      const netPaverLeft = Math.max(0, paverDims.left - copingSizeInFeet);
      const netPaverRight = Math.max(0, paverDims.right - copingSizeInFeet);
      
      // Calculate net paver area (the actual paver zone minus the coping)
      // Total outer = pool + full paver input on each side
      const totalOuterWidth = widthFeet + paverDims.left + paverDims.right;
      const totalOuterLength = lengthFeet + paverDims.top + paverDims.bottom;
      const totalOuterArea = totalOuterWidth * totalOuterLength;
      
      // Net paver area = total outer area - coping outer area
      const paverNetSqFt = totalOuterArea - copingOuterArea;
      
      // Total = coping (net) + paver area (net), then apply 10% waste
      const combinedNet = copingSqFt + Math.max(0, paverNetSqFt);
      const totalWithWasteSqFt = combinedNet * 1.10;
      
      return {
        poolId: pool.id,
        poolName: pool.name || 'Pool',
        copingSqFt: parseFloat(copingSqFt.toFixed(2)),
        paverNetSqFt: parseFloat(Math.max(0, paverNetSqFt).toFixed(2)),
        totalWithWasteSqFt: parseFloat(totalWithWasteSqFt.toFixed(2)),
      };
    });
    
    setPoolCalculations(calculations);
  };

  // Update pool pavers (for editing existing pools)
  const updatePoolPavers = (poolId: string, newCopingSize: number, newPaverDims: PaverDimensions) => {
    if (!fabricCanvas) return;
    
    const poolIndex = poolShapesRef.current.findIndex(p => p.id === poolId);
    if (poolIndex === -1) return;
    
    const pool = poolShapesRef.current[poolIndex];
    
    // Update the pool's coping and paver dimensions
    const updatedPool: DrawnShape = {
      ...pool,
      copingSize: newCopingSize,
      paverDimensions: newPaverDims,
    };
    
    // Use updatePoolPosition to redraw with new dimensions
    poolShapesRef.current[poolIndex] = updatedPool;
    setPoolShapes(prev => {
      const newShapes = [...prev];
      newShapes[poolIndex] = updatedPool;
      return newShapes;
    });
    
    // Redraw the pool with new pavers
    updatePoolPosition(poolIndex, pool.points);
    
    // Update calculations
    updatePoolCalculations(poolShapesRef.current);
    
    toast.success('Pool pavers updated');
  };

  // Start editing a pool's pavers
  const startEditingPoolPavers = (poolId: string) => {
    const pool = poolShapesRef.current.find(p => p.id === poolId);
    if (!pool) return;
    
    // Load current pool's paver settings into the form
    setCopingSize(pool.copingSize || 12);
    const topTotal = pool.paverDimensions?.top || 0;
    const bottomTotal = pool.paverDimensions?.bottom || 0;
    const leftTotal = pool.paverDimensions?.left || 0;
    const rightTotal = pool.paverDimensions?.right || 0;
    setPaverTopFeet(String(Math.floor(topTotal)));
    setPaverTopInches(String(Math.round((topTotal % 1) * 12)));
    setPaverBottomFeet(String(Math.floor(bottomTotal)));
    setPaverBottomInches(String(Math.round((bottomTotal % 1) * 12)));
    setPaverLeftFeet(String(Math.floor(leftTotal)));
    setPaverLeftInches(String(Math.round((leftTotal % 1) * 12)));
    setPaverRightFeet(String(Math.floor(rightTotal)));
    setPaverRightInches(String(Math.round((rightTotal % 1) * 12)));
    
    setEditingPoolId(poolId);
    setShowPaverSettings(true);
  };

  // Apply paver edits to selected pool
  const applyPaverEdits = () => {
    if (!editingPoolId) return;
    
    const newPaverDims: PaverDimensions = {
      top: (parseFloat(paverTopFeet) || 0) + (parseFloat(paverTopInches) || 0) / 12,
      bottom: (parseFloat(paverBottomFeet) || 0) + (parseFloat(paverBottomInches) || 0) / 12,
      left: (parseFloat(paverLeftFeet) || 0) + (parseFloat(paverLeftInches) || 0) / 12,
      right: (parseFloat(paverRightFeet) || 0) + (parseFloat(paverRightInches) || 0) / 12,
    };
    
    updatePoolPavers(editingPoolId, copingSize, newPaverDims);
    setEditingPoolId(null);
  };

  // Cancel paver editing
  const cancelPaverEditing = () => {
    setEditingPoolId(null);
    // Reset form to defaults
    setCopingSize(12);
    setPaverTopFeet('0');
    setPaverTopInches('0');
    setPaverBottomFeet('0');
    setPaverBottomInches('0');
    setPaverLeftFeet('0');
    setPaverLeftInches('0');
    setPaverRightFeet('0');
    setPaverRightInches('0');
  };

  // Delete last pool
  const deleteLastPool = () => {
    if (!fabricCanvas || poolShapesRef.current.length === 0) return;
    
    const lastPool = poolShapesRef.current[poolShapesRef.current.length - 1];
    
    // Remove polygon
    if (lastPool.fabricObject) {
      fabricCanvas.remove(lastPool.fabricObject);
    }
    
    // Remove all related objects (coping, pavers, labels, markers)
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeId === lastPool.id || (obj as any).parentPolygon === lastPool.fabricObject) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Update state
    const newPoolShapes = poolShapesRef.current.slice(0, -1);
    setPoolShapes(newPoolShapes);
    poolShapesRef.current = newPoolShapes;
    
    // Update calculations
    updatePoolCalculations(newPoolShapes);
    
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
    const newZoom = Math.min(zoomLevel + 0.25, 6);
    setZoomLevel(newZoom);
    fabricCanvas.setZoom(newZoom);
    scaleMeasurementLabelsForZoom(fabricCanvas, newZoom);
  };

  const zoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoomLevel - 0.25, 0.5);
    setZoomLevel(newZoom);
    fabricCanvas.setZoom(newZoom);
    scaleMeasurementLabelsForZoom(fabricCanvas, newZoom);
  };

  const resetView = () => {
    if (!fabricCanvas) return;
    setZoomLevel(1);
    fabricCanvas.setZoom(1);
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    scaleMeasurementLabelsForZoom(fabricCanvas, 1);
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

      // Add marker (75% smaller for discreteness)
      const marker = new Circle({
        left: point.x,
        top: point.y,
        radius: 1,
        fill: drawingModeRef.current === 'property' ? '#22c55e' : '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 0.25,
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
          strokeWidth: 1,
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

  // Start measurement draw mode
  const startMeasureDrawMode = () => {
    if (!fabricCanvas) return;
    
    if (drawingMode === 'measure-draw') {
      exitMode();
      setMeasurementStartPoint(null);
      measurementStartPointRef.current = null;
      if (measurementPreviewLineRef.current) {
        fabricCanvas.remove(measurementPreviewLineRef.current);
        measurementPreviewLineRef.current = null;
      }
      toast.info('Exited measurement mode');
      return;
    }
    
    setDrawingMode('measure-draw');
    drawingModeRef.current = 'measure-draw';
    const cursor = createArrowCursor();
    fabricCanvas.defaultCursor = cursor;
    fabricCanvas.hoverCursor = cursor;
    toast.info('Click to place the first point of your measurement, then click the second point.');
  };

  // Create measurement line group (with arrows and label)
  const createMeasurementGroup = (
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    id: string
  ): Group => {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Create the main line (50% thinner)
    const mainLine = new Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
      stroke: '#dc2626',
      strokeWidth: 0.25,
      originX: 'center',
      originY: 'center',
    });
    
    // Dynamic arrow size: scales with length but has min/max bounds to avoid overlap (50% smaller)
    const baseArrowSize = Math.min(length * 0.08, 1.5); // 8% of length, max 1.5px
    const arrowSize = Math.max(baseArrowSize, 0.75); // Minimum 0.75px for readability
    const arrowAngle = Math.PI / 8; // Narrow angle for thin, sleek arrows
    
    // Start arrow (50% thinner)
    const startArrow1 = new Line([
      startPoint.x,
      startPoint.y,
      startPoint.x + arrowSize * Math.cos(angle - arrowAngle),
      startPoint.y + arrowSize * Math.sin(angle - arrowAngle),
    ], { stroke: '#dc2626', strokeWidth: 0.25 });
    
    const startArrow2 = new Line([
      startPoint.x,
      startPoint.y,
      startPoint.x + arrowSize * Math.cos(angle + arrowAngle),
      startPoint.y + arrowSize * Math.sin(angle + arrowAngle),
    ], { stroke: '#dc2626', strokeWidth: 0.25 });
    
    // End arrow (50% thinner)
    const endArrow1 = new Line([
      endPoint.x,
      endPoint.y,
      endPoint.x - arrowSize * Math.cos(angle - arrowAngle),
      endPoint.y - arrowSize * Math.sin(angle - arrowAngle),
    ], { stroke: '#dc2626', strokeWidth: 0.25 });
    
    const endArrow2 = new Line([
      endPoint.x,
      endPoint.y,
      endPoint.x - arrowSize * Math.cos(angle + arrowAngle),
      endPoint.y - arrowSize * Math.sin(angle + arrowAngle),
    ], { stroke: '#dc2626', strokeWidth: 0.25 });
    
    // Create measurement label - position beside the line for short measurements
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    const labelText = formatMeasurement(length);
    
    // Offset the label perpendicular to the line so it's beside it, not on top
    const perpAngle = angle + Math.PI / 2;
    const labelOffset = 8; // Pixels offset from the line
    const labelX = midX + labelOffset * Math.cos(perpAngle);
    const labelY = midY + labelOffset * Math.sin(perpAngle);
    
    const label = new Text(labelText, {
      left: labelX,
      top: labelY,
      fontSize: 7,
      fill: '#dc2626',
      fontWeight: 'bold',
      fontFamily: 'Poppins, sans-serif',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      originX: 'center',
      originY: 'center',
    });
    
    // Group all elements
    const group = new Group([mainLine, startArrow1, startArrow2, endArrow1, endArrow2, label], {
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockScalingX: true,
      lockScalingY: true,
    });
    
    // Only show rotation control
    (group as any).setControlsVisibility?.({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
      bl: false,
      br: false,
      tl: false,
      tr: false,
      mtr: true,
    });
    
    (group as any).isMeasurementLine = true;
    (group as any).measurementId = id;
    
    return group;
  };

  // Add measurement line from drawn points
  const addMeasurementFromPoints = (startPoint: { x: number; y: number }, endPoint: { x: number; y: number }) => {
    if (!fabricCanvas) return;
    
    const id = `measurement-${Date.now()}`;
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const lengthPixels = Math.sqrt(dx * dx + dy * dy);
    
    const group = createMeasurementGroup(startPoint, endPoint, id);
    fabricCanvas.add(group);
    fabricCanvas.bringObjectToFront(group);
    
    const measurement: MeasurementLine = {
      id,
      startPoint,
      endPoint,
      fabricGroup: group,
      lengthPixels,
    };
    
    setMeasurementLines(prev => [...prev, measurement]);
    measurementLinesRef.current = [...measurementLinesRef.current, measurement];
    
    fabricCanvas.renderAll();
    toast.success(`Measurement added: ${formatMeasurement(lengthPixels)}`);
  };

  // Add measurement from typed input
  const addMeasurementFromInput = () => {
    if (!fabricCanvas) return;
    
    let lengthInMeters: number;
    
    if (unit === 'ft') {
      const feet = parseFloat(measurementFeet) || 0;
      const inches = parseFloat(measurementInches) || 0;
      const totalFeet = feet + inches / 12;
      lengthInMeters = totalFeet / METERS_TO_FEET;
    } else {
      lengthInMeters = parseFloat(measurementMeters) || 0;
    }
    
    if (lengthInMeters <= 0) {
      toast.error('Please enter a valid measurement');
      return;
    }
    
    const lengthPixels = lengthInMeters * PIXELS_PER_METER;
    
    // Place in center of visible canvas
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const centerX = (fabricCanvas.width! / 2 - vpt[4]) / vpt[0];
    const centerY = (fabricCanvas.height! / 2 - vpt[5]) / vpt[3];
    
    const startPoint = { x: centerX - lengthPixels / 2, y: centerY };
    const endPoint = { x: centerX + lengthPixels / 2, y: centerY };
    
    const id = `measurement-${Date.now()}`;
    const group = createMeasurementGroup(startPoint, endPoint, id);
    fabricCanvas.add(group);
    fabricCanvas.bringObjectToFront(group);
    
    const measurement: MeasurementLine = {
      id,
      startPoint,
      endPoint,
      fabricGroup: group,
      lengthPixels,
    };
    
    setMeasurementLines(prev => [...prev, measurement]);
    measurementLinesRef.current = [...measurementLinesRef.current, measurement];
    
    setShowMeasurementInput(false);
    fabricCanvas.renderAll();
    toast.success(`Measurement added: ${formatMeasurement(lengthPixels)}`);
  };

  // Add standalone rectangular paver from measurements
  const addRectangularPaver = () => {
    if (!fabricCanvas) return;
    
    const widthFeet = (parseFloat(standalonePaverWidthFeet) || 0) + (parseFloat(standalonePaverWidthInches) || 0) / 12;
    const lengthFeet = (parseFloat(standalonePaverLengthFeet) || 0) + (parseFloat(standalonePaverLengthInches) || 0) / 12;
    
    if (widthFeet <= 0 || lengthFeet <= 0) {
      toast.error('Please enter valid dimensions');
      return;
    }
    
    // Convert feet to meters, then to pixels
    const widthMeters = widthFeet / METERS_TO_FEET;
    const lengthMeters = lengthFeet / METERS_TO_FEET;
    const widthPixels = widthMeters * PIXELS_PER_METER;
    const lengthPixels = lengthMeters * PIXELS_PER_METER;
    
    // Place in center of visible canvas
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const centerX = (fabricCanvas.width! / 2 - vpt[4]) / vpt[0];
    const centerY = (fabricCanvas.height! / 2 - vpt[5]) / vpt[3];
    
    const halfWidth = widthPixels / 2;
    const halfLength = lengthPixels / 2;
    
    // Create rectangular points
    const points = [
      { x: centerX - halfWidth, y: centerY - halfLength },
      { x: centerX + halfWidth, y: centerY - halfLength },
      { x: centerX + halfWidth, y: centerY + halfLength },
      { x: centerX - halfWidth, y: centerY + halfLength },
    ];
    
    const shapeId = `paver-${Date.now()}`;
    const paverName = standalonePaverName || `Paver Zone ${standalonePaversRef.current.length + 1}`;
    
    // Calculate area
    const areaSqFt = widthFeet * lengthFeet;
    const areaWithWasteSqFt = areaSqFt * 1.10;
    
    // Create rectangle
    const rect = new Rect({
      left: centerX,
      top: centerY,
      width: widthPixels,
      height: lengthPixels,
      fill: '#d4d4d4',
      stroke: '#78716c',
      strokeWidth: 1,
      strokeDashArray: [4, 2],
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    (rect as any).shapeId = shapeId;
    (rect as any).isStandalonePaver = true;
    fabricCanvas.add(rect);
    
    // Add vertex markers
    points.forEach((p, index) => {
      const marker = new Circle({
        left: p.x,
        top: p.y,
        radius: 2,
        fill: '#78716c',
        stroke: '#ffffff',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      (marker as any).vertexIndex = index;
      (marker as any).shapeId = shapeId;
      (marker as any).isVertexMarker = true;
      fabricCanvas.add(marker);
    });
    
    // Add label
    addStandalonePaverLabel(fabricCanvas, points, shapeId, paverName, areaSqFt);
    
    const standalonePaver: StandalonePaver = {
      id: shapeId,
      points,
      fabricObject: rect,
      name: paverName,
      areaSqFt: parseFloat(areaSqFt.toFixed(2)),
      areaWithWasteSqFt: parseFloat(areaWithWasteSqFt.toFixed(2)),
    };
    
    setStandalonePavers(prev => [...prev, standalonePaver]);
    standalonePaversRef.current = [...standalonePaversRef.current, standalonePaver];
    
    setShowStandalonePaverInput(false);
    setStandalonePaverName('Paver Zone');
    fabricCanvas.renderAll();
    
    toast.success(`${paverName} added! Area: ${areaSqFt.toFixed(2)} sq ft (${areaWithWasteSqFt.toFixed(2)} sq ft with 10% waste)`);
  };

  // Delete last standalone paver
  const deleteLastStandalonePaver = () => {
    if (!fabricCanvas || standalonePaversRef.current.length === 0) return;
    
    const lastPaver = standalonePaversRef.current[standalonePaversRef.current.length - 1];
    
    // Remove fabric objects
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeId === lastPaver.id) {
        fabricCanvas.remove(obj);
      }
    });
    
    setStandalonePavers(prev => prev.slice(0, -1));
    standalonePaversRef.current = standalonePaversRef.current.slice(0, -1);
    
    fabricCanvas.renderAll();
    toast.success('Paver zone deleted');
  };

  // Delete last measurement
  const deleteLastMeasurement = () => {
    if (!fabricCanvas || measurementLinesRef.current.length === 0) return;
    
    const lastMeasurement = measurementLinesRef.current[measurementLinesRef.current.length - 1];
    
    if (lastMeasurement.fabricGroup) {
      fabricCanvas.remove(lastMeasurement.fabricGroup);
    }
    
    setMeasurementLines(prev => prev.slice(0, -1));
    measurementLinesRef.current = measurementLinesRef.current.slice(0, -1);
    
    fabricCanvas.renderAll();
    toast.success('Measurement deleted');
  };

  // Delete selected item
  const deleteSelectedItem = () => {
    if (!fabricCanvas || !selectedItemId || !selectedItemType) return;
    
    if (selectedItemType === 'house') {
      const houseIndex = houseShapesRef.current.findIndex(h => h.id === selectedItemId);
      if (houseIndex === -1) return;
      
      const house = houseShapesRef.current[houseIndex];
      
      // Remove polygon
      if (house.fabricObject) {
        fabricCanvas.remove(house.fabricObject);
      }
      
      // Remove related objects
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).shapeId === house.id || (obj as any).parentPolygon === house.fabricObject) {
          fabricCanvas.remove(obj);
        }
      });
      
      // Update state
      const newHouseShapes = houseShapesRef.current.filter(h => h.id !== selectedItemId);
      setHouseShapes(newHouseShapes);
      houseShapesRef.current = newHouseShapes;
      
      toast.success('House deleted');
    } else if (selectedItemType === 'pool') {
      const poolIndex = poolShapesRef.current.findIndex(p => p.id === selectedItemId);
      if (poolIndex === -1) return;
      
      const pool = poolShapesRef.current[poolIndex];
      
      // Remove polygon
      if (pool.fabricObject) {
        fabricCanvas.remove(pool.fabricObject);
      }
      
      // Remove all related objects
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).shapeId === pool.id || (obj as any).parentPolygon === pool.fabricObject) {
          fabricCanvas.remove(obj);
        }
      });
      
      // Update state
      const newPoolShapes = poolShapesRef.current.filter(p => p.id !== selectedItemId);
      setPoolShapes(newPoolShapes);
      poolShapesRef.current = newPoolShapes;
      
      // Update calculations
      updatePoolCalculations(newPoolShapes);
      
      toast.success('Pool deleted');
    } else if (selectedItemType === 'measurement') {
      const measurement = measurementLinesRef.current.find(m => m.id === selectedItemId);
      if (!measurement) return;
      
      if (measurement.fabricGroup) {
        fabricCanvas.remove(measurement.fabricGroup);
      }
      
      const newMeasurements = measurementLinesRef.current.filter(m => m.id !== selectedItemId);
      setMeasurementLines(newMeasurements);
      measurementLinesRef.current = newMeasurements;
      
      toast.success('Measurement deleted');
    } else if (selectedItemType === 'paver') {
      const paver = standalonePaversRef.current.find(p => p.id === selectedItemId);
      if (!paver) return;
      
      // Remove fabric objects
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).shapeId === paver.id) {
          fabricCanvas.remove(obj);
        }
      });
      
      const newPavers = standalonePaversRef.current.filter(p => p.id !== selectedItemId);
      setStandalonePavers(newPavers);
      standalonePaversRef.current = newPavers;
      
      toast.success('Paver zone deleted');
    }
    
    // Clear selection
    setSelectedItemId(null);
    setSelectedItemType(null);
    fabricCanvas.renderAll();
  };

  // Handle clicking on items to select them
  const handleItemSelection = (e: any) => {
    if (!fabricCanvas) return;
    if (drawingModeRef.current !== 'none') return;
    if (spacePressedRef.current) return;
    
    const pointer = fabricCanvas.getScenePoint(e.e);
    
    // Check if clicked on a measurement (fabric group)
    const target = e.target;
    if (target && (target as any).isMeasurementLine) {
      const measurementId = (target as any).measurementId;
      if (measurementId) {
        setSelectedItemId(measurementId);
        setSelectedItemType('measurement');
        highlightSelectedItem(measurementId, 'measurement');
        return;
      }
    }
    
    // Check pools first (they might overlap with other shapes)
    for (const pool of poolShapesRef.current) {
      if (isPointInsidePolygon({ x: pointer.x, y: pointer.y }, pool.points)) {
        setSelectedItemId(pool.id);
        setSelectedItemType('pool');
        highlightSelectedItem(pool.id, 'pool');
        return;
      }
    }
    
    // Check houses
    for (const house of houseShapesRef.current) {
      if (isPointInsidePolygon({ x: pointer.x, y: pointer.y }, house.points)) {
        setSelectedItemId(house.id);
        setSelectedItemType('house');
        highlightSelectedItem(house.id, 'house');
        return;
      }
    }
    
    // Check standalone pavers
    for (const paver of standalonePaversRef.current) {
      if (isPointInsidePolygon({ x: pointer.x, y: pointer.y }, paver.points)) {
        setSelectedItemId(paver.id);
        setSelectedItemType('paver');
        highlightSelectedItem(paver.id, 'paver');
        return;
      }
    }
    
    // If clicked on nothing, clear selection
    setSelectedItemId(null);
    setSelectedItemType(null);
    clearHighlight();
  };

  // Highlight the selected item
  const highlightSelectedItem = (itemId: string, itemType: 'house' | 'pool' | 'measurement' | 'paver') => {
    if (!fabricCanvas) return;
    
    // First clear any existing highlight
    clearHighlight();
    
    // Find and highlight the object
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).shapeId === itemId || (obj as any).measurementId === itemId) {
        if (obj instanceof Polygon || obj instanceof Rect) {
          (obj as any).originalStrokeWidth = obj.strokeWidth;
          (obj as any).originalStroke = obj.stroke;
          obj.set({
            strokeWidth: 3,
            stroke: '#ef4444', // Red highlight
          });
          (obj as any).isHighlighted = true;
        }
        if ((obj as any).isMeasurementLine && obj instanceof Group) {
          (obj as any).isHighlighted = true;
          // Highlight the line in the group
          obj.getObjects().forEach(child => {
            if (child instanceof Line) {
              (child as any).originalStroke = child.stroke;
              child.set({ stroke: '#ef4444' });
            }
          });
        }
      }
    });
    
    fabricCanvas.renderAll();
  };

  // Clear highlight from all objects
  const clearHighlight = () => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).isHighlighted) {
        if (obj instanceof Polygon || obj instanceof Rect) {
          obj.set({
            strokeWidth: (obj as any).originalStrokeWidth || 1,
            stroke: (obj as any).originalStroke || '#000000',
          });
        }
        if (obj instanceof Group) {
          obj.getObjects().forEach(child => {
            if (child instanceof Line && (child as any).originalStroke) {
              child.set({ stroke: (child as any).originalStroke });
            }
          });
        }
        (obj as any).isHighlighted = false;
      }
    });
    
    fabricCanvas.renderAll();
  };

  // Reset canvas
  const resetCanvas = () => {
    if (!fabricCanvas) return;
    
    // Remove all non-grid and non-north-indicator objects
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if (!(obj as any).isGrid && !(obj as any).isNorthIndicator) {
        fabricCanvas.remove(obj);
      }
    });
    
    setPropertyShape(null);
    propertyShapeRef.current = null;
    setHouseShapes([]);
    houseShapesRef.current = [];
    setPoolShapes([]);
    poolShapesRef.current = [];
    setMeasurementLines([]);
    measurementLinesRef.current = [];
    setStandalonePavers([]);
    standalonePaversRef.current = [];
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setDrawnLines([]);
    setVertexMarkers([]);
    setDrawingMode('none');
    drawingModeRef.current = 'none';
    setUndoStack([]);
    setRedoStack([]);
    setPoolCalculations([]);
    
    // Re-add north indicator
    addNorthIndicator(fabricCanvas);
    
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={!!propertyShape} className="gap-1">
                Add Property
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white z-50">
              <DropdownMenuItem onClick={() => startDrawingMode('property')}>
                <Pencil className="h-4 w-4 mr-2" />
                Draw Property Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPropertyMeasureInput(true)}>
                <Ruler className="h-4 w-4 mr-2" />
                Enter Measurements (Rectangle)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {showPropertyMeasureInput && !propertyShape && (
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border">
              <div className="flex items-center gap-1">
                <Label className="text-xs">W:</Label>
                <Input
                  type="number"
                  value={propertyWidth}
                  onChange={(e) => setPropertyWidth(e.target.value)}
                  className="w-14 h-7 text-xs"
                  placeholder="50"
                  step={unit === 'm' ? '0.1' : '1'}
                />
                <span className="text-xs">{unit === 'ft' ? 'ft' : 'm'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">L:</Label>
                <Input
                  type="number"
                  value={propertyLength}
                  onChange={(e) => setPropertyLength(e.target.value)}
                  className="w-14 h-7 text-xs"
                  placeholder="100"
                  step={unit === 'm' ? '0.1' : '1'}
                />
                <span className="text-xs">{unit === 'ft' ? 'ft' : 'm'}</span>
              </div>
              <Button size="sm" className="h-7 text-xs" onClick={addRectangularProperty}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowPropertyMeasureInput(false)}>
                ✕
              </Button>
            </div>
          )}
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
          
          {/* Coping & Paver Settings */}
          <Button
            size="sm"
            variant={showPaverSettings ? 'default' : 'outline'}
            onClick={() => setShowPaverSettings(!showPaverSettings)}
            title="Coping & Paver Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Coping & Paver Settings Panel */}
        {showPaverSettings && (
          <div className="flex items-center gap-3 bg-amber-50 p-2 rounded border border-amber-200">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium">Coping:</Label>
              <Button
                size="sm"
                variant={copingSize === 12 ? 'default' : 'outline'}
                className="h-6 text-xs px-2"
                onClick={() => setCopingSize(12)}
              >
                12"
              </Button>
              <Button
                size="sm"
                variant={copingSize === 16 ? 'default' : 'outline'}
                className="h-6 text-xs px-2"
                onClick={() => setCopingSize(16)}
              >
                16"
              </Button>
            </div>
            <div className="border-l pl-3 flex items-center gap-2 flex-wrap">
              <Label className="text-xs font-medium">Pavers:</Label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Top:</span>
                <Input
                  type="number"
                  value={paverTopFeet}
                  onChange={(e) => setPaverTopFeet(e.target.value)}
                  className="w-8 h-6 text-xs text-center p-0"
                  min="0"
                />
                <span className="text-[10px]">'</span>
                <Input
                  type="number"
                  value={paverTopInches}
                  onChange={(e) => setPaverTopInches(e.target.value)}
                  className="w-8 h-6 text-xs text-center p-0"
                  min="0"
                  max="11"
                />
                <span className="text-[10px]">"</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Bot:</span>
                <Input
                  type="number"
                  value={paverBottomFeet}
                  onChange={(e) => setPaverBottomFeet(e.target.value)}
                  className="w-8 h-6 text-xs text-center p-0"
                  min="0"
                />
                <span className="text-[10px]">'</span>
                <Input
                  type="number"
                  value={paverBottomInches}
                  onChange={(e) => setPaverBottomInches(e.target.value)}
                  className="w-8 h-6 text-xs text-center p-0"
                  min="0"
                  max="11"
                />
                <span className="text-[10px]">"</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Left:</span>
                <Input
                  type="number"
                  value={paverLeftFeet}
                  onChange={(e) => setPaverLeftFeet(e.target.value)}
                  className="w-8 h-6 text-xs text-center p-0"
                  min="0"
                />
                <span className="text-[10px]">'</span>
                <Input
                  type="number"
                  value={paverLeftInches}
                  onChange={(e) => setPaverLeftInches(e.target.value)}
                  className="w-8 h-6 text-xs text-center p-0"
                  min="0"
                  max="11"
                />
                <span className="text-[10px]">"</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Right:</span>
                <Input
                  type="number"
                  value={paverRightFeet}
                  onChange={(e) => setPaverRightFeet(e.target.value)}
                  className="w-8 h-6 text-xs text-center p-0"
                  min="0"
                />
                <span className="text-[10px]">'</span>
                <Input
                  type="number"
                  value={paverRightInches}
                  onChange={(e) => setPaverRightInches(e.target.value)}
                  className="w-8 h-6 text-xs text-center p-0"
                  min="0"
                  max="11"
                />
                <span className="text-[10px]">"</span>
              </div>
            </div>
            {editingPoolId ? (
              <div className="flex items-center gap-2 border-l pl-3">
                <span className="text-[10px] text-amber-700 font-medium">Editing: {poolShapes.find(p => p.id === editingPoolId)?.name || 'Pool'}</span>
                <Button size="sm" className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700" onClick={applyPaverEdits}>
                  Apply
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={cancelPaverEditing}>
                  Cancel
                </Button>
              </div>
            ) : (
              <span className="text-[10px] text-amber-700 italic">Set before adding pool</span>
            )}
          </div>
        )}

        {/* Standalone Paver Section */}
        <div className="flex items-center gap-2 border-r pr-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant={drawingMode === 'paver' ? 'default' : 'outline'} className="gap-1">
                <Grid3X3 className="h-4 w-4" />
                Add Pavers
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white z-50">
              <DropdownMenuItem onClick={() => startDrawingMode('paver')}>
                <Pencil className="h-4 w-4 mr-2" />
                Trace Paver Zone
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowStandalonePaverInput(true)}>
                <Ruler className="h-4 w-4 mr-2" />
                Enter Measurements (Rectangle)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {showStandalonePaverInput && (
            <div className="flex items-center gap-2 bg-stone-100 p-2 rounded border border-stone-300">
              <div className="flex items-center gap-1">
                <Label className="text-xs">Name:</Label>
                <Input
                  type="text"
                  value={standalonePaverName}
                  onChange={(e) => setStandalonePaverName(e.target.value)}
                  className="w-20 h-7 text-xs"
                  placeholder="Paver Zone"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">W:</Label>
                <Input
                  type="number"
                  value={standalonePaverWidthFeet}
                  onChange={(e) => setStandalonePaverWidthFeet(e.target.value)}
                  className="w-10 h-7 text-xs"
                  placeholder="10"
                />
                <span className="text-[10px]">'</span>
                <Input
                  type="number"
                  value={standalonePaverWidthInches}
                  onChange={(e) => setStandalonePaverWidthInches(e.target.value)}
                  className="w-10 h-7 text-xs"
                  placeholder="0"
                />
                <span className="text-[10px]">"</span>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">L:</Label>
                <Input
                  type="number"
                  value={standalonePaverLengthFeet}
                  onChange={(e) => setStandalonePaverLengthFeet(e.target.value)}
                  className="w-10 h-7 text-xs"
                  placeholder="10"
                />
                <span className="text-[10px]">'</span>
                <Input
                  type="number"
                  value={standalonePaverLengthInches}
                  onChange={(e) => setStandalonePaverLengthInches(e.target.value)}
                  className="w-10 h-7 text-xs"
                  placeholder="0"
                />
                <span className="text-[10px]">"</span>
              </div>
              <Button size="sm" className="h-7 text-xs bg-stone-600 hover:bg-stone-700" onClick={addRectangularPaver}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowStandalonePaverInput(false)}>
                ✕
              </Button>
            </div>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={deleteLastStandalonePaver}
            disabled={standalonePavers.length === 0}
            title="Delete Last Paver Zone"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Measurement Section */}
        <div className="flex items-center gap-2 border-r pr-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant={drawingMode === 'measure-draw' ? 'default' : 'outline'} className="gap-1">
                <Ruler className="h-4 w-4" />
                Measure
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-white z-50">
              <DropdownMenuItem onClick={startMeasureDrawMode}>
                <Pencil className="h-4 w-4 mr-2" />
                Draw Measurement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowMeasurementInput(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Type Measurement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {showMeasurementInput && (
            <div className="flex items-center gap-2 bg-red-50 p-2 rounded border border-red-200">
              {unit === 'ft' ? (
                <>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={measurementFeet}
                      onChange={(e) => setMeasurementFeet(e.target.value)}
                      className="w-12 h-7 text-xs"
                      placeholder="4"
                    />
                    <span className="text-xs">ft</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={measurementInches}
                      onChange={(e) => setMeasurementInches(e.target.value)}
                      className="w-12 h-7 text-xs"
                      placeholder="0"
                    />
                    <span className="text-xs">in</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={measurementMeters}
                    onChange={(e) => setMeasurementMeters(e.target.value)}
                    className="w-16 h-7 text-xs"
                    placeholder="1.2"
                    step="0.1"
                  />
                  <span className="text-xs">m</span>
                </div>
              )}
              <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700" onClick={addMeasurementFromInput}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowMeasurementInput(false)}>
                ✕
              </Button>
            </div>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={deleteLastMeasurement}
            disabled={measurementLines.length === 0}
            title="Delete Last Measurement"
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

        {/* Background Image Controls */}
        <div className="flex items-center gap-2 border-r pr-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBackgroundImageUpload}
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            title="Import Background Image"
          >
            <Image className="h-4 w-4 mr-1" />
            Import
          </Button>
          
          {backgroundImage && (
            <>
              <Button
                size="sm"
                variant={backgroundLocked ? 'secondary' : 'ghost'}
                onClick={toggleBackgroundLock}
                title={backgroundLocked ? 'Unlock Background' : 'Lock Background'}
              >
                {backgroundLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={backgroundOpacity}
                  onChange={(e) => updateBackgroundOpacity(parseFloat(e.target.value))}
                  className="w-16 h-4"
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={removeBackgroundImage}
                title="Remove Background"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {/* Scale Reference Button - available when background image is loaded */}
          {backgroundImage && (
            <>
              <Button
                size="sm"
                variant={drawingMode === 'scale-ref' ? 'default' : 'outline'}
                onClick={startScaleReferenceMode}
                title="Set Scale Reference (click 2 points)"
                className={scaleReferenceSet ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
              >
                <Crosshair className="h-4 w-4 mr-1" />
                {scaleReferenceSet ? 'Scale Set' : 'Set Scale'}
              </Button>
              {scaleReferenceSet && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetScaleReference}
                  title="Reset Scale to Default"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
        </div>

        
        <Button size="sm" variant="destructive" onClick={resetCanvas}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>

        {/* Delete Selected Item Button */}
        {selectedItemId && (
          <Button size="sm" variant="destructive" onClick={deleteSelectedItem} className="bg-red-600 hover:bg-red-700">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete {selectedItemType}
          </Button>
        )}

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
        <span className="text-stone-600">Paver Zones: {standalonePavers.length}</span>
        <span className="text-red-600">Measurements: {measurementLines.length}</span>
        <span>Unit: {unit === 'ft' ? 'Feet' : 'Meters'}</span>
        {shiftPressed && <span className="text-primary font-medium">⇧ Angle Snap Active</span>}
        {spacePressed && <span className="text-primary font-medium">Pan Mode</span>}
        {selectedItemId && (
          <span className="text-red-600 font-medium">
            Selected: {selectedItemType} (double-click to select, use Delete button)
          </span>
        )}
        {scaleReferenceSet && (
          <span className="text-green-600 font-medium">Scale: Custom</span>
        )}
        {drawingMode !== 'none' && (
          <span className="ml-auto font-medium text-primary">
            Mode: {drawingMode === 'property' ? 'Drawing Property' : drawingMode === 'house' ? 'Drawing House' : drawingMode === 'pool' ? 'Drawing Pool' : drawingMode === 'paver' ? 'Drawing Paver Zone' : drawingMode === 'move-house' ? 'Moving House' : drawingMode === 'move-pool' ? 'Moving Pool' : drawingMode === 'rotate-pool' ? 'Rotating Pool' : drawingMode === 'measure-draw' ? 'Drawing Measurement' : drawingMode === 'scale-ref' ? 'Setting Scale Reference' : drawingMode}
            {currentPoints.length > 0 && ` (${currentPoints.length} points)`}
            {drawingMode === 'measure-draw' && measurementStartPoint && ' (click second point)'}
            {drawingMode === 'scale-ref' && !scaleRefPoint1 && ' (click first point)'}
            {drawingMode === 'scale-ref' && scaleRefPoint1 && ' (click second point)'}
          </span>
        )}
      </div>
      
      {/* Main content area with calculations on left and canvas on right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pool Calculations Panel - Left Side */}
        {(poolCalculations.length > 0 || standalonePavers.length > 0) && (
          <div className="w-64 bg-white border-r p-3 overflow-y-auto">
            <h3 className="font-semibold text-sm text-slate-800 mb-3">Calculations</h3>
            <div className="flex flex-col gap-3">
              {/* Pool Calculations */}
              {poolCalculations.map((calc) => (
                <div key={calc.poolId} className={`flex flex-col gap-1 p-2 rounded border text-xs ${editingPoolId === calc.poolId ? 'bg-amber-50 border-amber-300' : 'bg-slate-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-slate-800">{calc.poolName}</span>
                    <Button
                      size="sm"
                      variant={editingPoolId === calc.poolId ? 'default' : 'ghost'}
                      className="h-5 text-[10px] px-1.5"
                      onClick={() => editingPoolId === calc.poolId ? cancelPaverEditing() : startEditingPoolPavers(calc.poolId)}
                    >
                      {editingPoolId === calc.poolId ? 'Editing...' : 'Edit Pavers'}
                    </Button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Coping:</span>
                    <span className="font-medium">{calc.copingSqFt} sq ft</span>
                  </div>
                  {calc.paverNetSqFt > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Paver Area (Net):</span>
                        <span className="font-medium">{calc.paverNetSqFt} sq ft</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="text-amber-700 font-medium">Total:</span>
                        <span className="font-bold text-amber-700">{calc.totalWithWasteSqFt} sq ft</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              {/* Standalone Paver Calculations */}
              {standalonePavers.length > 0 && (
                <>
                  {poolCalculations.length > 0 && <div className="border-t pt-2 mt-1" />}
                  <div className="text-xs font-medium text-stone-600 mb-1">Paver Zones</div>
                  {standalonePavers.map((paver) => (
                    <div key={paver.id} className="flex flex-col gap-1 p-2 rounded border text-xs bg-stone-50 border-stone-200">
                      <span className="font-semibold text-sm text-stone-800">{paver.name}</span>
                      <div className="flex justify-between">
                        <span className="text-stone-600">Area (Net):</span>
                        <span className="font-medium">{paver.areaSqFt} sq ft</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="text-stone-700 font-medium">With 10% Waste:</span>
                        <span className="font-bold text-stone-700">{paver.areaWithWasteSqFt} sq ft</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-hidden">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};
