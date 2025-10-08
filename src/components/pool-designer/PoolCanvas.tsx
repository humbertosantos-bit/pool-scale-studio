import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Line, Ellipse, Rect, Circle, Point, Text, Group, Triangle, Pattern } from 'fabric';
import { cn } from '@/lib/utils';
import poolWaterTexture from '@/assets/pool-water.png';

interface PoolCanvasProps {
  imageFile: File | null;
  className?: string;
}

export const PoolCanvas: React.FC<PoolCanvasProps> = ({ imageFile, className }) => {
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
  const [typedDistance, setTypedDistance] = useState('');
  const [poolLength, setPoolLength] = useState('20');
  const [poolWidth, setPoolWidth] = useState('12');
  const bgImageRef = useRef<FabricImage | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8fafc',
      preserveObjectStacking: true, // Prevent objects from jumping to front on selection
    });

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
      
      // Don't enable panning if we're setting scale or measuring
      if (isSettingScaleRef.current || isMeasuringRef.current) return;
      
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

    window.addEventListener('keydown', handleKeyDown);

    setFabricCanvas(canvas);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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

    // Parse user input dimensions
    const length = parseFloat(poolLength);
    const width = parseFloat(poolWidth);
    
    if (isNaN(length) || isNaN(width) || length <= 0 || width <= 0) {
      alert('Please enter valid positive numbers for pool dimensions.');
      return;
    }
    
    const pixelWidth = length * scaleReference.pixelLength / scaleReference.length;
    const pixelHeight = width * scaleReference.pixelLength / scaleReference.length;
    
    // Load water texture and create pattern
    FabricImage.fromURL(poolWaterTexture).then((img) => {
      const pattern = new Pattern({
        source: img.getElement() as HTMLImageElement,
        repeat: 'repeat',
      });
      
      const poolColor = '#3b82f6';
      const pool = new Rect({
        left: fabricCanvas.width! / 2,
        top: fabricCanvas.height! / 2,
        fill: pattern,
        stroke: poolColor,
        strokeWidth: 2,
        opacity: 0.9,
        width: pixelWidth,
        height: pixelHeight,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: false,
        hasControls: true,
        hasBorders: true,
        setControlsVisibility: {
          mt: false, // middle top
          mb: false, // middle bottom
          ml: false, // middle left
          mr: false, // middle right
          bl: false, // bottom left
          br: false, // bottom right
          tl: false, // top left
          tr: false, // top right
          mtr: true, // rotation control
        },
      });

      (pool as any).poolId = `pool-${Date.now()}`;
      fabricCanvas.add(pool);
      
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
      fabricCanvas.remove(activeObject);
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
            const unitLabel = newUnit === 'feet' ? 'FT' : 'M';
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
    if (!fabricCanvas || !scaleReference || !typedDistance) return;
    
    const distance = parseFloat(typedDistance);
    if (isNaN(distance) || distance <= 0) {
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
    const unitLabel = scaleUnit === 'feet' ? 'FT' : 'M';
    
    const finalText = new Text(`${distance.toFixed(2)} ${unitLabel}`, {
      left: midX,
      top: midY - offset,
      fontSize: 6,
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
    setTypedDistance('');
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
      const unitLabel = scaleUnit === 'feet' ? 'FT' : 'M';
      tempText = new Text('0.00 ' + unitLabel, {
        left: pointer.x,
        top: pointer.y,
        fontSize: 6,
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
      
      const unitLabel = scaleUnit === 'feet' ? 'FT' : 'M';
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
        
        const unitLabel = scaleUnit === 'feet' ? 'FT' : 'M';
        const finalText = new Text(`${realLength.toFixed(2)} ${unitLabel}`, {
          left: midX + offsetX,
          top: midY + offsetY,
          fontSize: 6,
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

  return (
    <div className={cn("flex flex-col gap-4", className)}>
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
                value={poolLength}
                onChange={(e) => setPoolLength(e.target.value)}
                placeholder="Length"
                className="px-2 py-1 border rounded text-sm w-20"
                step="0.1"
                min="0"
              />
              <span className="text-sm">×</span>
              <input
                type="number"
                value={poolWidth}
                onChange={(e) => setPoolWidth(e.target.value)}
                placeholder="Width"
                className="px-2 py-1 border rounded text-sm w-20"
                step="0.1"
                min="0"
              />
              <span className="text-sm">{scaleUnit === 'feet' ? 'FT' : 'M'}</span>
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
                    value={typedDistance}
                    onChange={(e) => setTypedDistance(e.target.value)}
                    placeholder={`Distance in ${scaleUnit === 'feet' ? 'FT' : 'M'}`}
                    className="px-2 py-1 border rounded text-sm w-32"
                    step="0.01"
                    min="0"
                  />
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
      
      <div className="border rounded-lg shadow-elegant overflow-hidden bg-white">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
    </div>
  );
};