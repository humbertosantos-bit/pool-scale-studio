import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Line, Ellipse, Rect, Circle, Point, Text, Group, Triangle, Pattern, Polyline, Control, util } from 'fabric';
import { cn } from '@/lib/utils';
import poolWaterTexture from '@/assets/pool-water.png';
import pool12x24Image from '@/assets/pool-12x24.png';

interface PoolCanvasProps {
  imageFile: File | null;
  className?: string;
  canvasOnly?: boolean;
  onStateChange?: (state: any) => void;
}

export const PoolCanvas: React.FC<PoolCanvasProps> = ({ imageFile, className, canvasOnly = false, onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [scaleReference, setScaleReference] = useState<{ length: number; pixelLength: number } | null>(null);
  const [isSettingScale, setIsSettingScale] = useState(false);
  const isSettingScaleRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [scaleUnit, setScaleUnit] = useState<'feet' | 'meters'>('feet');
  const [pools, setPools] = useState<any[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const isMeasuringRef = useRef(false);
  const [measurementLines, setMeasurementLines] = useState<any[]>([]);
  const [measurementMode, setMeasurementMode] = useState<'draw' | 'type'>('draw');
  const [typedDistanceFeet, setTypedDistanceFeet] = useState('');
  const [typedDistanceInches, setTypedDistanceInches] = useState('');
  const [poolLengthFeet, setPoolLengthFeet] = useState('20');
  const [poolLengthInches, setPoolLengthInches] = useState('0');
  const [poolWidthFeet, setPoolWidthFeet] = useState('12');
  const [poolWidthInches, setPoolWidthInches] = useState('0');
  const [copingSize, setCopingSize] = useState<number | null>(null);
  const [isDrawingFence, setIsDrawingFence] = useState(false);
  const isDrawingFenceRef = useRef(false);
  const [fences, setFences] = useState<any[]>([]);
  const bgImageRef = useRef<FabricImage | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Get container dimensions
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: '#f8fafc',
      preserveObjectStacking: true, // Prevent objects from jumping to front on selection
    });

    // Handle window resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      canvas.setDimensions({ width: newWidth, height: newHeight });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    // Enable zoom functionality
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Enable panning when zoomed (Alt + drag or click on empty space)
    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      const target = opt.target;
      
      // Don't enable panning if we're setting scale, measuring, or drawing fence
      if (isSettingScaleRef.current || isMeasuringRef.current || isDrawingFenceRef.current) return;
      
      // Enable panning if Alt key is pressed OR clicking on empty space (no target object)
      if (evt.altKey === true || !target) {
        isDraggingRef.current = true;
        canvas.selection = false;
        lastPosRef.current = { x: evt.clientX, y: evt.clientY };
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isDraggingRef.current && lastPosRef.current) {
        const e = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPosRef.current.x;
          vpt[5] += e.clientY - lastPosRef.current.y;
          canvas.requestRenderAll();
          lastPosRef.current = { x: e.clientX, y: e.clientY };
        }
      }
    });

    canvas.on('mouse:up', () => {
      isDraggingRef.current = false;
      canvas.selection = true;
      lastPosRef.current = null;
    });

    // Arrow key navigation for panning
    const handleKeyDown = (e: KeyboardEvent) => {
      const panStep = 20;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      switch (e.key) {
        case 'ArrowLeft':
          vpt[4] += panStep;
          canvas.requestRenderAll();
          e.preventDefault();
          break;
        case 'ArrowRight':
          vpt[4] -= panStep;
          canvas.requestRenderAll();
          e.preventDefault();
          break;
        case 'ArrowUp':
          vpt[5] += panStep;
          canvas.requestRenderAll();
          e.preventDefault();
          break;
        case 'ArrowDown':
          vpt[5] -= panStep;
          canvas.requestRenderAll();
          e.preventDefault();
          break;
      }
    };

    // Rotation snapping with Shift key
    canvas.on('object:rotating', (e) => {
      if (!e.e) return;
      const target = e.target;
      if (!target) return;
      
      if ((e.e as MouseEvent).shiftKey) {
        const currentAngle = target.angle || 0;
        // Snap to 45-degree increments
        const snapAngle = Math.round(currentAngle / 45) * 45;
        
        // Store the center point before changing angle
        const centerPoint = target.getCenterPoint();
        
        target.set({ angle: snapAngle });
        
        // Restore the center point to prevent movement
        target.setPositionByOrigin(centerPoint, 'center', 'center');
        target.setCoords();
      }
    });

    // Keep background image always at the back and measurements always at the front
    const ensureBackgroundAtBack = () => {
      const objects = canvas.getObjects();
      const bgImage = objects.find(obj => (obj as any).isBackgroundImage);
      
      // Send background to back
      if (bgImage) {
        canvas.sendObjectToBack(bgImage);
      }
      
      // Bring all measurements to front
      objects.forEach(obj => {
        if ((obj as any).measurementId) {
          canvas.bringObjectToFront(obj);
        }
      });
    };

    canvas.on('object:added', ensureBackgroundAtBack);
    canvas.on('object:modified', ensureBackgroundAtBack);
    canvas.on('object:rotating', ensureBackgroundAtBack);
    canvas.on('object:scaling', ensureBackgroundAtBack);
    canvas.on('selection:created', ensureBackgroundAtBack);
    canvas.on('selection:updated', ensureBackgroundAtBack);
    canvas.on('mouse:up', ensureBackgroundAtBack);
    canvas.on('after:render', ensureBackgroundAtBack);

    // Sync dimension text and coping with pool position and rotation, and fence dimension text
    const syncPoolElements = (e: any) => {
      const target = e.target;
      if (!target) return;
      
      // Skip if the target is a dimension text or coping itself
      if ((target as any).isDimensionText || (target as any).isCoping) return;
      
      // Sync pool elements
      if ((target as any).poolId) {
        const poolId = (target as any).poolId;
        const objects = canvas.getObjects();
        
        // Sync dimension text
        const dimensionText = objects.find(obj => 
          (obj as any).poolId === poolId && (obj as any).isDimensionText
        );
        
        if (dimensionText) {
          const centerPoint = target.getCenterPoint();
          dimensionText.set({
            left: centerPoint.x,
            top: centerPoint.y,
            angle: target.angle || 0,
          });
          dimensionText.setCoords();
        }
        
        // Sync coping
        const coping = objects.find(obj => 
          (obj as any).poolId === poolId && (obj as any).isCoping
        );
        
        if (coping) {
          const centerPoint = target.getCenterPoint();
          coping.set({
            left: centerPoint.x,
            top: centerPoint.y,
            angle: target.angle || 0,
          });
          coping.setCoords();
        }
      }
      
    };

    canvas.on('object:moving', syncPoolElements);
    canvas.on('object:rotating', syncPoolElements);
    canvas.on('object:modified', syncPoolElements);

    // Track background image transformations to move other elements
    let bgInitialState: { center: Point; angle: number; objects: Map<any, { relX: number; relY: number; relAngle: number }> } | null = null;

    canvas.on('object:moving', (e) => {
      const target = e.target;
      if (!target || !(target as any).isBackgroundImage) return;

      if (!bgInitialState) return;

      const currentCenter = target.getCenterPoint();
      const deltaX = currentCenter.x - bgInitialState.center.x;
      const deltaY = currentCenter.y - bgInitialState.center.y;

      // Move all pools, measurements, and fences
      canvas.getObjects().forEach(obj => {
        if ((obj as any).poolId || (obj as any).measurementId || (obj as any).fenceId) {
          const initial = bgInitialState!.objects.get(obj);
          if (initial) {
            const newCenter = new Point(
              bgInitialState!.center.x + initial.relX + deltaX,
              bgInitialState!.center.y + initial.relY + deltaY
            );
            
            obj.setPositionByOrigin(newCenter, 'center', 'center');
            obj.setCoords();
          }
        }
      });

      canvas.renderAll();
    });

    canvas.on('object:rotating', (e) => {
      const target = e.target;
      if (!target || !(target as any).isBackgroundImage) return;

      if (!bgInitialState) return;

      const currentAngle = target.angle || 0;
      const bgCenter = target.getCenterPoint();

      // Rotate all pools, measurements, and fences around the background center
      canvas.getObjects().forEach(obj => {
        if ((obj as any).poolId || (obj as any).measurementId || (obj as any).fenceId) {
          const initial = bgInitialState!.objects.get(obj);
          if (initial) {
            const angleRad = (currentAngle * Math.PI) / 180;
            
            // Calculate new position based on rotation around background center
            const newX = bgCenter.x + (initial.relX * Math.cos(angleRad) - initial.relY * Math.sin(angleRad));
            const newY = bgCenter.y + (initial.relX * Math.sin(angleRad) + initial.relY * Math.cos(angleRad));
            
            const newCenter = new Point(newX, newY);
            obj.setPositionByOrigin(newCenter, 'center', 'center');
            obj.set({ angle: initial.relAngle + currentAngle });
            obj.setCoords();
          }
        }
      });

      canvas.renderAll();
    });

    canvas.on('mouse:down', () => {
      const activeObj = canvas.getActiveObject();
      if (activeObj && (activeObj as any).isBackgroundImage) {
        const bgCenter = activeObj.getCenterPoint();
        const bgAngle = activeObj.angle || 0;
        
        const objectsMap = new Map();
        canvas.getObjects().forEach(obj => {
          if ((obj as any).poolId || (obj as any).measurementId || (obj as any).fenceId) {
            const objCenter = obj.getCenterPoint();
            objectsMap.set(obj, {
              relX: objCenter.x - bgCenter.x,
              relY: objCenter.y - bgCenter.y,
              relAngle: (obj.angle || 0) - bgAngle,
            });
          }
        });

        bgInitialState = {
          center: bgCenter,
          angle: bgAngle,
          objects: objectsMap,
        };
      }
    });

    canvas.on('mouse:up', () => {
      bgInitialState = null;
    });

    window.addEventListener('keydown', handleKeyDown);

    setFabricCanvas(canvas);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas || !imageFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgSrc = e.target?.result as string;
      FabricImage.fromURL(imgSrc).then((img) => {
        // Scale image to fit canvas while maintaining aspect ratio
        const canvasWidth = fabricCanvas.width!;
        const canvasHeight = fabricCanvas.height!;
        const imgWidth = img.width!;
        const imgHeight = img.height!;

        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight) * 0.9;
        
        img.scale(scale);
        img.set({
          left: (canvasWidth - imgWidth * scale) / 2,
          top: (canvasHeight - imgHeight * scale) / 2,
          selectable: true,
          evented: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: false,
          hasControls: true,
          hasBorders: true,
        });
        
        // Only show rotation control
        (img as any).setControlsVisibility?.({
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

        (img as any).isBackgroundImage = true;
        bgImageRef.current = img;
        fabricCanvas.clear();
        fabricCanvas.add(img);
        fabricCanvas.sendObjectToBack(img); // Ensure image stays at the back
        fabricCanvas.renderAll();
      });
    };
    reader.readAsDataURL(imageFile);
  }, [fabricCanvas, imageFile]);

  const addPool = () => {
    if (!fabricCanvas || !scaleReference) return;

    // Parse user input dimensions (feet + inches)
    const lengthFt = parseFloat(poolLengthFeet) || 0;
    const lengthIn = parseFloat(poolLengthInches) || 0;
    const widthFt = parseFloat(poolWidthFeet) || 0;
    const widthIn = parseFloat(poolWidthInches) || 0;
    
    const length = lengthFt + lengthIn / 12;
    const width = widthFt + widthIn / 12;
    
    if (length <= 0 || width <= 0) {
      alert('Please enter valid positive numbers for pool dimensions.');
      return;
    }
    
    const pixelWidth = length * scaleReference.pixelLength / scaleReference.length;
    const pixelHeight = width * scaleReference.pixelLength / scaleReference.length;
    
    // Load textures
    Promise.all([
      FabricImage.fromURL(poolWaterTexture),
    ]).then(([waterImg]) => {
      // Scale water texture to 50% of original size
      waterImg.scaleToWidth(waterImg.width! * 0.5);
      waterImg.scaleToHeight(waterImg.height! * 0.5);
      
      const waterPattern = new Pattern({
        source: waterImg.getElement() as HTMLImageElement,
        repeat: 'repeat',
      });
      
      const poolId = `pool-${Date.now()}`;
      const centerX = fabricCanvas.width! / 2;
      const centerY = fabricCanvas.height! / 2;
      
      // Add coping if selected
      if (copingSize) {
        // Convert coping size from inches to feet, then to pixels
        const copingSizeInFeet = copingSize / 12; // Convert inches to feet
        const copingPixelWidth = copingSizeInFeet * scaleReference.pixelLength / scaleReference.length;
        
        // Create coping rectangle with light grey color
        const coping = new Rect({
          left: centerX,
          top: centerY,
          fill: '#D3D3D3', // Light grey color
          stroke: '#000000',
          strokeWidth: 0.5,
          width: pixelWidth + (copingPixelWidth * 2), // Add coping width to left and right
          height: pixelHeight + (copingPixelWidth * 2), // Add coping height to top and bottom
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        
        (coping as any).poolId = poolId;
        (coping as any).isCoping = true;
        fabricCanvas.add(coping);
      }
      
      // Add pool
      const pool = new Rect({
        left: centerX,
        top: centerY,
        fill: waterPattern,
        stroke: '#000000',
        strokeWidth: 0.5,
        opacity: 0.9,
        width: pixelWidth,
        height: pixelHeight,
        originX: 'center',
        originY: 'center',
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: false,
        hasControls: true,
        hasBorders: true,
        setControlsVisibility: {
          mt: false,
          mb: false,
          ml: false,
          mr: false,
          bl: false,
          br: false,
          tl: false,
          tr: false,
          mtr: true,
        },
      });

      // Add dimension text in the center of the pool
      const lengthStr = Number.isInteger(length) ? length.toString() : length.toFixed(1);
      const widthStr = Number.isInteger(width) ? width.toString() : width.toFixed(1);
      const dimensionText = new Text(`${lengthStr} x ${widthStr}`, {
        left: centerX,
        top: centerY,
        fontSize: 10,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      (pool as any).poolId = poolId;
      (dimensionText as any).poolId = poolId;
      (dimensionText as any).isDimensionText = true;
      
      fabricCanvas.add(pool);
      fabricCanvas.add(dimensionText);
      
      // Ensure proper layering: image at back, pool above image, measurements on top
      fabricCanvas.getObjects().forEach((obj) => {
        if ((obj as any).isBackgroundImage) {
          fabricCanvas.sendObjectToBack(obj);
        } else if ((obj as any).measurementId) {
          fabricCanvas.bringObjectToFront(obj);
        }
      });
      
      setPools(prev => [...prev, pool]);
      fabricCanvas.renderAll();
    });
  };

  const addPresetPool = (length: number, width: number) => {
    if (!fabricCanvas || !scaleReference) return;

    const pixelWidth = length * scaleReference.pixelLength / scaleReference.length;
    const pixelHeight = width * scaleReference.pixelLength / scaleReference.length;
    
    // Load the preset pool image
    FabricImage.fromURL(pool12x24Image).then((poolImg) => {
      const poolId = `pool-${Date.now()}`;
      const centerX = fabricCanvas.width! / 2;
      const centerY = fabricCanvas.height! / 2;
      
      // Calculate exact scale factors to match the real-world dimensions
      const scaleX = pixelWidth / poolImg.width!;
      const scaleY = pixelHeight / poolImg.height!;
      poolImg.set({ scaleX, scaleY });
      
      // Add coping if selected
      if (copingSize) {
        // Convert coping size from inches to feet, then to pixels
        const copingSizeInFeet = copingSize / 12; // Convert inches to feet
        const copingPixelWidth = copingSizeInFeet * scaleReference.pixelLength / scaleReference.length;
        
        // Create coping rectangle with light grey color
        const coping = new Rect({
          left: centerX,
          top: centerY,
          fill: '#D3D3D3', // Light grey color
          stroke: '#000000',
          strokeWidth: 0.5,
          width: pixelWidth + (copingPixelWidth * 2), // Add coping width to left and right
          height: pixelHeight + (copingPixelWidth * 2), // Add coping height to top and bottom
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        
        (coping as any).poolId = poolId;
        (coping as any).isCoping = true;
        fabricCanvas.add(coping);
      }
      
      // Set pool image properties
      poolImg.set({
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: false,
        hasControls: true,
        hasBorders: true,
      });
      
      // Only show rotation control
      (poolImg as any).setControlsVisibility?.({
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

      // Add dimension text in the center of the pool
      const lengthStr = Number.isInteger(length) ? length.toString() : length.toFixed(1);
      const widthStr = Number.isInteger(width) ? width.toString() : width.toFixed(1);
      const dimensionText = new Text(`${lengthStr} x ${widthStr}`, {
        left: centerX,
        top: centerY,
        fontSize: 10,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      (poolImg as any).poolId = poolId;
      (dimensionText as any).poolId = poolId;
      (dimensionText as any).isDimensionText = true;
      
      fabricCanvas.add(poolImg);
      fabricCanvas.add(dimensionText);
      
      // Ensure proper layering: image at back, pool above image, measurements on top
      fabricCanvas.getObjects().forEach((obj) => {
        if ((obj as any).isBackgroundImage) {
          fabricCanvas.sendObjectToBack(obj);
        } else if ((obj as any).measurementId) {
          fabricCanvas.bringObjectToFront(obj);
        }
      });
      
      setPools(prev => [...prev, poolImg]);
      fabricCanvas.renderAll();
    });
  };

  const startScaleReference = () => {
    if (!fabricCanvas) return;
    
    setIsSettingScale(true);
    isSettingScaleRef.current = true;
    let firstPoint: { x: number; y: number } | null = null;
    let tempCircle: Circle | null = null;
    let line: Line | null = null;

    const handleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      if (!firstPoint) {
        // First click - mark the first point
        firstPoint = { x: pointer.x, y: pointer.y };
        
        // Add a visual indicator at the first point
        tempCircle = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0.5,
          fill: '#ef4444',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        fabricCanvas.add(tempCircle);
        fabricCanvas.renderAll();
      } else {
        // Second click - complete the scale reference
        const secondPoint = { x: pointer.x, y: pointer.y };
        
        // Add a visual indicator at the second point
        const secondCircle = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0.5,
          fill: '#ef4444',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        fabricCanvas.add(secondCircle);
        
        // Draw line between the two points
        line = new Line([firstPoint.x, firstPoint.y, secondPoint.x, secondPoint.y], {
          stroke: '#ef4444',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(line);
        fabricCanvas.renderAll();
        
        const pixelLength = Math.sqrt(
          Math.pow(secondPoint.x - firstPoint.x, 2) + Math.pow(secondPoint.y - firstPoint.y, 2)
        );
        
        const realLength = prompt(`Enter the real-world length of this measurement (in ${scaleUnit}):`);
        if (realLength && !isNaN(Number(realLength))) {
          setScaleReference({
            length: Number(realLength),
            pixelLength: pixelLength,
          });
        }
        
        // Clean up visual indicators
        if (tempCircle) fabricCanvas.remove(tempCircle);
        if (secondCircle) fabricCanvas.remove(secondCircle);
        if (line) fabricCanvas.remove(line);
        
        setIsSettingScale(false);
        isSettingScaleRef.current = false;
        fabricCanvas.off('mouse:down', handleMouseDown);
        fabricCanvas.renderAll();
      }
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
  };

  const deleteSelectedPool = () => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject as any).poolId && (activeObject as any).poolId.startsWith('pool-')) {
      const poolId = (activeObject as any).poolId;
      
      // Remove the pool
      fabricCanvas.remove(activeObject);
      
      // Also remove the associated dimension text and coping
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).poolId === poolId) {
          fabricCanvas.remove(obj);
        }
      });
      
      setPools(prev => prev.filter(pool => pool !== activeObject));
      fabricCanvas.renderAll();
    }
  };

  const handleUnitChange = (newUnit: 'feet' | 'meters') => {
    if (scaleReference && newUnit !== scaleUnit) {
      // Convert the scale reference to the new unit
      const conversionFactor = newUnit === 'meters' ? 0.3048 : 3.28084;
      setScaleReference({
        ...scaleReference,
        length: scaleReference.length * conversionFactor,
      });
      
      // Update all existing measurements
      if (fabricCanvas) {
        measurementLines.forEach((measurement) => {
          const data = (measurement as any).measurementData;
          if (data && data.pixelLength) {
            const realLength = (data.pixelLength * scaleReference.length * conversionFactor) / scaleReference.pixelLength;
            const textObj = measurement.getObjects().find(obj => obj instanceof Text) as Text;
            const unitLabel = newUnit === 'feet' ? 'ft' : 'm';
            if (textObj) {
              textObj.set({ text: `${realLength.toFixed(2)} ${unitLabel}` });
            }
            (measurement as any).measurementData.unit = newUnit;
          }
        });
        fabricCanvas.renderAll();
      }
    }
    setScaleUnit(newUnit);
  };

  const addTypedMeasurement = () => {
    if (!fabricCanvas || !scaleReference) return;
    
    const distanceFt = parseFloat(typedDistanceFeet) || 0;
    const distanceIn = parseFloat(typedDistanceInches) || 0;
    const distance = distanceFt + distanceIn / 12;
    
    if (distance <= 0) {
      alert('Please enter a valid positive number for the distance.');
      return;
    }
    
    const pixelLength = (distance * scaleReference.pixelLength) / scaleReference.length;
    
    // Get canvas center considering viewport transform
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom();
    const canvasCenterX = (fabricCanvas.width! / 2 - vpt[4]) / zoom;
    const canvasCenterY = (fabricCanvas.height! / 2 - vpt[5]) / zoom;
    
    const startPoint = { x: canvasCenterX - pixelLength / 2, y: canvasCenterY };
    const endPoint = { x: canvasCenterX + pixelLength / 2, y: canvasCenterY };
    
    const createFinalArrowHead = (x: number, y: number, arrowAngle: number) => {
      const capSize = 4;
      
      const cap = new Line([0, -capSize, 0, capSize], {
        stroke: '#4169e1',
        strokeWidth: 0.5,
        strokeUniform: true,
      });
      
      return new Group([cap], {
        left: x,
        top: y,
        angle: arrowAngle,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
    };
    
    const finalLine = new Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
      stroke: '#4169e1',
      strokeWidth: 0.5,
      strokeUniform: true,
      selectable: false,
      evented: false,
    });
    
    const finalArrow1 = createFinalArrowHead(startPoint.x, startPoint.y, 0);
    const finalArrow2 = createFinalArrowHead(endPoint.x, endPoint.y, 180);
    
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    const offset = 8;
    const unitLabel = scaleUnit === 'feet' ? 'ft' : 'm';
    
    const finalText = new Text(`${distance.toFixed(2)} ${unitLabel}`, {
      left: midX,
      top: midY - offset,
      fontSize: 12,
      fontFamily: 'Inter, Arial, sans-serif',
      fill: '#4169e1',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      angle: 0,
    });
    
    const measurementGroup = new Group([finalLine, finalArrow1, finalArrow2, finalText], {
      selectable: true,
      evented: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: false,
      hasControls: true,
      hasBorders: true,
    });
    
    (measurementGroup as any).measurementId = `measurement-${Date.now()}`;
    (measurementGroup as any).measurementData = {
      pixelLength: pixelLength,
      unit: scaleUnit,
    };
    fabricCanvas.add(measurementGroup);
    fabricCanvas.bringObjectToFront(measurementGroup); // Ensure measurement is on top
    setMeasurementLines(prev => [...prev, measurementGroup]);
    setTypedDistanceFeet('');
    setTypedDistanceInches('');
    fabricCanvas.renderAll();
  };

  const startMeasurement = () => {
    if (!fabricCanvas || !scaleReference) return;
    
    setIsMeasuring(true);
    isMeasuringRef.current = true;
    
    // Make background image non-interactive during measurement
    if (bgImageRef.current) {
      bgImageRef.current.set({
        selectable: false,
        evented: false,
      });
    }
    
    let startPoint: { x: number; y: number } | null = null;
    let tempLine: Line | null = null;
    let tempArrow1Group: Group | null = null;
    let tempArrow2Group: Group | null = null;
    let tempText: Text | null = null;

    const createArrowHead = (x: number, y: number, angle: number) => {
      const capSize = 4;
      
      const cap = new Line([0, -capSize, 0, capSize], {
        stroke: '#4169e1',
        strokeWidth: 0.5,
        strokeUniform: true,
      });
      
      return new Group([cap], {
        left: x,
        top: y,
        angle: angle,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
    };

    const handleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getScenePoint(e.e);
      startPoint = { x: pointer.x, y: pointer.y };
      
      // Create temporary line
      tempLine = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: '#4169e1',
        strokeWidth: 0.5,
        strokeUniform: true,
        selectable: false,
        evented: false,
      });
      
      // Create temporary arrows
      tempArrow1Group = createArrowHead(pointer.x, pointer.y, 0);
      tempArrow2Group = createArrowHead(pointer.x, pointer.y, 0);
      
      // Create temporary text
      const unitLabel = scaleUnit === 'feet' ? 'ft' : 'm';
      tempText = new Text('0.00 ' + unitLabel, {
        left: pointer.x,
        top: pointer.y,
        fontSize: 12,
        fontFamily: 'Inter, Arial, sans-serif',
        fill: '#4169e1',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      
      fabricCanvas.add(tempLine, tempArrow1Group, tempArrow2Group, tempText);
      fabricCanvas.on('mouse:move', handleMouseMove);
    };
    
    const handleMouseMove = (e: any) => {
      if (!startPoint || !tempLine || !tempArrow1Group || !tempArrow2Group || !tempText) return;
      
      let pointer = fabricCanvas.getScenePoint(e.e);
      
      // Snap to straight lines if Shift is pressed
      if (e.e.shiftKey) {
        const dx = pointer.x - startPoint.x;
        const dy = pointer.y - startPoint.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Snap to nearest 45-degree increment
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        
        pointer = new Point(
          startPoint.x + distance * Math.cos(snapAngle),
          startPoint.y + distance * Math.sin(snapAngle)
        );
      }
      
      // Update line
      tempLine.set({ x2: pointer.x, y2: pointer.y });
      
      // Calculate angle
      const dx = pointer.x - startPoint.x;
      const dy = pointer.y - startPoint.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      // Update arrows (pointing INWARDS from line tips)
      tempArrow1Group.set({
        left: startPoint.x,
        top: startPoint.y,
        angle: angle,
      });
      
      tempArrow2Group.set({
        left: pointer.x,
        top: pointer.y,
        angle: angle + 180,
      });
      
      // Calculate measurement
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      const realLength = (pixelLength * scaleReference.length) / scaleReference.pixelLength;
      
      // Update text (parallel to line, always upright)
      const midX = (startPoint.x + pointer.x) / 2;
      const midY = (startPoint.y + pointer.y) / 2;
      
      // Keep text upright by flipping if angle is upside down
      let textAngle = angle;
      if (angle > 90 || angle < -90) {
        textAngle = angle + 180;
      }
      
      // Calculate offset perpendicular to line
      const offset = 8;
      const perpAngle = (angle + 90) * Math.PI / 180;
      const offsetX = Math.cos(perpAngle) * offset;
      const offsetY = Math.sin(perpAngle) * offset;
      
      const unitLabel = scaleUnit === 'feet' ? 'ft' : 'm';
      tempText.set({
        left: midX + offsetX,
        top: midY + offsetY,
        text: `${realLength.toFixed(2)} ${unitLabel}`,
        angle: textAngle,
      });
      
      fabricCanvas.renderAll();
    };
    
    const handleMouseUp = (e: any) => {
      if (!startPoint || !tempLine || !tempArrow1Group || !tempArrow2Group || !tempText) return;
      
      let pointer = fabricCanvas.getScenePoint(e.e);
      
      // Snap to straight lines if Shift is pressed
      if (e.e.shiftKey) {
        const dx = pointer.x - startPoint.x;
        const dy = pointer.y - startPoint.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Snap to nearest 45-degree increment
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        
        pointer = new Point(
          startPoint.x + distance * Math.cos(snapAngle),
          startPoint.y + distance * Math.sin(snapAngle)
        );
      }
      
      // Remove temporary objects
      fabricCanvas.remove(tempLine, tempArrow1Group, tempArrow2Group, tempText);
      
      // Calculate final values
      const dx = pointer.x - startPoint.x;
      const dy = pointer.y - startPoint.y;
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      
      // Only create measurement if line has some length
      if (pixelLength > 5) {
        const realLength = (pixelLength * scaleReference.length) / scaleReference.pixelLength;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const midX = (startPoint.x + pointer.x) / 2;
        const midY = (startPoint.y + pointer.y) / 2;
        
        // Create arrow helper function
        const createFinalArrowHead = (x: number, y: number, arrowAngle: number) => {
          const capSize = 4;
          
          const cap = new Line([0, -capSize, 0, capSize], {
            stroke: '#4169e1',
            strokeWidth: 0.5,
            strokeUniform: true,
          });
          
          return new Group([cap], {
            left: x,
            top: y,
            angle: arrowAngle,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });
        };
        
        // Create final objects
        const finalLine = new Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
          stroke: '#4169e1',
          strokeWidth: 0.5,
          strokeUniform: true,
          selectable: false,
          evented: false,
        });
        
        const finalArrow1 = createFinalArrowHead(startPoint.x, startPoint.y, angle);
        const finalArrow2 = createFinalArrowHead(pointer.x, pointer.y, angle + 180);
        
        // Keep text upright
        let textAngle = angle;
        if (angle > 90 || angle < -90) {
          textAngle = angle + 180;
        }
        
        // Calculate offset perpendicular to line
        const offset = 8;
        const perpAngle = (angle + 90) * Math.PI / 180;
        const offsetX = Math.cos(perpAngle) * offset;
        const offsetY = Math.sin(perpAngle) * offset;
        
        const unitLabel = scaleUnit === 'feet' ? 'ft' : 'm';
        const finalText = new Text(`${realLength.toFixed(2)} ${unitLabel}`, {
          left: midX + offsetX,
          top: midY + offsetY,
          fontSize: 12,
          fontFamily: 'Inter, Arial, sans-serif',
          fill: '#4169e1',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
          angle: textAngle,
        });
        
        // Group all elements together
        const measurementGroup = new Group([finalLine, finalArrow1, finalArrow2, finalText], {
          selectable: true,
          evented: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: false,
          hasControls: true,
          hasBorders: true,
        });
        
        (measurementGroup as any).measurementId = `measurement-${Date.now()}`;
        (measurementGroup as any).measurementData = {
          pixelLength: pixelLength,
          unit: scaleUnit,
        };
        fabricCanvas.add(measurementGroup);
        fabricCanvas.bringObjectToFront(measurementGroup); // Ensure measurement is on top
        setMeasurementLines(prev => [...prev, measurementGroup]);
      }
      
      // Clean up
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
      fabricCanvas.off('mouse:down', handleMouseDown);
      setIsMeasuring(false);
      isMeasuringRef.current = false;
      
      // Restore background image interactivity after measurement
      if (bgImageRef.current) {
        bgImageRef.current.set({
          selectable: true,
          evented: true,
        });
      }
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:up', handleMouseUp);
  };

  const deleteSelectedMeasurement = () => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject as any).measurementId && (activeObject as any).measurementId.startsWith('measurement-')) {
      fabricCanvas.remove(activeObject);
      setMeasurementLines(prev => prev.filter(m => m !== activeObject));
      fabricCanvas.renderAll();
    }
  };

  const startFenceDrawing = () => {
    if (!fabricCanvas || !scaleReference) return;
    
    setIsDrawingFence(true);
    isDrawingFenceRef.current = true;
    
    // Disable object selection during fence drawing
    fabricCanvas.selection = false;
    fabricCanvas.forEachObject(obj => {
      obj.set({ selectable: false, evented: false });
    });
    
    let fencePoints: Point[] = [];
    let tempLines: Line[] = [];
    let tempCircles: Circle[] = [];
    let previewLine: Line | null = null;
    let lastClickTime = 0;
    let lastClickPos: Point | null = null;
    
    const handleClick = (e: any) => {
      if (!isDrawingFenceRef.current) return;
      const mouseEvent = e.e as MouseEvent;
      if (mouseEvent.button !== 0) return; // Only handle left clicks for adding points

      const pointer = fabricCanvas.getScenePoint(e.e);
      let newPoint = new Point(pointer.x, pointer.y);
      
      // Snap to angles if Shift is pressed and there's a previous point
      if (e.e.shiftKey && fencePoints.length > 0) {
        const lastPoint = fencePoints[fencePoints.length - 1];
        const dx = newPoint.x - lastPoint.x;
        const dy = newPoint.y - lastPoint.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Snap to nearest 45-degree increment
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        
        newPoint = new Point(
          lastPoint.x + distance * Math.cos(snapAngle),
          lastPoint.y + distance * Math.sin(snapAngle)
        );
      }
      
      // If this is a rapid second click near the last point, treat as part of a double-click and don't add a new point
      const now = Date.now();
      if (lastClickPos && now - lastClickTime < 300) {
        const dxi = newPoint.x - lastClickPos.x;
        const dyi = newPoint.y - lastClickPos.y;
        if (Math.hypot(dxi, dyi) < 5) {
          return;
        }
      }
      
      fencePoints.push(newPoint);
      lastClickTime = now;
      lastClickPos = newPoint;
      
      // Add visual marker at this point - larger and more visible
      const marker = new Circle({
        left: newPoint.x,
        top: newPoint.y,
        radius: 4,
        fill: '#666666',
        stroke: '#ffffff',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      tempCircles.push(marker);
      fabricCanvas.add(marker);
      
      // If there's a previous point, draw a line
      if (fencePoints.length > 1) {
        const prevPoint = fencePoints[fencePoints.length - 2];
        const line = new Line([prevPoint.x, prevPoint.y, newPoint.x, newPoint.y], {
          stroke: '#666666',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
        });
        tempLines.push(line);
        fabricCanvas.add(line);
      }
      
      fabricCanvas.renderAll();
    };
    
    const handleMouseMove = (e: any) => {
      if (!isDrawingFenceRef.current) return;
      if (fencePoints.length === 0) return;

      const pointer = fabricCanvas.getScenePoint(e.e);
      let previewPoint = new Point(pointer.x, pointer.y);
      
      // Snap preview to angles if Shift is pressed
      if (e.e.shiftKey) {
        const lastPoint = fencePoints[fencePoints.length - 1];
        const dx = previewPoint.x - lastPoint.x;
        const dy = previewPoint.y - lastPoint.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Snap to nearest 45-degree increment
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        
        previewPoint = new Point(
          lastPoint.x + distance * Math.cos(snapAngle),
          lastPoint.y + distance * Math.sin(snapAngle)
        );
      }
      
      // Update or create preview line - lighter color for preview
      const lastPoint = fencePoints[fencePoints.length - 1];
      if (previewLine) {
        previewLine.set({
          x1: lastPoint.x,
          y1: lastPoint.y,
          x2: previewPoint.x,
          y2: previewPoint.y,
        });
      } else {
        previewLine = new Line([lastPoint.x, lastPoint.y, previewPoint.x, previewPoint.y], {
          stroke: '#999999',
          strokeWidth: 1,
          strokeDashArray: [3, 3],
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(previewLine);
      }
      
      fabricCanvas.renderAll();
    };
    
    // Function to properly stop fence drawing and clean up all state
    const stopFenceDrawing = () => {
      // Remove all event listeners immediately to stop any further drawing
      fabricCanvas.off('mouse:down', onMouseDownFence);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:dblclick', handleFinish);
      window.removeEventListener('keydown', handleKeyPress);
      const canvasElement = fabricCanvas.getElement();
      canvasElement.removeEventListener('contextmenu', preventContextMenu);
      
      // Update state to exit drawing mode
      setIsDrawingFence(false);
      isDrawingFenceRef.current = false;
      
      // Remove preview line
      if (previewLine) {
        fabricCanvas.remove(previewLine);
        previewLine = null;
      }
      
      // Remove temporary elements
      tempLines.forEach(line => fabricCanvas.remove(line));
      tempCircles.forEach(circle => fabricCanvas.remove(circle));
      
      // Clear arrays
      fencePoints = [];
      tempLines = [];
      tempCircles = [];
      
      // Re-enable object selection and interaction
      fabricCanvas.selection = true;
      fabricCanvas.forEachObject(obj => {
        if (!(obj as any).isDimensionText && !(obj as any).isCoping) {
          obj.set({ selectable: true, evented: true });
        }
      });
      
      fabricCanvas.renderAll();
    };
    
    const handleFinish = (e?: any) => {
      if (!isDrawingFenceRef.current) return;
      if (e?.e) e.e.preventDefault();

      // If we have enough points, create the fence
      if (fencePoints.length >= 2) {
        // Calculate total fence length in feet
        let totalLength = 0;
        for (let i = 0; i < fencePoints.length - 1; i++) {
          const p1 = fencePoints[i];
          const p2 = fencePoints[i + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const pixelDistance = Math.sqrt(dx * dx + dy * dy);
          
          // Convert pixels to feet using scale reference
          if (scaleReference) {
            const feetDistance = (pixelDistance * scaleReference.length) / scaleReference.pixelLength;
            totalLength += feetDistance;
          }
        }
        
        // Create final fence as a Polyline with solid styling
        const polylinePoints = fencePoints.map(p => ({ x: p.x, y: p.y }));
        
        const fenceId = `fence-${Date.now()}`;
        
        // Create fence polyline with editable points
        const fence = new Polyline(polylinePoints, {
          stroke: '#666666',
          strokeWidth: 2,
          fill: 'transparent',
          selectable: true,
          evented: true,
          objectCaching: false,
          cornerStyle: 'circle',
          cornerColor: '#666666',
          cornerSize: 8,
          transparentCorners: false,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          hasControls: true,
          hasBorders: true,
        });
        
        // Enable polyline point editing - show a control for each point
        fence.points?.forEach((point, index) => {
          fence.controls[`p${index}`] = new Control({
            positionHandler: (dim, finalMatrix, fabricObject) => {
              const polyline = fabricObject as Polyline;
              const pt = polyline.points![index] as any;
              const x = pt.x - polyline.pathOffset!.x;
              const y = pt.y - polyline.pathOffset!.y;
              // Use viewportTransform * objectTransform to place control exactly on vertex
              const matrix = util.multiplyTransformMatrices(
                fabricCanvas.viewportTransform,
                polyline.calcTransformMatrix()
              );
              return util.transformPoint({ x, y }, matrix);
            },
            actionHandler: (eventData, transform, x, y) => {
              const polyline = transform.target as Polyline;
              const pt = polyline.points![index] as any;
              
              // Store initial position on first call
              if (!transform.offsetX) {
                const invMatrix = util.invertTransform(
                  util.multiplyTransformMatrices(
                    fabricCanvas.viewportTransform,
                    polyline.calcTransformMatrix()
                  )
                );
                const currentPoint = util.transformPoint({ x, y }, invMatrix);
                transform.offsetX = (pt.x - polyline.pathOffset!.x) - currentPoint.x;
                transform.offsetY = (pt.y - polyline.pathOffset!.y) - currentPoint.y;
              }
              
              // Convert pointer to object local coords and apply offset
              const invMatrix = util.invertTransform(
                util.multiplyTransformMatrices(
                  fabricCanvas.viewportTransform,
                  polyline.calcTransformMatrix()
                )
              );
              const localPoint = util.transformPoint({ x, y }, invMatrix);
              // Preserve center to prevent object shift when bounds change
              const prevCenter = polyline.getCenterPoint();
              // Apply point change
              pt.x = localPoint.x + transform.offsetX + polyline.pathOffset!.x;
              pt.y = localPoint.y + transform.offsetY + polyline.pathOffset!.y;
              
              // Recompute coords and compensate center shift
              polyline.set({ dirty: true });
              polyline.setCoords();
              const newCenter = polyline.getCenterPoint();
              const dx = prevCenter.x - newCenter.x;
              const dy = prevCenter.y - newCenter.y;
              polyline.left += dx;
              polyline.top += dy;
              polyline.setCoords();
              
              fabricCanvas.requestRenderAll();
              updateFenceMarkers(polyline);
              
              return true;
            },
            cursorStyle: 'pointer',
            render: (ctx, left, top, styleOverride, fabricObject) => {
              const size = 10;
              ctx.save();
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(left, top, size / 2, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            },
          });
        });
        
        (fence as any).fenceId = fenceId;
        
        // Function to create and add markers for the fence
        const updateFenceMarkers = (fenceObj: Polyline) => {
          if (!scaleReference) return;
          
          // Remove existing markers for this fence
          const existingMarkers = fabricCanvas.getObjects().filter((obj: any) => 
            obj.fenceId === fenceId && obj.isFenceMarker
          );
          existingMarkers.forEach(marker => fabricCanvas.remove(marker));
          
          const points = fenceObj.points as any[];
          const fenceLeft = fenceObj.left || 0;
          const fenceTop = fenceObj.top || 0;
          
          let accumulatedDistance = 0;
          const markerInterval = 5; // 5 feet
          
          for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculate pixel distance between points
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const pixelDistance = Math.sqrt(dx * dx + dy * dy);
            const feetDistance = (pixelDistance * scaleReference.length) / scaleReference.pixelLength;
            
            const segmentStart = accumulatedDistance;
            const segmentEnd = accumulatedDistance + feetDistance;
            
            let nextMarkerAt = Math.ceil(segmentStart / markerInterval) * markerInterval;
            
            // Skip creating markers - user doesn't want them
            while (nextMarkerAt < segmentEnd) {
              nextMarkerAt += markerInterval;
            }
            
            accumulatedDistance += feetDistance;
          }
        };
        
        fabricCanvas.add(fence);
        updateFenceMarkers(fence);
        
        // Update markers when fence is modified or moved
        fence.on('modified', () => updateFenceMarkers(fence));
        fence.on('moving', () => updateFenceMarkers(fence));
        
        setFences(prev => [...prev, fence]);
      }
      
      // Clean up and stop drawing mode
      stopFenceDrawing();
    };
    
    const handleRightClick = (e: any) => {
      if (!isDrawingFenceRef.current) return;
      e.e.preventDefault();
      handleFinish();
    };
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleFinish();
      }
    };
    
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    const onMouseDownFence = (e: any) => {
      if (!isDrawingFenceRef.current) return;
      const mouseEvent = e.e as MouseEvent;
      if (mouseEvent.button === 0) {
        handleClick(e);
      } else if (mouseEvent.button === 2) {
        handleRightClick(e);
      }
    };
    fabricCanvas.on('mouse:down', onMouseDownFence);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:dblclick', handleFinish);
    
    // Enable keyboard support and prevent context menu
    window.addEventListener('keydown', handleKeyPress);
    const canvasElement = fabricCanvas.getElement();
    canvasElement.addEventListener('contextmenu', preventContextMenu);
  };

  const deleteSelectedFence = () => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject as any).fenceId) {
      const fenceId = (activeObject as any).fenceId;
      
      // Remove the fence
      fabricCanvas.remove(activeObject);
      
      // Remove all associated markers
      const markers = fabricCanvas.getObjects().filter((obj: any) => 
        obj.fenceId === fenceId && obj.isFenceMarker
      );
      markers.forEach(marker => fabricCanvas.remove(marker));
      
      setFences(prev => prev.filter(f => f !== activeObject));
      fabricCanvas.renderAll();
    }
  };

  // Expose state to parent component
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        scaleUnit,
        onUnitChange: handleUnitChange,
        isSettingScale,
        scaleReference,
        onStartScaleReference: startScaleReference,
        poolLengthFeet,
        poolLengthInches,
        poolWidthFeet,
        poolWidthInches,
        onPoolLengthFeetChange: setPoolLengthFeet,
        onPoolLengthInchesChange: setPoolLengthInches,
        onPoolWidthFeetChange: setPoolWidthFeet,
        onPoolWidthInchesChange: setPoolWidthInches,
        onAddPool: addPool,
        onAddPresetPool: addPresetPool,
        onDeleteSelectedPool: deleteSelectedPool,
        measurementMode,
        onMeasurementModeChange: setMeasurementMode,
        isMeasuring,
        onStartMeasurement: startMeasurement,
        typedDistanceFeet,
        typedDistanceInches,
        onTypedDistanceFeetChange: setTypedDistanceFeet,
        onTypedDistanceInchesChange: setTypedDistanceInches,
        onAddTypedMeasurement: addTypedMeasurement,
        onDeleteSelectedMeasurement: deleteSelectedMeasurement,
        copingSize,
        onCopingSizeChange: setCopingSize,
        isDrawingFence,
        onStartFenceDrawing: startFenceDrawing,
        onDeleteSelectedFence: deleteSelectedFence,
      });
    }
  }, [scaleUnit, isSettingScale, scaleReference, poolLengthFeet, poolLengthInches, poolWidthFeet, poolWidthInches, measurementMode, isMeasuring, typedDistanceFeet, typedDistanceInches, copingSize, isDrawingFence]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {!canvasOnly && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Units:</label>
              <select 
                value={scaleUnit} 
                onChange={(e) => handleUnitChange(e.target.value as 'feet' | 'meters')}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="feet">Feet</option>
                <option value="meters">Meters</option>
              </select>
            </div>
            
            <button
              onClick={startScaleReference}
              disabled={!imageFile || isSettingScale}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSettingScale ? 'Click two points to set scale...' : scaleReference ? 'Reset Scale Reference' : 'Set Scale Reference'}
            </button>
            
            {scaleReference && (
          <>
            <div className="flex items-center gap-2 border-l pl-2">
              <label className="text-sm font-medium">Pool Size:</label>
              <input
                type="number"
                value={poolLengthFeet}
                onChange={(e) => setPoolLengthFeet(e.target.value)}
                placeholder="Feet"
                className="px-2 py-1 border rounded text-sm w-16"
                min="0"
              />
              <span className="text-xs">FT</span>
              <input
                type="number"
                value={poolLengthInches}
                onChange={(e) => setPoolLengthInches(e.target.value)}
                placeholder="In"
                className="px-2 py-1 border rounded text-sm w-16"
                min="0"
                max="11"
              />
              <span className="text-xs">IN</span>
              <span className="text-sm">×</span>
              <input
                type="number"
                value={poolWidthFeet}
                onChange={(e) => setPoolWidthFeet(e.target.value)}
                placeholder="Feet"
                className="px-2 py-1 border rounded text-sm w-16"
                min="0"
              />
              <span className="text-xs">FT</span>
              <input
                type="number"
                value={poolWidthInches}
                onChange={(e) => setPoolWidthInches(e.target.value)}
                placeholder="In"
                className="px-2 py-1 border rounded text-sm w-16"
                min="0"
                max="11"
              />
              <span className="text-xs">IN</span>
              <button
                onClick={addPool}
                className="px-4 py-2 bg-pool-light text-pool-dark rounded-md hover:bg-pool-light/80"
              >
                Add Pool
              </button>
            </div>
            <button
              onClick={deleteSelectedPool}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
            >
              Delete Selected Pool
            </button>
            
            <div className="flex items-center gap-2 border-l pl-2">
              <label className="text-sm font-medium">Measure:</label>
              <select 
                value={measurementMode} 
                onChange={(e) => setMeasurementMode(e.target.value as 'draw' | 'type')}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="draw">Draw</option>
                <option value="type">Type</option>
              </select>
              
              {measurementMode === 'draw' ? (
                <button
                  onClick={startMeasurement}
                  disabled={isMeasuring}
                  className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50"
                >
                  {isMeasuring ? 'Click and drag to measure...' : 'Draw Measurement'}
                </button>
              ) : (
                <>
                  <input
                    type="number"
                    value={typedDistanceFeet}
                    onChange={(e) => setTypedDistanceFeet(e.target.value)}
                    placeholder="Feet"
                    className="px-2 py-1 border rounded text-sm w-16"
                    min="0"
                  />
                  <span className="text-xs">FT</span>
                  <input
                    type="number"
                    value={typedDistanceInches}
                    onChange={(e) => setTypedDistanceInches(e.target.value)}
                    placeholder="In"
                    className="px-2 py-1 border rounded text-sm w-16"
                    min="0"
                    max="11"
                  />
                  <span className="text-xs">IN</span>
                  <button
                    onClick={addTypedMeasurement}
                    className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90"
                  >
                    Add Measurement
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={deleteSelectedMeasurement}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
            >
              Delete Selected Measurement
            </button>
            </>
          )}
        </div>
        
        {scaleReference && (
          <div className="text-sm text-muted-foreground">
            Scale: 1 pixel = {(scaleReference.length / scaleReference.pixelLength).toFixed(4)} {scaleUnit === 'feet' ? 'FT' : 'M'}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          💡 Mouse wheel to zoom • Click & drag or Arrow keys to pan • Rotate pool with corner handle
        </div>
      </>
      )}
      
      <div ref={containerRef} className="flex-1 w-full h-full">
        <canvas ref={canvasRef} className="block" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};