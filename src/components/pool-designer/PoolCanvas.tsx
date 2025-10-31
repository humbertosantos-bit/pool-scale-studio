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
  const [typedDistanceMeters, setTypedDistanceMeters] = useState('');
  const [poolLengthFeet, setPoolLengthFeet] = useState('20');
  const [poolLengthInches, setPoolLengthInches] = useState('0');
  const [poolWidthFeet, setPoolWidthFeet] = useState('12');
  const [poolWidthInches, setPoolWidthInches] = useState('0');
  const [copingSize, setCopingSize] = useState<number | null>(16);
  const [paverLeftFeet, setPaverLeftFeet] = useState('0');
  const [paverLeftInches, setPaverLeftInches] = useState('0');
  const [paverRightFeet, setPaverRightFeet] = useState('0');
  const [paverRightInches, setPaverRightInches] = useState('0');
  const [paverTopFeet, setPaverTopFeet] = useState('0');
  const [paverTopInches, setPaverTopInches] = useState('0');
  const [paverBottomFeet, setPaverBottomFeet] = useState('0');
  const [paverBottomInches, setPaverBottomInches] = useState('0');
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [isDrawingFence, setIsDrawingFence] = useState(false);
  const isDrawingFenceRef = useRef(false);
  const [fences, setFences] = useState<any[]>([]);
  const [isDrawingPaver, setIsDrawingPaver] = useState(false);
  const isDrawingPaverRef = useRef(false);
  const [pavers, setPavers] = useState<any[]>([]);
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
      
      // Don't enable panning if we're setting scale, measuring, drawing fence, or drawing paver
      if (isSettingScaleRef.current || isMeasuringRef.current || isDrawingFenceRef.current || isDrawingPaverRef.current) return;
      
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
    canvas.on('selection:created', (e) => {
      ensureBackgroundAtBack();
      handlePoolSelection(e);
    });
    canvas.on('selection:updated', (e) => {
      ensureBackgroundAtBack();
      handlePoolSelection(e);
    });
    canvas.on('selection:cleared', () => {
      setSelectedPoolId(null);
    });
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
        
        // Sync pavers that belong to this pool
        const poolPavers = objects.filter(obj => {
          const paverId = (obj as any).paverId;
          return paverId && typeof paverId === 'string' && paverId.includes(`-${poolId}`);
        });
        
        poolPavers.forEach(paver => {
          const centerPoint = target.getCenterPoint();
          const paverId = (paver as any).paverId;
          
          // Get the paver's initial offset if stored
          if (!(paver as any).initialOffset) {
            // Store initial offset relative to pool
            const poolCenter = target.getCenterPoint();
            const paverCenter = paver.getCenterPoint();
            (paver as any).initialOffset = {
              x: paverCenter.x - poolCenter.x,
              y: paverCenter.y - poolCenter.y,
            };
          }
          
          const offset = (paver as any).initialOffset;
          const angle = (target.angle || 0) * Math.PI / 180;
          
          // Rotate the offset around the pool center
          const rotatedX = offset.x * Math.cos(angle) - offset.y * Math.sin(angle);
          const rotatedY = offset.x * Math.sin(angle) + offset.y * Math.cos(angle);
          
          paver.set({
            left: centerPoint.x + rotatedX,
            top: centerPoint.y + rotatedY,
            angle: target.angle || 0,
          });
          paver.setCoords();
          
          // Sync paver area text
          const paverText = objects.find(obj => 
            (obj as any).paverId === paverId && (obj as any).isPaverArea
          );
          if (paverText) {
            const paverCenter = paver.getCenterPoint();
            paverText.set({
              left: paverCenter.x,
              top: paverCenter.y,
              angle: paver.angle || 0,
            });
            paverText.setCoords();
          }
        });
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

      // Move all pools, measurements, fences, and pavers
      canvas.getObjects().forEach(obj => {
        if ((obj as any).poolId || (obj as any).measurementId || (obj as any).fenceId || (obj as any).paverId) {
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

      // Rotate all pools, measurements, fences, and pavers around the background center
      canvas.getObjects().forEach(obj => {
        if ((obj as any).poolId || (obj as any).measurementId || (obj as any).fenceId || (obj as any).paverId) {
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
          if ((obj as any).poolId || (obj as any).measurementId || (obj as any).fenceId || (obj as any).paverId) {
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

  const updatePaverOutline = (paverOutline: any, poolId: string, pool: any, centerX: number, centerY: number, L: number, W: number, C: number) => {
    if (!fabricCanvas || !scaleReference) return;
    
    const { left: paverLeft, right: paverRight, top: paverTop, bottom: paverBottom } = paverOutline.paverDimensions;
    
    // Recalculate dimensions
    const outerLength = L + (paverLeft + C) + (paverRight + C);
    const outerWidth = W + (paverTop + C) + (paverBottom + C);
    
    const outerLengthPixels = outerLength * scaleReference.pixelLength / scaleReference.length;
    const outerWidthPixels = outerWidth * scaleReference.pixelLength / scaleReference.length;
    
    // Update paver outline dimensions
    paverOutline.set({
      width: outerLengthPixels,
      height: outerWidthPixels,
    });

    // Reposition pool, coping and dimension text to honor asymmetric left/right/top/bottom pavers
    const ratio = scaleReference.pixelLength / scaleReference.length;
    const horizontalOffsetPx = ((paverLeft - paverRight) / 2) * ratio;
    const verticalOffsetPx = ((paverBottom - paverTop) / 2) * ratio;

    // Move the pool rectangle
    pool.set({
      left: centerX + horizontalOffsetPx,
      top: centerY + verticalOffsetPx,
    });
    pool.setCoords();

    // Move coping and dimension text, if present
    const objects = fabricCanvas.getObjects();
    const copingObj = objects.find(obj => (obj as any).poolId === poolId && (obj as any).isCoping);
    if (copingObj) {
      copingObj.set({
        left: centerX + horizontalOffsetPx,
        top: centerY + verticalOffsetPx,
      });
      (copingObj as any).setCoords?.();
    }
    const dimensionTextObj = objects.find(obj => (obj as any).poolId === poolId && (obj as any).isDimensionText);
    if (dimensionTextObj) {
      dimensionTextObj.set({
        left: centerX + horizontalOffsetPx,
        top: centerY + verticalOffsetPx,
      });
      (dimensionTextObj as any).setCoords?.();
    }
    
    // Remove old labels
    const oldLabels = fabricCanvas.getObjects().filter((obj: any) => 
      obj.isPaverDimensionLabel && obj.poolId === poolId
    );
    oldLabels.forEach(label => fabricCanvas.remove(label));
    
    // Create new labels
    const createEditableDimensionLabel = (
      text: string, 
      x: number, 
      y: number, 
      side: 'left' | 'right' | 'top' | 'bottom'
    ) => {
      const label = new Text(text, {
        fontSize: 13,
        fontFamily: 'Inter, Arial, sans-serif',
        fill: '#22c55e',
        fontWeight: 'bold',
        selectable: true,
        evented: true,
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 6,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
        hasBorders: true,
        borderColor: '#22c55e',
      });
      
      (label as any).isPaverDimensionLabel = true;
      (label as any).poolId = poolId;
      (label as any).paverSide = side;
      
      // Double-click to edit
      label.on('mousedblclick', () => {
        const currentValue = paverOutline.paverDimensions[side];
        const newValue = prompt(`Enter new ${side} paver width (ft):`, currentValue.toString());
        if (newValue !== null) {
          const parsed = parseFloat(newValue);
          if (!isNaN(parsed) && parsed >= 0) {
            paverOutline.paverDimensions[side] = parsed;
            updatePaverOutline(paverOutline, poolId, pool, centerX, centerY, L, W, C);
          }
        }
      });
      
      return label;
    };
    
    if (paverLeft > 0) {
      const leftLabel = createEditableDimensionLabel(
        `${paverLeft} ft`,
        centerX - outerLengthPixels / 2 + (paverLeft * scaleReference.pixelLength / scaleReference.length) / 2,
        centerY,
        'left'
      );
      fabricCanvas.add(leftLabel);
      fabricCanvas.bringObjectToFront(leftLabel);
    }
    
    if (paverRight > 0) {
      const rightLabel = createEditableDimensionLabel(
        `${paverRight} ft`,
        centerX + outerLengthPixels / 2 - (paverRight * scaleReference.pixelLength / scaleReference.length) / 2,
        centerY,
        'right'
      );
      fabricCanvas.add(rightLabel);
      fabricCanvas.bringObjectToFront(rightLabel);
    }
    
    if (paverTop > 0) {
      const topLabel = createEditableDimensionLabel(
        `${paverTop} ft`,
        centerX,
        centerY - outerWidthPixels / 2 + (paverTop * scaleReference.pixelLength / scaleReference.length) / 2,
        'top'
      );
      fabricCanvas.add(topLabel);
      fabricCanvas.bringObjectToFront(topLabel);
    }
    
    if (paverBottom > 0) {
      const bottomLabel = createEditableDimensionLabel(
        `${paverBottom} ft`,
        centerX,
        centerY + outerWidthPixels / 2 - (paverBottom * scaleReference.pixelLength / scaleReference.length) / 2,
        'bottom'
      );
      fabricCanvas.add(bottomLabel);
      fabricCanvas.bringObjectToFront(bottomLabel);
    }
    
    fabricCanvas.renderAll();
  };

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

      // Add delete control (X button)
      pool.controls['deleteControl'] = new Control({
        x: -0.5,
        y: -0.5,
        offsetX: -16,
        offsetY: -16,
        cursorStyle: 'pointer',
        mouseUpHandler: () => {
          // Find and delete all related objects (pool, coping, dimension text, pavers)
          const objects = fabricCanvas.getObjects();
          const relatedObjects = objects.filter((obj: any) => 
            obj.poolId === poolId || 
            (obj.paverId && obj.paverId.includes(`-${poolId}`))
          );
          relatedObjects.forEach(obj => fabricCanvas.remove(obj));
          setPools(prev => prev.filter(p => (p as any).poolId !== poolId));
          fabricCanvas.renderAll();
          return true;
        },
        render: (ctx, left, top) => {
          const size = 24;
          ctx.save();
          ctx.translate(left, top);
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2.5;
          ctx.moveTo(-size / 4, -size / 4);
          ctx.lineTo(size / 4, size / 4);
          ctx.moveTo(size / 4, -size / 4);
          ctx.lineTo(-size / 4, size / 4);
          ctx.stroke();
          ctx.restore();
        },
      });

      (pool as any).poolId = poolId;
      (dimensionText as any).poolId = poolId;
      (dimensionText as any).isDimensionText = true;
      
      fabricCanvas.add(pool);
      fabricCanvas.add(dimensionText);
      
      // Create pavers around the pool if specified
      const paverLeft = parseFloat(paverLeftFeet) || 0;
      const paverRight = parseFloat(paverRightFeet) || 0;
      const paverTop = parseFloat(paverTopFeet) || 0;
      const paverBottom = parseFloat(paverBottomFeet) || 0;
      
      if (paverLeft > 0 || paverRight > 0 || paverTop > 0 || paverBottom > 0) {
        // Calculate dimensions using the formula:
        // L = pool length, W = pool width, C = coping size
        // P_left, P_right, P_top, P_bottom = paver widths
        
        const copingSizeInFeet = copingSize ? copingSize / 12 : 0;
        const L = lengthFt; // pool length
        const W = widthFt; // pool width
        const C = copingSizeInFeet;
        
        // Outer total dimensions
        const outerLength = L + (paverLeft + C) + (paverRight + C);
        const outerWidth = W + (paverTop + C) + (paverBottom + C);
        
        // Convert to pixels
        const outerLengthPixels = outerLength * scaleReference.pixelLength / scaleReference.length;
        const outerWidthPixels = outerWidth * scaleReference.pixelLength / scaleReference.length;
        
        // Pool area
        const poolArea = L * W;
        
        // Calculate each side's area (in sq ft)
        const leftPaverHeight = W + (paverTop + C) + (paverBottom + C);
        const rightPaverHeight = W + (paverTop + C) + (paverBottom + C);
        const topPaverWidth = L + (paverLeft + C) + (paverRight + C);
        const bottomPaverWidth = L + (paverLeft + C) + (paverRight + C);
        
        const leftArea = paverLeft * leftPaverHeight;
        const rightArea = paverRight * rightPaverHeight;
        const topArea = paverTop * topPaverWidth;
        const bottomArea = paverBottom * bottomPaverWidth;
        
        // Offset inner pool/coping to reflect asymmetric paver sizes
        const ratio = scaleReference.pixelLength / scaleReference.length;
        const horizontalOffsetPx = ((paverLeft - paverRight) / 2) * ratio;
        const verticalOffsetPx = ((paverBottom - paverTop) / 2) * ratio;

        pool.set({
          left: centerX + horizontalOffsetPx,
          top: centerY + verticalOffsetPx,
        });
        pool.setCoords();

        const objects = fabricCanvas.getObjects();
        const copingObj = objects.find(obj => (obj as any).poolId === poolId && (obj as any).isCoping);
        if (copingObj) {
          copingObj.set({
            left: centerX + horizontalOffsetPx,
            top: centerY + verticalOffsetPx,
          });
          (copingObj as any).setCoords?.();
        }
        dimensionText.set({ left: centerX + horizontalOffsetPx, top: centerY + verticalOffsetPx });
        dimensionText.setCoords();
        
        // Create paver outline rectangle
        const paverOutline = new Rect({
          left: centerX,
          top: centerY,
          fill: '#D3D3D3',
          stroke: '#808080',
          strokeWidth: 1,
          width: outerLengthPixels,
          height: outerWidthPixels,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
        });
        
        (paverOutline as any).paverId = `paver-outline-${poolId}`;
        (paverOutline as any).poolId = poolId;
        (paverOutline as any).paverDimensions = {
          left: paverLeft,
          right: paverRight,
          top: paverTop,
          bottom: paverBottom,
        };
        
        // Add delete control to paver outline
        paverOutline.controls['deleteControl'] = new Control({
          x: 0.5,
          y: -0.5,
          offsetX: 16,
          offsetY: -16,
          cursorStyle: 'pointer',
          mouseUpHandler: () => {
            // Remove all paver-related objects for this pool
            const objects = fabricCanvas.getObjects();
            const paverObjects = objects.filter((obj: any) => 
              (obj.paverId && obj.paverId.includes(poolId)) || 
              (obj.isPaverDimensionLabel && obj.poolId === poolId)
            );
            paverObjects.forEach(obj => fabricCanvas.remove(obj));
            setPavers(prev => prev.filter(p => (p as any).poolId !== poolId));
            fabricCanvas.renderAll();
            return true;
          },
          render: (ctx, left, top) => {
            const size = 24;
            ctx.save();
            ctx.translate(left, top);
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2.5;
            ctx.moveTo(-size / 4, -size / 4);
            ctx.lineTo(size / 4, size / 4);
            ctx.moveTo(size / 4, -size / 4);
            ctx.lineTo(-size / 4, size / 4);
            ctx.stroke();
            ctx.restore();
          },
        });
        
        fabricCanvas.add(paverOutline);
        
        // Position paver behind pool
        const bgImage = fabricCanvas.getObjects().find(obj => (obj as any).isBackgroundImage);
        if (bgImage) {
          const bgIndex = fabricCanvas.getObjects().indexOf(bgImage);
          fabricCanvas.remove(paverOutline);
          fabricCanvas.insertAt(bgIndex + 1, paverOutline);
        }
        
        setPavers(prev => [...prev, paverOutline]);
        
        // Add editable dimension labels for each side
        const createEditableDimensionLabel = (
          text: string, 
          x: number, 
          y: number, 
          side: 'left' | 'right' | 'top' | 'bottom'
        ) => {
          const label = new Text(text, {
            fontSize: 13,
            fontFamily: 'Inter, Arial, sans-serif',
            fill: '#000000',
            fontWeight: 'bold',
            selectable: true,
            evented: true,
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: 6,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
            hasBorders: true,
            borderColor: '#000000',
          });
          
          (label as any).isPaverDimensionLabel = true;
          (label as any).poolId = poolId;
          (label as any).paverSide = side;
          
          // Double-click to edit
          label.on('mousedblclick', () => {
            const currentValue = (paverOutline as any).paverDimensions[side];
            const newValue = prompt(`Enter new ${side} paver width (ft):`, currentValue.toString());
            if (newValue !== null) {
              const parsed = parseFloat(newValue);
              if (!isNaN(parsed) && parsed >= 0) {
                // Update dimension
                (paverOutline as any).paverDimensions[side] = parsed;
                
                // Redraw paver outline and labels
                updatePaverOutline(paverOutline, poolId, pool, centerX, centerY, L, W, C);
              }
            }
          });
          
          return label;
        };
        
        // Create labels for each side
        if (paverLeft > 0) {
          const leftLabel = createEditableDimensionLabel(
            `${paverLeft} ft`,
            centerX - outerLengthPixels / 2 + (paverLeft * scaleReference.pixelLength / scaleReference.length) / 2,
            centerY,
            'left'
          );
          fabricCanvas.add(leftLabel);
          fabricCanvas.bringObjectToFront(leftLabel);
        }
        
        if (paverRight > 0) {
          const rightLabel = createEditableDimensionLabel(
            `${paverRight} ft`,
            centerX + outerLengthPixels / 2 - (paverRight * scaleReference.pixelLength / scaleReference.length) / 2,
            centerY,
            'right'
          );
          fabricCanvas.add(rightLabel);
          fabricCanvas.bringObjectToFront(rightLabel);
        }
        
        if (paverTop > 0) {
          const topLabel = createEditableDimensionLabel(
            `${paverTop} ft`,
            centerX,
            centerY - outerWidthPixels / 2 + (paverTop * scaleReference.pixelLength / scaleReference.length) / 2,
            'top'
          );
          fabricCanvas.add(topLabel);
          fabricCanvas.bringObjectToFront(topLabel);
        }
        
        if (paverBottom > 0) {
          const bottomLabel = createEditableDimensionLabel(
            `${paverBottom} ft`,
            centerX,
            centerY + outerWidthPixels / 2 - (paverBottom * scaleReference.pixelLength / scaleReference.length) / 2,
            'bottom'
          );
          fabricCanvas.add(bottomLabel);
          fabricCanvas.bringObjectToFront(bottomLabel);
        }
      }
      
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

  const addPresetPool = (length: number, width: number, poolName: string) => {
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
      
      // Array to hold all elements that will be grouped
      const groupElements: any[] = [];
      
      // Add coping if selected
      if (copingSize) {
        // Convert coping size from inches to feet, then to pixels
        const copingSizeInFeet = copingSize / 12; // Convert inches to feet
        const copingPixelWidth = copingSizeInFeet * scaleReference.pixelLength / scaleReference.length;
        
        // Create coping rectangle with light grey color
        const coping = new Rect({
          left: 0,
          top: 0,
          fill: '#D3D3D3', // Light grey color
          stroke: '#000000',
          strokeWidth: 0.5,
          width: pixelWidth + (copingPixelWidth * 2), // Add coping width to left and right
          height: pixelHeight + (copingPixelWidth * 2), // Add coping height to top and bottom
          originX: 'center',
          originY: 'center',
        });
        
        (coping as any).isCoping = true;
        groupElements.push(coping);
      }
      
      // Set pool image properties (relative to group center)
      poolImg.set({
        left: 0,
        top: 0,
        originX: 'center',
        originY: 'center',
      });
      
      groupElements.push(poolImg);

      // Add pool name text in the center of the pool - sized to fit with padding
      const maxWidth = pixelWidth * 0.85; // 85% of pool width for padding
      const maxHeight = pixelHeight * 0.6; // 60% of pool height for padding
      
      // Calculate appropriate font size
      let fontSize = 10;
      const testText = new Text(poolName, {
        fontSize: fontSize,
        fontFamily: 'Arial',
        fontWeight: 'bold',
      });
      
      // Scale up font size until it fits
      while (testText.width! < maxWidth && testText.height! < maxHeight && fontSize < 50) {
        fontSize += 1;
        testText.set({ fontSize });
      }
      
      // Scale down if too large
      while ((testText.width! > maxWidth || testText.height! > maxHeight) && fontSize > 6) {
        fontSize -= 1;
        testText.set({ fontSize });
      }
      
      const dimensionText = new Text(poolName, {
        left: 0,
        top: 0,
        fontSize: fontSize,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
      });

      (dimensionText as any).isDimensionText = true;
      groupElements.push(dimensionText);
      
      // Create pavers around the pool if specified
      const paverLeft = (parseFloat(paverLeftFeet) || 0) + (parseFloat(paverLeftInches) || 0) / 12;
      const paverRight = (parseFloat(paverRightFeet) || 0) + (parseFloat(paverRightInches) || 0) / 12;
      const paverTop = (parseFloat(paverTopFeet) || 0) + (parseFloat(paverTopInches) || 0) / 12;
      const paverBottom = (parseFloat(paverBottomFeet) || 0) + (parseFloat(paverBottomInches) || 0) / 12;
      
      if (paverLeft > 0 || paverRight > 0 || paverTop > 0 || paverBottom > 0) {
        const copingSizeInFeet = copingSize ? copingSize / 12 : 0;
        const L = length;
        const W = width;
        const C = copingSizeInFeet;
        
        // Paver dimensions include the coping, so subtract coping from paver input
        const actualPaverLeft = Math.max(0, paverLeft - C);
        const actualPaverRight = Math.max(0, paverRight - C);
        const actualPaverTop = Math.max(0, paverTop - C);
        const actualPaverBottom = Math.max(0, paverBottom - C);
        
        const outerLength = L + (actualPaverLeft + C) + (actualPaverRight + C);
        const outerWidth = W + (actualPaverTop + C) + (actualPaverBottom + C);
        
        const outerLengthPixels = outerLength * scaleReference.pixelLength / scaleReference.length;
        const outerWidthPixels = outerWidth * scaleReference.pixelLength / scaleReference.length;
        
        // Calculate offset to position pool asymmetrically within pavers
        const horizontalOffset = ((actualPaverRight - actualPaverLeft) / 2) * scaleReference.pixelLength / scaleReference.length;
        const verticalOffset = ((actualPaverTop - actualPaverBottom) / 2) * scaleReference.pixelLength / scaleReference.length;
        
        // Offset all existing elements (coping, pool, text) by the calculated offset
        groupElements.forEach(element => {
          element.set({
            left: (element.left || 0) + horizontalOffset,
            top: (element.top || 0) + verticalOffset,
          });
        });
        
        const paverOutline = new Rect({
          left: 0,
          top: 0,
          fill: '#D3D3D3',
          stroke: '#808080',
          strokeWidth: 1,
          width: outerLengthPixels,
          height: outerWidthPixels,
          originX: 'center',
          originY: 'center',
        });
        
        (paverOutline as any).isPaver = true;
        (paverOutline as any).paverDimensions = {
          leftFeet: parseFloat(paverLeftFeet) || 0,
          leftInches: parseFloat(paverLeftInches) || 0,
          rightFeet: parseFloat(paverRightFeet) || 0,
          rightInches: parseFloat(paverRightInches) || 0,
          topFeet: parseFloat(paverTopFeet) || 0,
          topInches: parseFloat(paverTopInches) || 0,
          bottomFeet: parseFloat(paverBottomFeet) || 0,
          bottomInches: parseFloat(paverBottomInches) || 0,
        };
        
        groupElements.unshift(paverOutline); // Add paver at beginning so it's behind everything
        
        // Add paver dimension labels
        const paverLabels = createPaverLabels(
          outerLengthPixels, 
          outerWidthPixels, 
          parseFloat(paverLeftFeet) || 0,
          parseFloat(paverLeftInches) || 0,
          parseFloat(paverRightFeet) || 0,
          parseFloat(paverRightInches) || 0,
          parseFloat(paverTopFeet) || 0,
          parseFloat(paverTopInches) || 0,
          parseFloat(paverBottomFeet) || 0,
          parseFloat(paverBottomInches) || 0
        );
        groupElements.push(...paverLabels);
      }
      
      // Create a group with all elements
      const poolGroup = new Group(groupElements, {
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
      poolGroup.setControlsVisibility({
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
      
      (poolGroup as any).poolId = poolId;
      (poolGroup as any).poolData = {
        length,
        width,
        poolName,
        copingSize,
        paverDimensions: {
          leftFeet: parseFloat(paverLeftFeet) || 0,
          leftInches: parseFloat(paverLeftInches) || 0,
          rightFeet: parseFloat(paverRightFeet) || 0,
          rightInches: parseFloat(paverRightInches) || 0,
          topFeet: parseFloat(paverTopFeet) || 0,
          topInches: parseFloat(paverTopInches) || 0,
          bottomFeet: parseFloat(paverBottomFeet) || 0,
          bottomInches: parseFloat(paverBottomInches) || 0,
        }
      };
      
      fabricCanvas.add(poolGroup);
      
      // Ensure proper layering: image at back, pool above image, measurements on top
      fabricCanvas.getObjects().forEach((obj) => {
        if ((obj as any).isBackgroundImage) {
          fabricCanvas.sendObjectToBack(obj);
        } else if ((obj as any).measurementId) {
          fabricCanvas.bringObjectToFront(obj);
        }
      });
      
      setPools(prev => [...prev, poolGroup]);
      fabricCanvas.renderAll();
    });
  };
  
  const createPaverLabels = (
    outerLengthPixels: number, 
    outerWidthPixels: number, 
    leftFt: number, 
    leftIn: number,
    rightFt: number,
    rightIn: number,
    topFt: number,
    topIn: number,
    bottomFt: number,
    bottomIn: number
  ) => {
    const labels: any[] = [];
    const offset = 15;
    
    const formatDimension = (ft: number, inches: number) => {
      if (inches > 0) {
        return `${ft}' ${inches}"`;
      }
      return `${ft}'`;
    };
    
    if (leftFt > 0 || leftIn > 0) {
      const label = new Text(formatDimension(leftFt, leftIn), {
        left: -outerLengthPixels / 2 - offset,
        top: 0,
        fontSize: 8,
        fontFamily: 'Arial',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
      });
      (label as any).isPaverLabel = true;
      labels.push(label);
    }
    
    if (rightFt > 0 || rightIn > 0) {
      const label = new Text(formatDimension(rightFt, rightIn), {
        left: outerLengthPixels / 2 + offset,
        top: 0,
        fontSize: 8,
        fontFamily: 'Arial',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
      });
      (label as any).isPaverLabel = true;
      labels.push(label);
    }
    
    if (topFt > 0 || topIn > 0) {
      const label = new Text(formatDimension(topFt, topIn), {
        left: 0,
        top: -outerWidthPixels / 2 - offset,
        fontSize: 8,
        fontFamily: 'Arial',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
      });
      (label as any).isPaverLabel = true;
      labels.push(label);
    }
    
    if (bottomFt > 0 || bottomIn > 0) {
      const label = new Text(formatDimension(bottomFt, bottomIn), {
        left: 0,
        top: outerWidthPixels / 2 + offset,
        fontSize: 8,
        fontFamily: 'Arial',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
      });
      (label as any).isPaverLabel = true;
      labels.push(label);
    }
    
    return labels;
  };

  // Handle pool selection to load paver dimensions
  const handlePoolSelection = (e: any) => {
    const target = e.selected?.[0];
    if (target && (target as any).poolData) {
      const poolData = (target as any).poolData;
      const paverDims = poolData.paverDimensions;
      
      if (paverDims) {
        setSelectedPoolId((target as any).poolId);
        setPaverLeftFeet(String(paverDims.leftFeet || 0));
        setPaverLeftInches(String(paverDims.leftInches || 0));
        setPaverRightFeet(String(paverDims.rightFeet || 0));
        setPaverRightInches(String(paverDims.rightInches || 0));
        setPaverTopFeet(String(paverDims.topFeet || 0));
        setPaverTopInches(String(paverDims.topInches || 0));
        setPaverBottomFeet(String(paverDims.bottomFeet || 0));
        setPaverBottomInches(String(paverDims.bottomInches || 0));
      }
    }
  };

  // Update pool pavers when dimensions change
  const updatePoolPavers = (poolId: string) => {
    if (!fabricCanvas || !scaleReference) return;
    
    const pool = pools.find(p => (p as any).poolId === poolId);
    if (!pool || !(pool as any).poolData) return;
    
    const poolData = (pool as any).poolData;
    const { length, width, poolName, copingSize: poolCopingSize } = poolData;
    
    // Remove old pool group
    fabricCanvas.remove(pool);
    
    // Store current position and angle
    const currentLeft = pool.left;
    const currentTop = pool.top;
    const currentAngle = pool.angle;
    
    // Re-create pool with new paver dimensions
    const pixelWidth = length * scaleReference.pixelLength / scaleReference.length;
    const pixelHeight = width * scaleReference.pixelLength / scaleReference.length;
    
    FabricImage.fromURL(pool12x24Image).then((poolImg) => {
      const scaleX = pixelWidth / poolImg.width!;
      const scaleY = pixelHeight / poolImg.height!;
      poolImg.set({ scaleX, scaleY });
      
      const groupElements: any[] = [];
      
      // Add coping if exists
      if (poolCopingSize) {
        const copingSizeInFeet = poolCopingSize / 12;
        const copingPixelWidth = copingSizeInFeet * scaleReference.pixelLength / scaleReference.length;
        
        const coping = new Rect({
          left: 0,
          top: 0,
          fill: '#D3D3D3',
          stroke: '#000000',
          strokeWidth: 0.5,
          width: pixelWidth + (copingPixelWidth * 2),
          height: pixelHeight + (copingPixelWidth * 2),
          originX: 'center',
          originY: 'center',
        });
        
        (coping as any).isCoping = true;
        groupElements.push(coping);
      }
      
      poolImg.set({
        left: 0,
        top: 0,
        originX: 'center',
        originY: 'center',
      });
      
      groupElements.push(poolImg);
      
      
      const dimensionText = new Text(poolName, {
        left: 0,
        top: 0,
        fontSize: 10,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#000000',
        originX: 'center',
        originY: 'center',
      });
      
      (dimensionText as any).isDimensionText = true;
      groupElements.push(dimensionText);
      
      // Add pavers with new dimensions
      const paverLeft = (parseFloat(paverLeftFeet) || 0) + (parseFloat(paverLeftInches) || 0) / 12;
      const paverRight = (parseFloat(paverRightFeet) || 0) + (parseFloat(paverRightInches) || 0) / 12;
      const paverTop = (parseFloat(paverTopFeet) || 0) + (parseFloat(paverTopInches) || 0) / 12;
      const paverBottom = (parseFloat(paverBottomFeet) || 0) + (parseFloat(paverBottomInches) || 0) / 12;
      
      if (paverLeft > 0 || paverRight > 0 || paverTop > 0 || paverBottom > 0) {
        const copingSizeInFeet = poolCopingSize ? poolCopingSize / 12 : 0;
        const actualPaverLeft = Math.max(0, paverLeft - copingSizeInFeet);
        const actualPaverRight = Math.max(0, paverRight - copingSizeInFeet);
        const actualPaverTop = Math.max(0, paverTop - copingSizeInFeet);
        const actualPaverBottom = Math.max(0, paverBottom - copingSizeInFeet);
        
        const outerLength = length + (actualPaverLeft + copingSizeInFeet) + (actualPaverRight + copingSizeInFeet);
        const outerWidth = width + (actualPaverTop + copingSizeInFeet) + (actualPaverBottom + copingSizeInFeet);
        
        const outerLengthPixels = outerLength * scaleReference.pixelLength / scaleReference.length;
        const outerWidthPixels = outerWidth * scaleReference.pixelLength / scaleReference.length;
        
        const horizontalOffset = ((actualPaverRight - actualPaverLeft) / 2) * scaleReference.pixelLength / scaleReference.length;
        const verticalOffset = ((actualPaverTop - actualPaverBottom) / 2) * scaleReference.pixelLength / scaleReference.length;
        
        groupElements.forEach(element => {
          element.set({
            left: (element.left || 0) + horizontalOffset,
            top: (element.top || 0) + verticalOffset,
          });
        });
        
        const paverOutline = new Rect({
          left: 0,
          top: 0,
          fill: '#D3D3D3',
          stroke: '#808080',
          strokeWidth: 1,
          width: outerLengthPixels,
          height: outerWidthPixels,
          originX: 'center',
          originY: 'center',
        });
        
        (paverOutline as any).isPaver = true;
        groupElements.unshift(paverOutline);
        
        const paverLabels = createPaverLabels(
          outerLengthPixels,
          outerWidthPixels,
          parseFloat(paverLeftFeet) || 0,
          parseFloat(paverLeftInches) || 0,
          parseFloat(paverRightFeet) || 0,
          parseFloat(paverRightInches) || 0,
          parseFloat(paverTopFeet) || 0,
          parseFloat(paverTopInches) || 0,
          parseFloat(paverBottomFeet) || 0,
          parseFloat(paverBottomInches) || 0
        );
        groupElements.push(...paverLabels);
      }
      
      const poolGroup = new Group(groupElements, {
        left: currentLeft,
        top: currentTop,
        angle: currentAngle,
        originX: 'center',
        originY: 'center',
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: false,
        hasControls: true,
        hasBorders: true,
      });
      
      poolGroup.setControlsVisibility({
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
      
      (poolGroup as any).poolId = poolId;
      (poolGroup as any).poolData = {
        length,
        width,
        poolName,
        copingSize: poolCopingSize,
        paverDimensions: {
          leftFeet: parseFloat(paverLeftFeet) || 0,
          leftInches: parseFloat(paverLeftInches) || 0,
          rightFeet: parseFloat(paverRightFeet) || 0,
          rightInches: parseFloat(paverRightInches) || 0,
          topFeet: parseFloat(paverTopFeet) || 0,
          topInches: parseFloat(paverTopInches) || 0,
          bottomFeet: parseFloat(paverBottomFeet) || 0,
          bottomInches: parseFloat(paverBottomInches) || 0,
        }
      };
      
      fabricCanvas.add(poolGroup);
      
      fabricCanvas.getObjects().forEach((obj) => {
        if ((obj as any).isBackgroundImage) {
          fabricCanvas.sendObjectToBack(obj);
        } else if ((obj as any).measurementId) {
          fabricCanvas.bringObjectToFront(obj);
        }
      });
      
      setPools(prev => prev.map(p => (p as any).poolId === poolId ? poolGroup : p));
      fabricCanvas.setActiveObject(poolGroup);
      fabricCanvas.renderAll();
    });
  };

  // Paver change handlers
  const handlePaverLeftFeetChange = (value: string) => {
    setPaverLeftFeet(value);
    if (selectedPoolId) {
      setTimeout(() => updatePoolPavers(selectedPoolId), 100);
    }
  };

  const handlePaverLeftInchesChange = (value: string) => {
    setPaverLeftInches(value);
    if (selectedPoolId) {
      setTimeout(() => updatePoolPavers(selectedPoolId), 100);
    }
  };

  const handlePaverRightFeetChange = (value: string) => {
    setPaverRightFeet(value);
    if (selectedPoolId) {
      setTimeout(() => updatePoolPavers(selectedPoolId), 100);
    }
  };

  const handlePaverRightInchesChange = (value: string) => {
    setPaverRightInches(value);
    if (selectedPoolId) {
      setTimeout(() => updatePoolPavers(selectedPoolId), 100);
    }
  };

  const handlePaverTopFeetChange = (value: string) => {
    setPaverTopFeet(value);
    if (selectedPoolId) {
      setTimeout(() => updatePoolPavers(selectedPoolId), 100);
    }
  };

  const handlePaverTopInchesChange = (value: string) => {
    setPaverTopInches(value);
    if (selectedPoolId) {
      setTimeout(() => updatePoolPavers(selectedPoolId), 100);
    }
  };

  const handlePaverBottomFeetChange = (value: string) => {
    setPaverBottomFeet(value);
    if (selectedPoolId) {
      setTimeout(() => updatePoolPavers(selectedPoolId), 100);
    }
  };

  const handlePaverBottomInchesChange = (value: string) => {
    setPaverBottomInches(value);
    if (selectedPoolId) {
      setTimeout(() => updatePoolPavers(selectedPoolId), 100);
    }
  };

  const startScaleReference = () => {
    if (!fabricCanvas) {
      console.warn('Canvas not ready');
      return;
    }
    
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
          setScaleReference({
            length: realLength,
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
    // Always update the unit state first
    setScaleUnit(newUnit);
    
    // If there's an existing scale reference, convert it to the new unit
    if (scaleReference && newUnit !== scaleUnit) {
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
  };

  const addTypedMeasurement = () => {
    if (!fabricCanvas || !scaleReference) return;
    
    let distance: number;
    
    if (scaleUnit === 'meters') {
      // Use meters input
      const distanceM = parseFloat(typedDistanceMeters) || 0;
      distance = distanceM;
      
      if (distance <= 0) {
        alert('Please enter a valid positive number for the distance in meters.');
        return;
      }
    } else {
      // Use feet + inches input
      const distanceFt = parseFloat(typedDistanceFeet) || 0;
      const distanceIn = parseFloat(typedDistanceInches) || 0;
      distance = distanceFt + distanceIn / 12;
      
      if (distance <= 0) {
        alert('Please enter a valid positive number for the distance.');
        return;
      }
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
    
    // Add delete control (X button)
    measurementGroup.controls['deleteControl'] = new Control({
      x: 0.5,
      y: -0.5,
      offsetX: 16,
      offsetY: -16,
      cursorStyle: 'pointer',
      mouseUpHandler: () => {
        fabricCanvas.remove(measurementGroup);
        setMeasurementLines(prev => prev.filter(m => m !== measurementGroup));
        fabricCanvas.renderAll();
        return true;
      },
      render: (ctx, left, top) => {
        const size = 20;
        ctx.save();
        ctx.translate(left, top);
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.moveTo(-size / 4, -size / 4);
        ctx.lineTo(size / 4, size / 4);
        ctx.moveTo(size / 4, -size / 4);
        ctx.lineTo(-size / 4, size / 4);
        ctx.stroke();
        ctx.restore();
      },
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
    setTypedDistanceMeters('');
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
          fill: '#808080',
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
          stroke: '#808080',
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
        
        // Ask for fence name
        const fenceName = prompt('Enter fence name (optional):');
        
        // Create fence polyline with editable points
        const fence = new Polyline(polylinePoints, {
          stroke: '#808080',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
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
        
        (fence as any).fenceId = fenceId;
        if (fenceName) {
          (fence as any).fenceName = fenceName;
        }
        
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
        
        // Add delete control (X button) to fence
        fence.controls['deleteControl'] = new Control({
          x: 0.5,
          y: -0.5,
          offsetX: 16,
          offsetY: -16,
          cursorStyle: 'pointer',
          mouseUpHandler: () => {
            // Remove fence and its markers
            const markers = fabricCanvas.getObjects().filter((obj: any) => 
              obj.fenceId === fenceId && obj.isFenceMarker
            );
            markers.forEach(marker => fabricCanvas.remove(marker));
            fabricCanvas.remove(fence);
            setFences(prev => prev.filter(f => f !== fence));
            fabricCanvas.renderAll();
            return true;
          },
          render: (ctx, left, top) => {
            const size = 20;
            ctx.save();
            ctx.translate(left, top);
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.moveTo(-size / 4, -size / 4);
            ctx.lineTo(size / 4, size / 4);
            ctx.moveTo(size / 4, -size / 4);
            ctx.lineTo(-size / 4, size / 4);
            ctx.stroke();
            ctx.restore();
          },
        });
        
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

  const startPaverDrawing = () => {
    if (!fabricCanvas || !scaleReference) {
      alert('Please set a scale reference first.');
      return;
    }
    
    setIsDrawingPaver(true);
    isDrawingPaverRef.current = true;
    
    const paverPoints: { x: number; y: number }[] = [];
    let previewLine: Line | null = null;
    let pointMarkers: Circle[] = [];
    
    const stopPaverDrawing = () => {
      setIsDrawingPaver(false);
      isDrawingPaverRef.current = false;
      
      // Clean up preview line and markers
      if (previewLine) {
        fabricCanvas.remove(previewLine);
        previewLine = null;
      }
      pointMarkers.forEach(marker => fabricCanvas.remove(marker));
      pointMarkers = [];
      
      fabricCanvas.off('mouse:down', onMouseDownPaver);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:dblclick', handleFinish);
      window.removeEventListener('keydown', handleKeyPress);
      const canvasElement = fabricCanvas.getElement();
      canvasElement.removeEventListener('contextmenu', preventContextMenu);
      
      fabricCanvas.renderAll();
    };
    
    const handleMouseMove = (e: any) => {
      if (!isDrawingPaverRef.current || paverPoints.length === 0) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      // Snap to straight lines if shift is held
      if (e.e.shiftKey && paverPoints.length > 0) {
        const lastPoint = paverPoints[paverPoints.length - 1];
        const dx = Math.abs(pointer.x - lastPoint.x);
        const dy = Math.abs(pointer.y - lastPoint.y);
        
        // Snap to horizontal or vertical based on which is closer
        if (dx > dy) {
          pointer.y = lastPoint.y;
        } else {
          pointer.x = lastPoint.x;
        }
      }
      
      // Remove old preview line
      if (previewLine) {
        fabricCanvas.remove(previewLine);
      }
      
      // Draw preview line from last point to cursor
      const lastPoint = paverPoints[paverPoints.length - 1];
      previewLine = new Line([lastPoint.x, lastPoint.y, pointer.x, pointer.y], {
        stroke: '#22c55e',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
      fabricCanvas.add(previewLine);
      fabricCanvas.renderAll();
    };
    
    const handleFinish = (e?: any) => {
      if (!isDrawingPaverRef.current) return;
      if (e?.e) e.e.preventDefault();

      // Need at least 3 points to create a polygon
      if (paverPoints.length >= 3) {
        // Calculate area in square feet
        const calculatePolygonArea = (points: { x: number; y: number }[]) => {
          let area = 0;
          for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
          }
          return Math.abs(area / 2);
        };
        
        const pixelArea = calculatePolygonArea(paverPoints);
        
        // Convert pixel area to real area using scale
        const scaleFactor = scaleReference.length / scaleReference.pixelLength;
        const realArea = pixelArea * scaleFactor * scaleFactor;
        
        const paverId = `paver-${Date.now()}`;
        
        // Create closed polygon
        const closedPoints = [...paverPoints, paverPoints[0]];
        const polylinePoints = closedPoints.map(p => ({ x: p.x, y: p.y }));
        
        // Create paver polygon - grey with 2px stroke, no point editing
        const paver = new Polyline(polylinePoints, {
          stroke: '#808080',
          strokeWidth: 2,
          fill: 'transparent',
          selectable: true,
          evented: true,
          objectCaching: false,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          hasControls: true,
          hasBorders: true,
        });
        
        
        // Add name label for paver
        const paverName = prompt('Enter paver name (optional):');
        if (paverName) {
          (paver as any).paverName = paverName;
        }
        
        // Remove point editing controls - pavers can only be moved
        paver.setControlsVisibility({
          mt: false,
          mb: false,
          ml: false,
          mr: false,
          bl: false,
          br: false,
          tl: false,
          tr: false,
          mtr: false,
        });
        
        // Add delete control (X button) to drawn paver
        paver.controls['deleteControl'] = new Control({
          x: 0.5,
          y: -0.5,
          offsetX: 16,
          offsetY: -16,
          cursorStyle: 'pointer',
          mouseUpHandler: () => {
            // Remove paver (no area text to remove since we don't show it)
            fabricCanvas.remove(paver);
            setPavers(prev => prev.filter(p => p !== paver));
            fabricCanvas.renderAll();
            return true;
          },
          render: (ctx, left, top) => {
            const size = 20;
            ctx.save();
            ctx.translate(left, top);
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.moveTo(-size / 4, -size / 4);
            ctx.lineTo(size / 4, size / 4);
            ctx.moveTo(size / 4, -size / 4);
            ctx.lineTo(-size / 4, size / 4);
            ctx.stroke();
            ctx.restore();
          },
        });
        
        (paver as any).paverId = paverId;
        
        // Add paver name label if provided
        if (paverName) {
          const centerPoint = paver.getCenterPoint();
          const nameLabel = new Text(paverName, {
            left: centerPoint.x,
            top: centerPoint.y,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#000000',
            fontWeight: 'bold',
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: 4,
          });
          
          (nameLabel as any).paverId = paverId;
          (nameLabel as any).isPaverName = true;
          
          fabricCanvas.add(nameLabel);
          fabricCanvas.bringObjectToFront(nameLabel);
        }
        
        fabricCanvas.add(paver);
        
        // Send paver behind pools but above background
        const bgImage = fabricCanvas.getObjects().find(obj => (obj as any).isBackgroundImage);
        if (bgImage) {
          const bgIndex = fabricCanvas.getObjects().indexOf(bgImage);
          fabricCanvas.remove(paver);
          fabricCanvas.insertAt(bgIndex + 1, paver);
        } else {
          fabricCanvas.sendObjectToBack(paver);
        }
        
        setPavers(prev => [...prev, paver]);
      }
      
      stopPaverDrawing();
    };
    
    const onMouseDownPaver = (e: any) => {
      if (!isDrawingPaverRef.current) return;
      
      const mouseEvent = e.e as MouseEvent;
      
      if (mouseEvent.button === 0) {
        const pointer = fabricCanvas.getScenePoint(e.e);
        
        // Snap to straight lines if shift is held
        if (mouseEvent.shiftKey && paverPoints.length > 0) {
          const lastPoint = paverPoints[paverPoints.length - 1];
          const dx = Math.abs(pointer.x - lastPoint.x);
          const dy = Math.abs(pointer.y - lastPoint.y);
          
          // Snap to horizontal or vertical based on which is closer
          if (dx > dy) {
            pointer.y = lastPoint.y;
          } else {
            pointer.x = lastPoint.x;
          }
        }
        
        paverPoints.push({ x: pointer.x, y: pointer.y });
        
        // Add visual marker
        const marker = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 4,
          fill: '#22c55e',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        fabricCanvas.add(marker);
        pointMarkers.push(marker);
        
        // Draw line from previous point
        if (paverPoints.length > 1) {
          const prevPoint = paverPoints[paverPoints.length - 2];
          const line = new Line([prevPoint.x, prevPoint.y, pointer.x, pointer.y], {
            stroke: '#22c55e',
            strokeWidth: 1,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(line);
          pointMarkers.push(line as any);
        }
        
        fabricCanvas.renderAll();
      } else if (mouseEvent.button === 2) {
        handleFinish();
      }
    };
    
    const handleRightClick = (e: any) => {
      if (!isDrawingPaverRef.current) return;
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
    
    fabricCanvas.on('mouse:down', onMouseDownPaver);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:dblclick', handleFinish);
    
    window.addEventListener('keydown', handleKeyPress);
    const canvasElement = fabricCanvas.getElement();
    canvasElement.addEventListener('contextmenu', preventContextMenu);
  };

  const deleteSelectedPaver = () => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject as any).paverId) {
      const paverId = (activeObject as any).paverId;
      
      // Remove the paver and its name label
      fabricCanvas.remove(activeObject);
      
      const nameLabel = fabricCanvas.getObjects().find((obj: any) => 
        obj.paverId === paverId && obj.isPaverName
      );
      if (nameLabel) fabricCanvas.remove(nameLabel);
      
      setPavers(prev => prev.filter(p => p !== activeObject));
      fabricCanvas.renderAll();
    }
  };

  const addRectangularPaver = (widthFeet: number, lengthFeet: number) => {
    if (!fabricCanvas || !scaleReference) {
      alert('Please set a scale reference first.');
      return;
    }

    // Convert dimensions to pixels
    const pixelWidth = widthFeet * scaleReference.pixelLength / scaleReference.length;
    const pixelLength = lengthFeet * scaleReference.pixelLength / scaleReference.length;

    // Get canvas center
    const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas.getZoom();
    const centerX = (fabricCanvas.width! / 2 - vpt[4]) / zoom;
    const centerY = (fabricCanvas.height! / 2 - vpt[5]) / zoom;

    // Create rectangle points
    const halfWidth = pixelWidth / 2;
    const halfLength = pixelLength / 2;
    
    const paverPoints = [
      { x: centerX - halfWidth, y: centerY - halfLength },
      { x: centerX + halfWidth, y: centerY - halfLength },
      { x: centerX + halfWidth, y: centerY + halfLength },
      { x: centerX - halfWidth, y: centerY + halfLength },
      { x: centerX - halfWidth, y: centerY - halfLength }, // Close the polygon
    ];

    const paverId = `paver-${Date.now()}`;

    // Create paver polygon
    const paver = new Polyline(paverPoints, {
      stroke: '#22c55e',
      strokeWidth: 1,
      fill: 'rgba(34, 197, 94, 0.2)',
      selectable: true,
      evented: true,
      objectCaching: false,
      cornerStyle: 'circle',
      cornerColor: '#22c55e',
      cornerSize: 8,
      transparentCorners: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: true,
      hasBorders: true,
    });

    // Enable polyline point editing
    paver.points?.forEach((point, index) => {
      if (index === paver.points!.length - 1) return; // Skip the last point (duplicate of first)

      paver.controls[`p${index}`] = new Control({
        positionHandler: (dim, finalMatrix, fabricObject) => {
          const polyline = fabricObject as Polyline;
          const pt = polyline.points![index] as any;
          const x = pt.x - polyline.pathOffset!.x;
          const y = pt.y - polyline.pathOffset!.y;
          const matrix = util.multiplyTransformMatrices(
            fabricCanvas.viewportTransform,
            polyline.calcTransformMatrix()
          );
          return util.transformPoint({ x, y }, matrix);
        },
        actionHandler: (eventData, transform, x, y) => {
          const polyline = transform.target as Polyline;
          const pt = polyline.points![index] as any;
          const lastPt = polyline.points![polyline.points!.length - 1] as any;

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

          const invMatrix = util.invertTransform(
            util.multiplyTransformMatrices(
              fabricCanvas.viewportTransform,
              polyline.calcTransformMatrix()
            )
          );
          const newPoint = util.transformPoint({ x, y }, invMatrix);

          pt.x = newPoint.x + transform.offsetX + polyline.pathOffset!.x;
          pt.y = newPoint.y + transform.offsetY + polyline.pathOffset!.y;

          // Update the last point to match the first point
          if (index === 0) {
            lastPt.x = pt.x;
            lastPt.y = pt.y;
          }

          // Recalculate the area after editing
          const shoelaceArea = Math.abs(
            paver.points!.slice(0, -1).reduce((sum: number, point: any, i: number) => {
              const nextPoint = paver.points![i + 1] as any;
              return sum + (point.x * nextPoint.y - nextPoint.x * point.y);
            }, 0) / 2
          );

          const realArea = (shoelaceArea * scaleReference.length * scaleReference.length) / (scaleReference.pixelLength * scaleReference.pixelLength);
          (polyline as any).paverArea = realArea;

          // Update area text
          const areaText = fabricCanvas.getObjects().find((obj: any) => 
            obj.paverId === paverId && obj.isPaverArea
          ) as Text;
          
          if (areaText) {
            areaText.set({ text: `${realArea.toFixed(2)} sq ft` });
          }

          return true;
        },
        render: (ctx, left, top, styleOverride, fabricObject) => {
          ctx.save();
          ctx.fillStyle = '#22c55e';
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(left, top, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        },
      });
    });

    // Add delete control (X button) to paver
    paver.controls['deleteControl'] = new Control({
      x: 0.5,
      y: -0.5,
      offsetX: 16,
      offsetY: -16,
      cursorStyle: 'pointer',
      mouseUpHandler: () => {
        // Remove paver and its area text
        const areaTextObj = fabricCanvas.getObjects().find((obj: any) => 
          obj.paverId === paverId && obj.isPaverArea
        );
        if (areaTextObj) fabricCanvas.remove(areaTextObj);
        fabricCanvas.remove(paver);
        setPavers(prev => prev.filter(p => p !== paver));
        fabricCanvas.renderAll();
        return true;
      },
      render: (ctx, left, top) => {
        const size = 20;
        ctx.save();
        ctx.translate(left, top);
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.moveTo(-size / 4, -size / 4);
        ctx.lineTo(size / 4, size / 4);
        ctx.moveTo(size / 4, -size / 4);
        ctx.lineTo(-size / 4, size / 4);
        ctx.stroke();
        ctx.restore();
      },
    });

    // Calculate area
    const area = widthFeet * lengthFeet;
    (paver as any).paverArea = area;
    (paver as any).paverId = paverId;

    fabricCanvas.add(paver);

    // Send paver behind pools but above background
    const bgImage = fabricCanvas.getObjects().find(obj => (obj as any).isBackgroundImage);
    if (bgImage) {
      const bgIndex = fabricCanvas.getObjects().indexOf(bgImage);
      fabricCanvas.remove(paver);
      fabricCanvas.insertAt(bgIndex + 1, paver);
    } else {
      fabricCanvas.sendObjectToBack(paver);
    }

    // Add area text
    const areaText = new Text(`${area.toFixed(2)} sq ft`, {
      fontSize: 14,
      fontFamily: 'Inter, Arial, sans-serif',
      fill: '#22c55e',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
    });

    (areaText as any).paverId = paverId;
    (areaText as any).isPaverArea = true;

    areaText.set({
      left: centerX,
      top: centerY - 10,
    });
    fabricCanvas.add(areaText);
    fabricCanvas.bringObjectToFront(areaText);

    setPavers(prev => [...prev, paver]);
    fabricCanvas.renderAll();
  };

  // Expose state to parent component
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        scaleUnit,
        onUnitChange: handleUnitChange,
        isSettingScale,
        scaleReference,
        canvasReady: !!fabricCanvas,
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
        typedDistanceMeters,
        onTypedDistanceFeetChange: setTypedDistanceFeet,
        onTypedDistanceInchesChange: setTypedDistanceInches,
        onTypedDistanceMetersChange: setTypedDistanceMeters,
        onAddTypedMeasurement: addTypedMeasurement,
        onDeleteSelectedMeasurement: deleteSelectedMeasurement,
        copingSize,
        onCopingSizeChange: setCopingSize,
        paverLeftFeet,
        paverLeftInches,
        paverRightFeet,
        paverRightInches,
        paverTopFeet,
        paverTopInches,
        paverBottomFeet,
        paverBottomInches,
        onPaverLeftFeetChange: handlePaverLeftFeetChange,
        onPaverLeftInchesChange: handlePaverLeftInchesChange,
        onPaverRightFeetChange: handlePaverRightFeetChange,
        onPaverRightInchesChange: handlePaverRightInchesChange,
        onPaverTopFeetChange: handlePaverTopFeetChange,
        onPaverTopInchesChange: handlePaverTopInchesChange,
        onPaverBottomFeetChange: handlePaverBottomFeetChange,
        onPaverBottomInchesChange: handlePaverBottomInchesChange,
        isDrawingFence,
        onStartFenceDrawing: startFenceDrawing,
        onDeleteSelectedFence: deleteSelectedFence,
        isDrawingPaver,
        onStartPaverDrawing: startPaverDrawing,
        onDeleteSelectedPaver: deleteSelectedPaver,
        onAddRectangularPaver: addRectangularPaver,
      });
    }
  }, [scaleUnit, isSettingScale, scaleReference, fabricCanvas, poolLengthFeet, poolLengthInches, poolWidthFeet, poolWidthInches, measurementMode, isMeasuring, typedDistanceFeet, typedDistanceInches, typedDistanceMeters, copingSize, paverLeftFeet, paverLeftInches, paverRightFeet, paverRightInches, paverTopFeet, paverTopInches, paverBottomFeet, paverBottomInches, isDrawingFence, isDrawingPaver]);

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