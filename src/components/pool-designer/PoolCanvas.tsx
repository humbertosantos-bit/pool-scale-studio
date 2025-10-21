import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas as FabricCanvas, FabricImage, Rect, Point, Text, Line, Group } from 'fabric';
import * as fabric from 'fabric';
import { cn } from '@/lib/utils';
import type { Unit, CopingSize, PoolModel, CustomPoolDimensions, PaverConfig } from '@/types/poolDesigner';
import { feetToMeters, formatDimension, inchesToFeet } from '@/types/poolDesigner';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import logo from '@/assets/piscineriviera-logo.png';

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

export const PoolCanvas = forwardRef<any, PoolCanvasProps>(({
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
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [scaleReference, setScaleReference] = useState<{ length: number; pixelLength: number } | null>(null);
  const bgImageRef = useRef<FabricImage | null>(null);

  // Expose export method via ref
  useImperativeHandle(ref, () => ({
    exportLayout: () => {
      if (!fabricCanvas || !scaleReference) {
        toast.error('Please set scale reference before exporting');
        return;
      }

      try {
        // Export as PNG
        const dataURL = fabricCanvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 2,
        });
        
        const link = document.createElement('a');
        link.download = 'pool-layout.png';
        link.href = dataURL;
        link.click();

        // Generate PDF
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Add header
        pdf.setFontSize(18);
        pdf.text('Piscine Riviera – Pool Layout Preview', pageWidth / 2, 20, { align: 'center' });
        
        // Add canvas image
        const imgWidth = pageWidth - 40;
        const imgHeight = (fabricCanvas.height! / fabricCanvas.width!) * imgWidth;
        pdf.addImage(dataURL, 'PNG', 20, 30, imgWidth, Math.min(imgHeight, 120));
        
        let yPos = 30 + Math.min(imgHeight, 120) + 15;
        
        // Add details
        pdf.setFontSize(12);
        pdf.text('Layout Details:', 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        
        // Model name
        let modelName = '';
        if (isCustom) {
          modelName = 'Custom Pool';
        } else if (selectedModel) {
          modelName = selectedModel.name;
        }
        pdf.text(`Model: ${modelName}`, 20, yPos);
        yPos += 7;
        
        // Dimensions
        if (isCustom && customDimensions) {
          const length = customDimensions.lengthFeet + inchesToFeet(customDimensions.lengthInches);
          const width = customDimensions.widthFeet + inchesToFeet(customDimensions.widthInches);
          pdf.text(`Dimensions: ${formatDimension(width, unit)} x ${formatDimension(length, unit)}`, 20, yPos);
        } else if (selectedModel) {
          pdf.text(`Dimensions: ${formatDimension(selectedModel.widthFeet, unit)} x ${formatDimension(selectedModel.lengthFeet, unit)}`, 20, yPos);
        }
        yPos += 7;
        
        // Coping
        if (copingSize > 0) {
          pdf.text(`Coping: ${copingSize}" (${formatDimension(inchesToFeet(copingSize), unit)})`, 20, yPos);
          yPos += 7;
        }
        
        // Pavers
        if (paverConfig.top > 0 || paverConfig.right > 0 || paverConfig.bottom > 0 || paverConfig.left > 0) {
          pdf.text('Pavers:', 20, yPos);
          yPos += 7;
          if (paverConfig.sameOnAllSides) {
            pdf.text(`  All sides: ${formatDimension(paverConfig.top, unit)}`, 20, yPos);
            yPos += 7;
          } else {
            pdf.text(`  Top: ${formatDimension(paverConfig.top, unit)}`, 20, yPos);
            yPos += 7;
            pdf.text(`  Right: ${formatDimension(paverConfig.right, unit)}`, 20, yPos);
            yPos += 7;
            pdf.text(`  Bottom: ${formatDimension(paverConfig.bottom, unit)}`, 20, yPos);
            yPos += 7;
            pdf.text(`  Left: ${formatDimension(paverConfig.left, unit)}`, 20, yPos);
            yPos += 7;
          }
        }
        
        // Scale info
        pdf.text(`Scale: ${scaleReference.length} ${unit === 'feet' ? 'ft' : 'm'} reference`, 20, yPos);
        
        pdf.save('pool-layout.pdf');
        
        toast.success('Layout exported successfully!');
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Failed to export layout');
      }
    },
  }));

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
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockScalingFlip: true,
        });

        fabricCanvas.add(img);
        fabricCanvas.sendObjectToBack(img);
        bgImageRef.current = img;
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        
        toast.success('Image loaded! You can now move and rotate it freely.');
      });
    };
    reader.readAsDataURL(imageFile);
  }, [fabricCanvas, imageFile]);

  // Render pool, coping, and pavers as a group
  useEffect(() => {
    if (!fabricCanvas || !scaleReference) return;
    if (isSettingScale) return; // Don't render while setting scale

    // Clear existing pool objects
    const objects = fabricCanvas.getObjects();
    objects.forEach((obj: any) => {
      if (obj.poolElement || obj.poolGroup) {
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
      left: -poolLengthPx / 2,
      top: -poolWidthPx / 2,
      width: poolLengthPx,
      height: poolWidthPx,
      fill: '#4A90E2',
      stroke: '#2E5C8A',
      strokeWidth: 2,
      selectable: false,
    } as any);
    fabricCanvas.add(pool);

    // Draw pool name label
    const nameLabel = new Text(modelName, {
      left: 0,
      top: 0,
      fontSize: Math.min(poolLengthPx / 10, poolWidthPx / 5, 40),
      fill: '#ffffff',
      originX: 'center',
      originY: 'center',
      fontWeight: 'bold',
      selectable: false,
    } as any);
    fabricCanvas.add(nameLabel);

    // Draw coping if selected
    const copingFeet = inchesToFeet(copingSize);
    const copingPx = copingFeet * pixelsPerFoot;

    if (copingSize > 0) {
      const coping = new Rect({
        left: -(poolLengthPx + copingPx * 2) / 2,
        top: -(poolWidthPx + copingPx * 2) / 2,
        width: poolLengthPx + copingPx * 2,
        height: poolWidthPx + copingPx * 2,
        fill: 'transparent',
        stroke: '#8B4513',
        strokeWidth: copingPx,
        selectable: false,
      } as any);
      fabricCanvas.add(coping);
      fabricCanvas.sendObjectBackwards(coping);
    }

    // Draw pavers
    const paverTop = paverConfig.top * pixelsPerFoot;
    const paverRight = paverConfig.right * pixelsPerFoot;
    const paverBottom = paverConfig.bottom * pixelsPerFoot;
    const paverLeft = paverConfig.left * pixelsPerFoot;

    // Pool bounds including coping
    const poolWithCopingLeft = -(poolLengthPx + copingPx * 2) / 2;
    const poolWithCopingTop = -(poolWidthPx + copingPx * 2) / 2;
    const poolWithCopingRight = (poolLengthPx + copingPx * 2) / 2;
    const poolWithCopingBottom = (poolWidthPx + copingPx * 2) / 2;

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
      } as any);
      fabricCanvas.add(paver);
      fabricCanvas.sendObjectBackwards(paver);
    }

    // Create a group with all objects
    const allObjects = fabricCanvas.getObjects();
    const group = new fabric.Group(allObjects, {
      left: centerX,
      top: centerY,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockScalingX: false,
      lockScalingY: false,
      poolGroup: true,
    } as any);

    fabricCanvas.clear();
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    fabricCanvas.renderAll();
  }, [fabricCanvas, scaleReference, selectedModel, customDimensions, isCustom, copingSize, paverConfig, isSettingScale]);

  // Keyboard controls for any active object
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeObject = fabricCanvas.getActiveObject();
      if (!activeObject) return;
      
      const step = e.shiftKey ? 10 : 1;
      
      switch(e.key) {
        case 'ArrowUp':
          activeObject.set('top', (activeObject.top || 0) - step);
          e.preventDefault();
          break;
        case 'ArrowDown':
          activeObject.set('top', (activeObject.top || 0) + step);
          e.preventDefault();
          break;
        case 'ArrowLeft':
          activeObject.set('left', (activeObject.left || 0) - step);
          e.preventDefault();
          break;
        case 'ArrowRight':
          activeObject.set('left', (activeObject.left || 0) + step);
          e.preventDefault();
          break;
        default:
          return;
      }
      
      activeObject.setCoords();
      fabricCanvas.renderAll();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fabricCanvas]);

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

    // Disable image selection during scale setting
    if (bgImageRef.current) {
      bgImageRef.current.selectable = false;
      bgImageRef.current.evented = false;
    }
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();

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
      
      // Re-enable image selection after scale setting
      if (bgImageRef.current) {
        bgImageRef.current.selectable = true;
        bgImageRef.current.evented = true;
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
      
      // Re-enable image selection if scale setting is cancelled
      if (bgImageRef.current) {
        bgImageRef.current.selectable = true;
        bgImageRef.current.evented = true;
      }
    };
  }, [fabricCanvas, isSettingScale, unit]);

  return (
    <div ref={containerRef} className={cn('w-full h-full', className)}>
      <canvas ref={canvasRef} />
    </div>
  );
});

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
