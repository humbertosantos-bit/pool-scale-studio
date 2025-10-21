import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Rect, Point, Text, Line } from 'fabric';
import { cn } from '@/lib/utils';
import type { Unit, CopingSize, PoolModel, CustomPoolDimensions, PaverConfig } from '@/types/poolDesigner';
import { feetToMeters, formatDimension, inchesToFeet } from '@/types/poolDesigner';

interface PoolCanvasProps {
  imageFile: File | null;
  className?: string;
  canvasOnly?: boolean;
  onStateChange?: (state: any) => void;
  selectedModel: PoolModel | null;
  customDimensions: CustomPoolDimensions | null;
  isCustom: boolean;
  unit: Unit;
  copingSize: CopingSize;
  paverConfig: PaverConfig;
  isSettingScale: boolean;
  onIsSettingScaleChange: (value: boolean) => void;
}

export const PoolCanvas: React.FC<PoolCanvasProps> = ({
  imageFile,
  className,
  canvasOnly = false,
  onStateChange,
  selectedModel,
  customDimensions,
  isCustom,
  unit,
  copingSize,
  paverConfig,
  isSettingScale,
  onIsSettingScaleChange,
}) => {
  console.log('PoolCanvas render - isSettingScale:', isSettingScale);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [scaleReference, setScaleReference] = useState<{ length: number; pixelLength: number } | null>(null);
  const bgImageRef = useRef<FabricImage | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: '#f8fafc',
      selection: false,
    });

    // Handle window resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      canvas.setDimensions({ width: newWidth, height: newHeight });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    // Enable zoom
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Enable panning with middle mouse or alt+drag
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.altKey === true || evt.button === 1) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isPanning) {
        const evt = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          canvas.requestRenderAll();
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
        }
      }
    });

    canvas.on('mouse:up', () => {
      isPanning = false;
      canvas.selection = true;
    });

    setFabricCanvas(canvas);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Load background image
  useEffect(() => {
    if (!fabricCanvas || !imageFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      FabricImage.fromURL(imgUrl).then((img) => {
        // Remove old background image
        if (bgImageRef.current) {
          fabricCanvas.remove(bgImageRef.current);
        }

        const canvasWidth = fabricCanvas.width || 800;
        const canvasHeight = fabricCanvas.height || 600;
        
        // Scale image to fit canvas
        const scale = Math.min(
          (canvasWidth * 0.8) / (img.width || 1),
          (canvasHeight * 0.8) / (img.height || 1)
        );

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });

        fabricCanvas.add(img);
        fabricCanvas.sendObjectToBack(img);
        bgImageRef.current = img;
        fabricCanvas.renderAll();
      });
    };
    reader.readAsDataURL(imageFile);
  }, [fabricCanvas, imageFile]);

  // Render pool, coping, and pavers
  useEffect(() => {
    if (!fabricCanvas || !scaleReference) return;

    // Clear existing pool objects
    const objects = fabricCanvas.getObjects();
    objects.forEach((obj: any) => {
      if (obj.poolElement) {
        fabricCanvas.remove(obj);
      }
    });

    // Calculate pool dimensions in feet
    let poolLengthFeet = 0;
    let poolWidthFeet = 0;
    let modelName = '';

    if (isCustom && customDimensions) {
      poolLengthFeet = customDimensions.lengthFeet + inchesToFeet(customDimensions.lengthInches);
      poolWidthFeet = customDimensions.widthFeet + inchesToFeet(customDimensions.widthInches);
      modelName = 'Custom Pool';
    } else if (selectedModel) {
      poolLengthFeet = selectedModel.lengthFeet;
      poolWidthFeet = selectedModel.widthFeet;
      modelName = selectedModel.name;
    } else {
      return; // No pool selected
    }

    const pixelsPerFoot = scaleReference.pixelLength / scaleReference.length;
    
    // Convert to pixels
    const poolLengthPx = poolLengthFeet * pixelsPerFoot;
    const poolWidthPx = poolWidthFeet * pixelsPerFoot;
    
    const centerX = (fabricCanvas.width || 800) / 2;
    const centerY = (fabricCanvas.height || 600) / 2;

    // Draw pool
    const pool = new Rect({
      left: centerX - poolLengthPx / 2,
      top: centerY - poolWidthPx / 2,
      width: poolLengthPx,
      height: poolWidthPx,
      fill: '#4A90E2',
      stroke: '#2E5C8A',
      strokeWidth: 2,
      selectable: false,
      poolElement: true,
    } as any);
    fabricCanvas.add(pool);

    // Draw pool name label
    const nameLabel = new Text(modelName, {
      left: centerX,
      top: centerY,
      fontSize: Math.min(poolLengthPx / 10, poolWidthPx / 5, 40),
      fill: '#ffffff',
      originX: 'center',
      originY: 'center',
      fontWeight: 'bold',
      selectable: false,
      poolElement: true,
    } as any);
    fabricCanvas.add(nameLabel);

    // Draw coping if selected
    if (copingSize > 0) {
      const copingFeet = inchesToFeet(copingSize);
      const copingPx = copingFeet * pixelsPerFoot;

      const coping = new Rect({
        left: centerX - (poolLengthPx + copingPx * 2) / 2,
        top: centerY - (poolWidthPx + copingPx * 2) / 2,
        width: poolLengthPx + copingPx * 2,
        height: poolWidthPx + copingPx * 2,
        fill: 'transparent',
        stroke: '#8B4513',
        strokeWidth: copingPx,
        selectable: false,
        poolElement: true,
      } as any);
      fabricCanvas.add(coping);
      fabricCanvas.sendObjectBackwards(coping);
    }

    // Draw pavers
    const copingFeet = inchesToFeet(copingSize);
    const copingPx = copingFeet * pixelsPerFoot;

    const paverTop = paverConfig.top * pixelsPerFoot;
    const paverRight = paverConfig.right * pixelsPerFoot;
    const paverBottom = paverConfig.bottom * pixelsPerFoot;
    const paverLeft = paverConfig.left * pixelsPerFoot;

    // Pool bounds including coping
    const poolWithCopingLeft = centerX - (poolLengthPx + copingPx * 2) / 2;
    const poolWithCopingTop = centerY - (poolWidthPx + copingPx * 2) / 2;
    const poolWithCopingRight = centerX + (poolLengthPx + copingPx * 2) / 2;
    const poolWithCopingBottom = centerY + (poolWidthPx + copingPx * 2) / 2;

    if (paverTop > 0) {
      const paver = new Rect({
        left: poolWithCopingLeft - paverLeft,
        top: poolWithCopingTop - paverTop,
        width: poolLengthPx + copingPx * 2 + paverLeft + paverRight,
        height: paverTop,
        fill: 'rgba(192, 192, 192, 0.7)',
        stroke: '#666',
        strokeWidth: 1,
        selectable: false,
        poolElement: true,
      } as any);
      fabricCanvas.add(paver);
      fabricCanvas.sendObjectBackwards(paver);
    }

    if (paverBottom > 0) {
      const paver = new Rect({
        left: poolWithCopingLeft - paverLeft,
        top: poolWithCopingBottom,
        width: poolLengthPx + copingPx * 2 + paverLeft + paverRight,
        height: paverBottom,
        fill: 'rgba(192, 192, 192, 0.7)',
        stroke: '#666',
        strokeWidth: 1,
        selectable: false,
        poolElement: true,
      } as any);
      fabricCanvas.add(paver);
      fabricCanvas.sendObjectBackwards(paver);
    }

    if (paverLeft > 0) {
      const paver = new Rect({
        left: poolWithCopingLeft - paverLeft,
        top: poolWithCopingTop,
        width: paverLeft,
        height: poolWidthPx + copingPx * 2,
        fill: 'rgba(192, 192, 192, 0.7)',
        stroke: '#666',
        strokeWidth: 1,
        selectable: false,
        poolElement: true,
      } as any);
      fabricCanvas.add(paver);
      fabricCanvas.sendObjectBackwards(paver);
    }

    if (paverRight > 0) {
      const paver = new Rect({
        left: poolWithCopingRight,
        top: poolWithCopingTop,
        width: paverRight,
        height: poolWidthPx + copingPx * 2,
        fill: 'rgba(192, 192, 192, 0.7)',
        stroke: '#666',
        strokeWidth: 1,
        selectable: false,
        poolElement: true,
      } as any);
      fabricCanvas.add(paver);
      fabricCanvas.sendObjectBackwards(paver);
    }

    // Calculate total paver area
    const totalPaverAreaFeet = calculatePaverArea(
      poolLengthFeet,
      poolWidthFeet,
      copingFeet,
      paverConfig
    );

    console.log(`Total paver area: ${totalPaverAreaFeet.toFixed(2)} sq ft`);

    fabricCanvas.renderAll();
  }, [fabricCanvas, scaleReference, selectedModel, customDimensions, isCustom, copingSize, paverConfig]);

  // Expose state change for controls
  useEffect(() => {
    if (onStateChange && fabricCanvas) {
      onStateChange({
        scaleReference,
      });
    }
  }, [scaleReference, fabricCanvas, onStateChange]);

  // Handle scale reference drawing
  useEffect(() => {
    if (!fabricCanvas || !isSettingScale) return;

    console.log('Scale reference mode activated');
    let startPoint: Point | null = null;
    let line: any = null;

    const handleMouseDown = (opt: any) => {
      const pointer = fabricCanvas.getScenePoint(opt.e);
      startPoint = pointer;
    };

    const handleMouseMove = (opt: any) => {
      if (!startPoint) return;

      const pointer = fabricCanvas.getScenePoint(opt.e);

      if (line) {
        fabricCanvas.remove(line);
      }

      line = new Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
        stroke: '#ff0000',
        strokeWidth: 3,
        selectable: false,
      });

      fabricCanvas.add(line);
      fabricCanvas.renderAll();
    };

    const handleMouseUp = (opt: any) => {
      if (!startPoint) return;

      const pointer = fabricCanvas.getScenePoint(opt.e);
      const distance = Math.sqrt(
        Math.pow(pointer.x - startPoint.x, 2) + Math.pow(pointer.y - startPoint.y, 2)
      );

      if (distance > 10) {
        const lengthInput = prompt(`Enter the actual length of this reference line in ${unit === 'feet' ? 'feet' : 'meters'}:`);
        if (lengthInput) {
          const length = parseFloat(lengthInput);
          if (!isNaN(length) && length > 0) {
            setScaleReference({ length, pixelLength: distance });
          }
        }
      }

      if (line) {
        fabricCanvas.remove(line);
      }
      onIsSettingScaleChange(false);
      startPoint = null;
      line = null;
      fabricCanvas.renderAll();
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
    };
  }, [fabricCanvas, isSettingScale, unit, onIsSettingScaleChange]);

  return (
    <div ref={containerRef} className={cn('w-full h-full', className)}>
      <canvas ref={canvasRef} />
    </div>
  );
};

function calculatePaverArea(
  poolLengthFeet: number,
  poolWidthFeet: number,
  copingFeet: number,
  paverConfig: PaverConfig
): number {
  // Pool + coping dimensions
  const totalLength = poolLengthFeet + copingFeet * 2;
  const totalWidth = poolWidthFeet + copingFeet * 2;

  // Top and bottom strips
  const topBottomArea =
    (totalLength + paverConfig.left + paverConfig.right) *
    (paverConfig.top + paverConfig.bottom);

  // Left and right strips (excluding corners already counted)
  const leftRightArea = (paverConfig.left + paverConfig.right) * totalWidth;

  return topBottomArea + leftRightArea;
}
