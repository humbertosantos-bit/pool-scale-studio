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
    }
    setScaleUnit(newUnit);
  };

  const startMeasurement = () => {
    if (!fabricCanvas || !scaleReference) return;
    
    setIsMeasuring(true);
    isMeasuringRef.current = true;
    let firstPoint: { x: number; y: number } | null = null;
    let line: Line | null = null;
    let text: Text | null = null;

    const handleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      if (!firstPoint) {
        // First click - start the line
        firstPoint = { x: pointer.x, y: pointer.y };
        
        // Create the line
        line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: '#10b981',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        
        // Create the text
        text = new Text('0.00 ' + scaleUnit, {
          left: pointer.x,
          top: pointer.y - 10,
          fontSize: 5,
          fill: '#10b981',
          selectable: false,
          evented: false,
        });
        
        fabricCanvas.add(line, text);
        fabricCanvas.on('mouse:move', handleMouseMove);
      } else {
        // Second click - finalize the measurement
        fabricCanvas.off('mouse:move', handleMouseMove);
        
        if (line && text) {
          // Calculate final measurement
          const x2 = line.x2!;
          const y2 = line.y2!;
          const pixelLength = Math.sqrt(
            Math.pow(x2 - firstPoint.x, 2) + Math.pow(y2 - firstPoint.y, 2)
          );
          const realLength = (pixelLength * scaleReference.length) / scaleReference.pixelLength;
          
          // Remove temporary objects
          fabricCanvas.remove(line, text);
          
          // Create final editable line with arrows
          const finalLine = new Line([firstPoint.x, firstPoint.y, x2, y2], {
            stroke: '#10b981',
            strokeWidth: 2,
            selectable: true,
            evented: true,
            hasControls: false,
            hasBorders: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
          });
          
          // Calculate angle for arrows
          const angle1 = Math.atan2(y2 - firstPoint.y, x2 - firstPoint.x) * 180 / Math.PI;
          const angle2 = Math.atan2(firstPoint.y - y2, firstPoint.x - x2) * 180 / Math.PI;
          
          // Create arrow at first endpoint
          const arrow1 = new Triangle({
            left: firstPoint.x,
            top: firstPoint.y,
            width: 8,
            height: 8,
            fill: '#10b981',
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
            angle: angle1 + 90,
          });
          
          // Create arrow at second endpoint
          const arrow2 = new Triangle({
            left: x2,
            top: y2,
            width: 8,
            height: 8,
            fill: '#10b981',
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
            angle: angle2 + 90,
          });
          
          // Create final text
          const midX = (firstPoint.x + x2) / 2;
          const midY = (firstPoint.y + y2) / 2;
          const finalText = new Text(`${realLength.toFixed(2)} ${scaleUnit}`, {
            left: midX,
            top: midY - 6,
            fontSize: 5,
            fill: '#10b981',
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
          });
          
          // Group everything together
          const measurementGroup = new Group([finalLine, arrow1, arrow2, finalText], {
            selectable: true,
            evented: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
          });
          
          (measurementGroup as any).measurementId = `measurement-${Date.now()}`;
          fabricCanvas.add(measurementGroup);
          setMeasurementLines(prev => [...prev, measurementGroup]);
        }
        
        fabricCanvas.renderAll();
        
        // Reset for next measurement
        firstPoint = null;
        line = null;
        text = null;
        
        setIsMeasuring(false);
        isMeasuringRef.current = false;
        fabricCanvas.off('mouse:down', handleMouseDown);
      }
    };
    
    const handleMouseMove = (e: any) => {
      if (!firstPoint || !line || !text) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      line.set({ x2: pointer.x, y2: pointer.y });
      
      // Update measurement
      const pixelLength = Math.sqrt(
        Math.pow(pointer.x - firstPoint.x, 2) + Math.pow(pointer.y - firstPoint.y, 2)
      );
      const realLength = (pixelLength * scaleReference.length) / scaleReference.pixelLength;
      
      // Update text position and content
      const midX = (firstPoint.x + pointer.x) / 2;
      const midY = (firstPoint.y + pointer.y) / 2;
      text.set({
        left: midX,
        top: midY - 10,
        text: `${realLength.toFixed(2)} ${scaleUnit}`,
      });
      
      fabricCanvas.renderAll();
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
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