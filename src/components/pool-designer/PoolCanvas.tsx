import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Line, Ellipse, Rect, Circle, Point, Text, Group, Triangle } from 'fabric';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8fafc',
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
          selectable: false,
          evented: false,
        });

        fabricCanvas.clear();
        fabricCanvas.add(img);
        fabricCanvas.renderAll();
      });
    };
    reader.readAsDataURL(imageFile);
  }, [fabricCanvas, imageFile]);

  const addPool = () => {
    if (!fabricCanvas || !scaleReference) return;

    // Fixed pool size: 12ft x 20ft (or 3.66m x 6.10m)
    const width = scaleUnit === 'feet' ? 20 : 6.10;
    const height = scaleUnit === 'feet' ? 12 : 3.66;
    
    const pixelWidth = width * scaleReference.pixelLength / scaleReference.length;
    const pixelHeight = height * scaleReference.pixelLength / scaleReference.length;
    
    const poolColor = '#3b82f6';
    const pool = new Rect({
      left: fabricCanvas.width! / 2,
      top: fabricCanvas.height! / 2,
      fill: poolColor + '80',
      stroke: poolColor,
      strokeWidth: 2,
      opacity: 0.8,
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
    setPools(prev => [...prev, pool]);
    fabricCanvas.renderAll();
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
            if (textObj) {
              textObj.set({ text: `${realLength.toFixed(2)} ${newUnit}` });
            }
            (measurement as any).measurementData.unit = newUnit;
          }
        });
        fabricCanvas.renderAll();
      }
    }
    setScaleUnit(newUnit);
  };

  const startMeasurement = () => {
    if (!fabricCanvas || !scaleReference) return;
    
    setIsMeasuring(true);
    isMeasuringRef.current = true;
    let startPoint: { x: number; y: number } | null = null;
    let tempLine: Line | null = null;
    let tempArrow1: Triangle | null = null;
    let tempArrow2: Triangle | null = null;
    let tempText: Text | null = null;

    const handleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getScenePoint(e.e);
      startPoint = { x: pointer.x, y: pointer.y };
      
      // Create temporary line
      tempLine = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: '#10b981',
        strokeWidth: 1,
        strokeUniform: true,
        selectable: false,
        evented: false,
      });
      
      // Create temporary arrows
      tempArrow1 = new Triangle({
        left: pointer.x,
        top: pointer.y,
        width: 6,
        height: 6,
        fill: '#10b981',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'top',
      });
      
      tempArrow2 = new Triangle({
        left: pointer.x,
        top: pointer.y,
        width: 6,
        height: 6,
        fill: '#10b981',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'top',
      });
      
      // Create temporary text
      tempText = new Text('0.00 ' + scaleUnit, {
        left: pointer.x,
        top: pointer.y,
        fontSize: 5,
        fill: '#10b981',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'bottom',
      });
      
      fabricCanvas.add(tempLine, tempArrow1, tempArrow2, tempText);
      fabricCanvas.on('mouse:move', handleMouseMove);
    };
    
    const handleMouseMove = (e: any) => {
      if (!startPoint || !tempLine || !tempArrow1 || !tempArrow2 || !tempText) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      // Update line
      tempLine.set({ x2: pointer.x, y2: pointer.y });
      
      // Calculate angle
      const dx = pointer.x - startPoint.x;
      const dy = pointer.y - startPoint.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      // Update arrows (pointing OUTWARDS at line tips)
      tempArrow1.set({
        left: startPoint.x,
        top: startPoint.y,
        angle: angle + 180,
      });
      
      tempArrow2.set({
        left: pointer.x,
        top: pointer.y,
        angle: angle,
      });
      
      // Calculate measurement
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      const realLength = (pixelLength * scaleReference.length) / scaleReference.pixelLength;
      
      // Update text (parallel to line)
      const midX = (startPoint.x + pointer.x) / 2;
      const midY = (startPoint.y + pointer.y) / 2;
      tempText.set({
        left: midX,
        top: midY,
        text: `${realLength.toFixed(2)} ${scaleUnit}`,
        angle: angle,
      });
      
      fabricCanvas.renderAll();
    };
    
    const handleMouseUp = (e: any) => {
      if (!startPoint || !tempLine || !tempArrow1 || !tempArrow2 || !tempText) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      // Remove temporary objects
      fabricCanvas.remove(tempLine, tempArrow1, tempArrow2, tempText);
      
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
        
        // Create final objects
        const finalLine = new Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
          stroke: '#10b981',
          strokeWidth: 1,
          strokeUniform: true,
          selectable: false,
          evented: false,
        });
        
        const finalArrow1 = new Triangle({
          left: startPoint.x,
          top: startPoint.y,
          width: 6,
          height: 6,
          fill: '#10b981',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'top',
          angle: angle + 180,
        });
        
        const finalArrow2 = new Triangle({
          left: pointer.x,
          top: pointer.y,
          width: 6,
          height: 6,
          fill: '#10b981',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'top',
          angle: angle,
        });
        
        const finalText = new Text(`${realLength.toFixed(2)} ${scaleUnit}`, {
          left: midX,
          top: midY,
          fontSize: 5,
          fill: '#10b981',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'bottom',
          angle: angle,
        });
        
        // Group all elements together
        const measurementGroup = new Group([finalLine, finalArrow1, finalArrow2, finalText], {
          selectable: true,
          evented: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          hasControls: false,
          hasBorders: true,
        });
        
        (measurementGroup as any).measurementId = `measurement-${Date.now()}`;
        (measurementGroup as any).measurementData = {
          pixelLength: pixelLength,
          unit: scaleUnit,
        };
        fabricCanvas.add(measurementGroup);
        setMeasurementLines(prev => [...prev, measurementGroup]);
      }
      
      // Clean up
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
      fabricCanvas.off('mouse:down', handleMouseDown);
      setIsMeasuring(false);
      isMeasuringRef.current = false;
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
            <button
              onClick={addPool}
              className="px-4 py-2 bg-pool-light text-pool-dark rounded-md hover:bg-pool-light/80"
            >
              Add {scaleUnit === 'feet' ? '12×20 ft' : '3.66×6.10 m'} Pool
            </button>
            <button
              onClick={deleteSelectedPool}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
            >
              Delete Selected Pool
            </button>
            <button
              onClick={startMeasurement}
              disabled={isMeasuring}
              className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50"
            >
              {isMeasuring ? 'Click two points to measure...' : 'Measure Distance'}
            </button>
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
          Scale: 1 pixel = {(scaleReference.length / scaleReference.pixelLength).toFixed(4)} {scaleUnit}
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