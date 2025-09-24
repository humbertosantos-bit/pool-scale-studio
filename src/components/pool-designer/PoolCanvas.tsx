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
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
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

    // Enable panning when zoomed (Alt + drag)
    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.altKey === true) {
        setIsDragging(true);
        canvas.selection = false;
        setLastPos({ x: evt.clientX, y: evt.clientY });
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isDragging && lastPos) {
        const e = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPos.x;
          vpt[5] += e.clientY - lastPos.y;
          canvas.requestRenderAll();
          setLastPos({ x: e.clientX, y: e.clientY });
        }
      }
    });

    canvas.on('mouse:up', () => {
      setIsDragging(false);
      canvas.selection = true;
      setLastPos(null);
    });

    setFabricCanvas(canvas);

    return () => {
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
        });

        fabricCanvas.clear();
        fabricCanvas.add(img);
        fabricCanvas.renderAll();
      });
    };
    reader.readAsDataURL(imageFile);
  }, [fabricCanvas, imageFile]);

  const addPool = (type: 'rectangular' | 'oval' | 'round', size: number = 20) => {
    if (!fabricCanvas || !scaleReference) return;

    const pixelSize = size * scaleReference.pixelLength / scaleReference.length;
    
    let pool;
    const poolColor = '#3b82f6';
    const poolOptions = {
      left: fabricCanvas.width! / 2,
      top: fabricCanvas.height! / 2,
      fill: poolColor + '80',
      stroke: poolColor,
      strokeWidth: 2,
      opacity: 0.8,
    };

    switch (type) {
      case 'rectangular':
        pool = new Rect({
          ...poolOptions,
          width: pixelSize * 2,
          height: pixelSize,
        });
        break;
      case 'oval':
        pool = new Ellipse({
          ...poolOptions,
          rx: pixelSize,
          ry: pixelSize * 0.6,
        });
        break;
      case 'round':
        pool = new Circle({
          ...poolOptions,
          radius: pixelSize / 2,
        });
        break;
    }

    if (pool) {
      (pool as any).poolId = `pool-${Date.now()}`;
      fabricCanvas.add(pool);
      setPools(prev => [...prev, pool]);
      fabricCanvas.renderAll();
    }
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
        strokeWidth: 3,
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

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Units:</label>
          <select 
            value={scaleUnit} 
            onChange={(e) => setScaleUnit(e.target.value as 'feet' | 'meters')}
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
          {isSettingScale ? 'Click and drag to set scale...' : 'Set Scale Reference'}
        </button>
        
        {scaleReference && (
          <>
            <button
              onClick={() => addPool('rectangular', scaleUnit === 'feet' ? 20 : 6)}
              className="px-4 py-2 bg-pool-light text-pool-dark rounded-md hover:bg-pool-light/80"
            >
              Add {scaleUnit === 'feet' ? '20×10ft' : '6×3m'} Pool
            </button>
            <button
              onClick={() => addPool('oval', scaleUnit === 'feet' ? 24 : 7)}
              className="px-4 py-2 bg-pool-light text-pool-dark rounded-md hover:bg-pool-light/80"
            >
              Add {scaleUnit === 'feet' ? '24×14ft' : '7×4m'} Oval
            </button>
            <button
              onClick={() => addPool('round', scaleUnit === 'feet' ? 18 : 5)}
              className="px-4 py-2 bg-pool-light text-pool-dark rounded-md hover:bg-pool-light/80"
            >
              Add {scaleUnit === 'feet' ? '18ft' : '5m'} Round
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
        💡 Use mouse wheel to zoom, Alt + drag to pan, drag image to reposition
      </div>
      
      <div className="border rounded-lg shadow-elegant overflow-hidden bg-white">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
    </div>
  );
};