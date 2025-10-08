import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Line, Ellipse, Rect, Circle, Point } from 'fabric';
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
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [scaleUnit, setScaleUnit] = useState<'feet' | 'meters'>('feet');
  const [pools, setPools] = useState<any[]>([]);

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
    let startPoint: { x: number; y: number } | null = null;
    let line: Line | null = null;

    const handleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getScenePoint(e.e);
      startPoint = { x: pointer.x, y: pointer.y };
    };

    const handleMouseMove = (e: any) => {
      if (!startPoint) return;
      
      const pointer = fabricCanvas.getScenePoint(e.e);
      
      if (line) {
        fabricCanvas.remove(line);
      }
      
      line = new Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
        stroke: '#ef4444',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      
      fabricCanvas.add(line);
      fabricCanvas.renderAll();
    };

    const handleMouseUp = () => {
      if (!startPoint || !line) return;
      
      const pixelLength = Math.sqrt(
        Math.pow(line.x2! - line.x1!, 2) + Math.pow(line.y2! - line.y1!, 2)
      );
      
      const realLength = prompt(`Enter the real-world length of this measurement (in ${scaleUnit}):`);
      if (realLength && !isNaN(Number(realLength))) {
        setScaleReference({
          length: Number(realLength),
          pixelLength: pixelLength,
        });
        setIsSettingScale(false);
        // Remove the scale line after setting
        fabricCanvas.remove(line);
      } else {
        fabricCanvas.remove(line);
      }
      
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
      fabricCanvas.renderAll();
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);
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
          {isSettingScale ? 'Click and drag to set scale...' : scaleReference ? 'Reset Scale Reference' : 'Set Scale Reference'}
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