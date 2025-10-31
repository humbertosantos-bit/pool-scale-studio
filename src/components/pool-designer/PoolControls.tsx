import React, { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import pool8x14Image from '@/assets/pool-8x14-top.png';

interface PoolControlsProps {
  scaleUnit: 'feet' | 'meters';
  onUnitChange: (unit: 'feet' | 'meters') => void;
  isSettingScale: boolean;
  scaleReference: { length: number; pixelLength: number } | null;
  canvasReady?: boolean;
  onStartScaleReference: () => void;
  poolLengthFeet: string;
  poolLengthInches: string;
  poolWidthFeet: string;
  poolWidthInches: string;
  onPoolLengthFeetChange: (value: string) => void;
  onPoolLengthInchesChange: (value: string) => void;
  onPoolWidthFeetChange: (value: string) => void;
  onPoolWidthInchesChange: (value: string) => void;
  onAddPool: () => void;
  onAddPresetPool?: (length: number, width: number, poolName: string) => void;
  onDeleteSelectedPool: () => void;
  measurementMode: 'draw' | 'type';
  onMeasurementModeChange: (mode: 'draw' | 'type') => void;
  isMeasuring: boolean;
  onStartMeasurement: () => void;
  typedDistanceFeet: string;
  typedDistanceInches: string;
  typedDistanceMeters: string;
  onTypedDistanceFeetChange: (value: string) => void;
  onTypedDistanceInchesChange: (value: string) => void;
  onTypedDistanceMetersChange: (value: string) => void;
  onAddTypedMeasurement: () => void;
  onDeleteSelectedMeasurement: () => void;
  copingSize: number | null;
  onCopingSizeChange: (size: number | null) => void;
  paverLeftFeet: string;
  paverLeftInches: string;
  paverRightFeet: string;
  paverRightInches: string;
  paverTopFeet: string;
  paverTopInches: string;
  paverBottomFeet: string;
  paverBottomInches: string;
  onPaverLeftFeetChange: (value: string) => void;
  onPaverLeftInchesChange: (value: string) => void;
  onPaverRightFeetChange: (value: string) => void;
  onPaverRightInchesChange: (value: string) => void;
  onPaverTopFeetChange: (value: string) => void;
  onPaverTopInchesChange: (value: string) => void;
  onPaverBottomFeetChange: (value: string) => void;
  onPaverBottomInchesChange: (value: string) => void;
  isDrawingFence: boolean;
  onStartFenceDrawing: () => void;
  onDeleteSelectedFence: () => void;
  isDrawingPaver: boolean;
  onStartPaverDrawing: () => void;
  onDeleteSelectedPaver: () => void;
  onAddRectangularPaver: (widthFeet: number, lengthFeet: number) => void;
  selectedImage: File;
  onFileSelect: (file: File) => void;
  bgImageOpacity: number;
  onBgImageOpacityChange: (opacity: number) => void;
}

export const PoolControls: React.FC<PoolControlsProps> = ({
  scaleUnit,
  onUnitChange,
  isSettingScale,
  scaleReference,
  canvasReady = true,
  onStartScaleReference,
  poolLengthFeet,
  poolLengthInches,
  poolWidthFeet,
  poolWidthInches,
  onPoolLengthFeetChange,
  onPoolLengthInchesChange,
  onPoolWidthFeetChange,
  onPoolWidthInchesChange,
  onAddPool,
  onAddPresetPool,
  onDeleteSelectedPool,
  measurementMode,
  onMeasurementModeChange,
  isMeasuring,
  onStartMeasurement,
  typedDistanceFeet,
  typedDistanceInches,
  typedDistanceMeters,
  onTypedDistanceFeetChange,
  onTypedDistanceInchesChange,
  onTypedDistanceMetersChange,
  onAddTypedMeasurement,
  onDeleteSelectedMeasurement,
  copingSize,
  onCopingSizeChange,
  paverLeftFeet,
  paverLeftInches,
  paverRightFeet,
  paverRightInches,
  paverTopFeet,
  paverTopInches,
  paverBottomFeet,
  paverBottomInches,
  onPaverLeftFeetChange,
  onPaverLeftInchesChange,
  onPaverRightFeetChange,
  onPaverRightInchesChange,
  onPaverTopFeetChange,
  onPaverTopInchesChange,
  onPaverBottomFeetChange,
  onPaverBottomInchesChange,
  isDrawingFence,
  onStartFenceDrawing,
  onDeleteSelectedFence,
  isDrawingPaver,
  onStartPaverDrawing,
  onDeleteSelectedPaver,
  onAddRectangularPaver,
  selectedImage,
  onFileSelect,
  bgImageOpacity,
  onBgImageOpacityChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Units Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3" style={{ backgroundColor: '#00bdf2' }}>
          <h2 className="text-sm font-semibold text-black">Units</h2>
        </div>
        <div className="p-4">
          <select 
            value={scaleUnit} 
            onChange={(e) => onUnitChange(e.target.value as 'feet' | 'meters')}
            className="w-full px-2 py-1.5 border rounded-md text-xs"
          >
            <option value="feet">Feet</option>
            <option value="meters">Meters</option>
          </select>
        </div>
      </div>

      {/* Upload & Scale Reference Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3" style={{ backgroundColor: '#00bdf2' }}>
          <h2 className="text-sm font-semibold text-black">📁 Upload Property Image</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <div className="p-3 bg-pool-light/20 rounded-lg">
              <p className="text-sm text-foreground font-medium">
                ✅ {selectedImage.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Ready for design
              </p>
            </div>
            <button
              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
              className="w-auto mt-2 px-3 py-1.5 border rounded-md text-xs hover:bg-muted"
            >
              Change Image
            </button>
          </div>
          
          <div className="pt-4 border-t">
            <label className="text-sm font-semibold mb-2 block">Background Transparency</label>
            <Slider
              value={[bgImageOpacity]}
              onValueChange={(value) => onBgImageOpacityChange(value[0])}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(bgImageOpacity * 100)}%
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <label className="text-sm font-semibold mb-2 block">Scale Reference</label>
            {scaleReference && (
              <p className="text-xs text-muted-foreground mb-2">
                Scale: 1 px = {(scaleReference.length / scaleReference.pixelLength).toFixed(4)} {scaleUnit === 'feet' ? 'FT' : 'M'}
              </p>
            )}
          </div>
        </div>
      </div>

      {scaleReference && (
        <>
          {/* Pool Size & Coping Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3" style={{ backgroundColor: '#00bdf2' }}>
              <h2 className="text-sm font-semibold text-black">Pool Size</h2>
            </div>
            <div className="p-4 space-y-2">
              <div className="mb-3">
                <label className="text-xs font-semibold mb-2 block">Coping Size</label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onCopingSizeChange(null)}
                    className={`flex-1 px-2 py-1.5 border rounded-md text-xs transition-colors ${
                      copingSize === null 
                        ? 'bg-foreground text-background' 
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => onCopingSizeChange(12)}
                    className={`flex-1 px-2 py-1.5 border rounded-md text-xs transition-colors ${
                      copingSize === 12 
                        ? 'bg-foreground text-background' 
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    12"
                  </button>
                  <button
                    onClick={() => onCopingSizeChange(16)}
                    className={`flex-1 px-2 py-1.5 border rounded-md text-xs transition-colors ${
                      copingSize === 16 
                        ? 'bg-foreground text-background' 
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    16"
                  </button>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <label className="text-xs font-semibold mb-2 block">Pavers Around Pool</label>
                <p className="text-[10px] text-muted-foreground mb-3">💡 Set before adding pool, or click pool + adjust values to update</p>
                
                {/* Visual Pool Diagram with Input Areas */}
                <div className="relative flex flex-col items-center gap-1.5 bg-muted/30 p-3 rounded-lg">
                  
                  {/* Top Input */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-0.5 bg-background p-1 rounded border border-primary/20">
                      <input
                        type="text"
                        value={paverTopFeet}
                        onChange={(e) => onPaverTopFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-8 px-0.5 py-0.5 border rounded text-[10px] text-center"
                      />
                      <span className="text-[9px] text-muted-foreground">'</span>
                      <input
                        type="text"
                        value={paverTopInches}
                        onChange={(e) => onPaverTopInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-8 px-0.5 py-0.5 border rounded text-[10px] text-center"
                      />
                      <span className="text-[9px] text-muted-foreground">"</span>
                    </div>
                  </div>
                  
                  {/* Middle Row: Left + Pool + Right */}
                  <div className="flex items-center gap-1.5">
                    {/* Left Input */}
                    <div className="flex items-center gap-0.5 bg-background p-1 rounded border border-primary/20">
                      <input
                        type="text"
                        value={paverLeftFeet}
                        onChange={(e) => onPaverLeftFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-8 px-0.5 py-0.5 border rounded text-[10px] text-center"
                      />
                      <span className="text-[9px] text-muted-foreground">'</span>
                      <input
                        type="text"
                        value={paverLeftInches}
                        onChange={(e) => onPaverLeftInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-8 px-0.5 py-0.5 border rounded text-[10px] text-center"
                      />
                      <span className="text-[9px] text-muted-foreground">"</span>
                    </div>
                    
                    {/* Pool Visual - Replace with actual pool image */}
                    <div className="w-24 h-16 rounded flex items-center justify-center overflow-hidden">
                      <img 
                        src={pool8x14Image} 
                        alt="Pool"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* Right Input */}
                    <div className="flex items-center gap-0.5 bg-background p-1 rounded border border-primary/20">
                      <input
                        type="text"
                        value={paverRightFeet}
                        onChange={(e) => onPaverRightFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-8 px-0.5 py-0.5 border rounded text-[10px] text-center"
                      />
                      <span className="text-[9px] text-muted-foreground">'</span>
                      <input
                        type="text"
                        value={paverRightInches}
                        onChange={(e) => onPaverRightInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-8 px-0.5 py-0.5 border rounded text-[10px] text-center"
                      />
                      <span className="text-[9px] text-muted-foreground">"</span>
                    </div>
                  </div>
                  
                  {/* Bottom Input */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-0.5 bg-background p-1 rounded border border-primary/20">
                      <input
                        type="text"
                        value={paverBottomFeet}
                        onChange={(e) => onPaverBottomFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-8 px-0.5 py-0.5 border rounded text-[10px] text-center"
                      />
                      <span className="text-[9px] text-muted-foreground">'</span>
                      <input
                        type="text"
                        value={paverBottomInches}
                        onChange={(e) => onPaverBottomInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-8 px-0.5 py-0.5 border rounded text-[10px] text-center"
                      />
                      <span className="text-[9px] text-muted-foreground">"</span>
                    </div>
                  </div>
                  
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <label className="text-xs font-semibold mb-2 block">Preset Pools</label>
                <button
                  onClick={() => onAddPresetPool?.(23, 11, "Azoria Topaze 12x24")}
                  className="w-auto px-3 py-1.5 bg-pool-light text-pool-dark rounded-md hover:bg-pool-light/80 text-xs font-medium"
                >
                  Azoria Topaze 12x24
                </button>
              </div>
            </div>
          </div>

          {/* Measure Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3" style={{ backgroundColor: '#00bdf2' }}>
              <h2 className="text-sm font-semibold text-black">Measure</h2>
            </div>
            <div className="p-4 space-y-2">
              <select 
                value={measurementMode} 
                onChange={(e) => onMeasurementModeChange(e.target.value as 'draw' | 'type')}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="draw">Draw</option>
                <option value="type">Type</option>
              </select>
              
              {measurementMode === 'draw' ? (
                <button
                  onClick={onStartMeasurement}
                  disabled={isMeasuring}
                  className="w-auto px-3 py-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 text-xs"
                >
                  {isMeasuring ? 'Click and drag...' : 'Draw Measurement'}
                </button>
              ) : (
                <>
                  {scaleUnit === 'feet' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={typedDistanceFeet}
                        onChange={(e) => onTypedDistanceFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded-md text-xs text-center"
                        min="0"
                        step="0.1"
                      />
                      <span className="text-[10px] text-muted-foreground">'</span>
                      <input
                        type="number"
                        value={typedDistanceInches}
                        onChange={(e) => onTypedDistanceInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded-md text-xs text-center"
                        min="0"
                        max="11"
                      />
                      <span className="text-[10px] text-muted-foreground">"</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={typedDistanceMeters}
                        onChange={(e) => onTypedDistanceMetersChange(e.target.value)}
                        placeholder="0"
                        className="flex-1 px-2 py-1.5 border rounded-md text-xs"
                        min="0"
                        step="0.1"
                      />
                      <span className="text-xs text-muted-foreground">M</span>
                    </div>
                  )}
                  <button
                    onClick={onAddTypedMeasurement}
                    className="w-auto px-3 py-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 text-xs"
                  >
                    Add Measurement
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Fence Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3" style={{ backgroundColor: '#00bdf2' }}>
              <h2 className="text-sm font-semibold text-black">Fence</h2>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={onStartFenceDrawing}
                disabled={isDrawingFence}
                className="w-auto px-3 py-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 text-xs"
              >
                {isDrawingFence ? 'Click to add corners...' : 'Draw Fence'}
              </button>
              {isDrawingFence && (
                <p className="text-[10px] text-muted-foreground">
                  💡 Hold Shift for 90° & 45° angles<br/>
                  💡 Double-click, Right-click, or press Enter to finish
                </p>
              )}
            </div>
          </div>

          {/* Pavers Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3" style={{ backgroundColor: '#00bdf2' }}>
              <h2 className="text-sm font-semibold text-black">Pavers</h2>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={onStartPaverDrawing}
                disabled={isDrawingPaver}
                className="w-auto px-3 py-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 text-xs"
              >
                {isDrawingPaver ? 'Click to add corners...' : 'Draw Paver Area'}
              </button>
              {isDrawingPaver && (
                <p className="text-[10px] text-muted-foreground">
                  💡 Click to add points<br/>
                  💡 Hold Shift for straight lines<br/>
                  💡 Double-click, Right-click, or press Enter to finish
                </p>
              )}
              
              <div className="pt-3 border-t">
                <label className="text-xs font-semibold mb-2 block">Rectangular Paver</label>
                <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Width</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          id="paverWidthFeet"
                          placeholder="0"
                          className="w-12 px-1 py-1.5 border rounded-md text-xs text-center"
                        />
                        <span className="text-[10px] text-muted-foreground">'</span>
                        <input
                          type="text"
                          id="paverWidthInches"
                          placeholder="0"
                          className="w-12 px-1 py-1.5 border rounded-md text-xs text-center"
                        />
                        <span className="text-[10px] text-muted-foreground">"</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Length</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          id="paverLengthFeet"
                          placeholder="0"
                          className="w-12 px-1 py-1.5 border rounded-md text-xs text-center"
                        />
                        <span className="text-[10px] text-muted-foreground">'</span>
                        <input
                          type="text"
                          id="paverLengthInches"
                          placeholder="0"
                          className="w-12 px-1 py-1.5 border rounded-md text-xs text-center"
                        />
                        <span className="text-[10px] text-muted-foreground">"</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const widthFeet = parseFloat((document.getElementById('paverWidthFeet') as HTMLInputElement)?.value || '0');
                        const widthInches = parseFloat((document.getElementById('paverWidthInches') as HTMLInputElement)?.value || '0');
                        const lengthFeet = parseFloat((document.getElementById('paverLengthFeet') as HTMLInputElement)?.value || '0');
                        const lengthInches = parseFloat((document.getElementById('paverLengthInches') as HTMLInputElement)?.value || '0');
                        
                        const totalWidthFeet = widthFeet + (widthInches / 12);
                        const totalLengthFeet = lengthFeet + (lengthInches / 12);
                        
                        if (totalWidthFeet > 0 && totalLengthFeet > 0) {
                          onAddRectangularPaver(totalWidthFeet, totalLengthFeet);
                        }
                      }}
                      className="w-auto px-3 py-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 text-xs"
                    >
                      Add Rectangular Paver
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </>
      )}
    </div>
  );
};