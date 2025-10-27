import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CANADIAN_PROVINCES, type Province } from '@/utils/solarCalculations';

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
  
  // Solar simulation props
  showSolarOverlay: boolean;
  onShowSolarOverlayChange: (show: boolean) => void;
  timeOfDay: number;
  onTimeOfDayChange: (time: number) => void;
  selectedProvince: string;
  onSelectedProvinceChange: (province: string) => void;
  
  // Background image opacity
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
  showSolarOverlay,
  onShowSolarOverlayChange,
  timeOfDay,
  onTimeOfDayChange,
  selectedProvince,
  onSelectedProvinceChange,
  bgImageOpacity,
  onBgImageOpacityChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Units Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-primary px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-foreground">Units</h2>
        </div>
        <div className="p-4">
          <select 
            value={scaleUnit} 
            onChange={(e) => onUnitChange(e.target.value as 'feet' | 'meters')}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="feet">Feet</option>
            <option value="meters">Meters</option>
          </select>
        </div>
      </div>

      {/* Upload & Scale Reference Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-primary px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-foreground">📁 Upload Property Image</h2>
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
              className="w-full mt-2 px-4 py-2 border rounded-md text-sm hover:bg-muted"
            >
              Change Image
            </button>
          </div>
          
          <div className="pt-4 border-t">
            <label className="text-sm font-semibold mb-2 block">Scale Reference</label>
            <button
              onClick={onStartScaleReference}
              disabled={isSettingScale || !canvasReady}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
            >
              {isSettingScale ? 'Click two points...' : scaleReference ? 'Reset Scale' : 'Set Scale'}
            </button>
            {scaleReference && (
              <p className="text-xs text-muted-foreground mt-2">
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
            <div className="bg-primary px-4 py-3">
              <h2 className="text-sm font-semibold text-primary-foreground">Pool Size</h2>
            </div>
            <div className="p-4 space-y-2">
              <div className="mb-3">
                <label className="text-sm font-semibold mb-2 block">Coping Size</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onCopingSizeChange(null)}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm transition-colors ${
                      copingSize === null 
                        ? 'bg-foreground text-background' 
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => onCopingSizeChange(12)}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm transition-colors ${
                      copingSize === 12 
                        ? 'bg-foreground text-background' 
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    12"
                  </button>
                  <button
                    onClick={() => onCopingSizeChange(16)}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm transition-colors ${
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
                <label className="text-sm font-semibold mb-2 block">Pavers Around Pool</label>
                <p className="text-xs text-muted-foreground mb-3">💡 Set before adding pool, or click pool + adjust values to update</p>
                
                {/* Visual Pool Diagram with Input Areas */}
                <div className="relative flex flex-col items-center gap-2 bg-muted/30 p-4 rounded-lg">
                  
                  {/* Top Input */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 bg-background p-2 rounded border-2 border-primary/20">
                      <input
                        type="number"
                        value={paverTopFeet}
                        onChange={(e) => onPaverTopFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded text-xs text-center"
                        min="0"
                        step="1"
                      />
                      <span className="text-xs text-muted-foreground">FT</span>
                      <input
                        type="number"
                        value={paverTopInches}
                        onChange={(e) => onPaverTopInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded text-xs text-center"
                        min="0"
                        max="11"
                      />
                      <span className="text-xs text-muted-foreground">IN</span>
                    </div>
                  </div>
                  
                  {/* Middle Row: Left + Pool + Right */}
                  <div className="flex items-center gap-2">
                    {/* Left Input */}
                    <div className="flex items-center gap-1 bg-background p-2 rounded border-2 border-primary/20">
                      <input
                        type="number"
                        value={paverLeftFeet}
                        onChange={(e) => onPaverLeftFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded text-xs text-center"
                        min="0"
                        step="1"
                      />
                      <span className="text-xs text-muted-foreground">FT</span>
                      <input
                        type="number"
                        value={paverLeftInches}
                        onChange={(e) => onPaverLeftInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded text-xs text-center"
                        min="0"
                        max="11"
                      />
                      <span className="text-xs text-muted-foreground">IN</span>
                    </div>
                    
                    {/* Pool Visual */}
                    <div className="w-32 h-20 bg-pool-light/30 border-2 border-pool-dark rounded flex items-center justify-center">
                      <span className="text-xs font-semibold text-pool-dark">POOL</span>
                    </div>
                    
                    {/* Right Input */}
                    <div className="flex items-center gap-1 bg-background p-2 rounded border-2 border-primary/20">
                      <input
                        type="number"
                        value={paverRightFeet}
                        onChange={(e) => onPaverRightFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded text-xs text-center"
                        min="0"
                        step="1"
                      />
                      <span className="text-xs text-muted-foreground">FT</span>
                      <input
                        type="number"
                        value={paverRightInches}
                        onChange={(e) => onPaverRightInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded text-xs text-center"
                        min="0"
                        max="11"
                      />
                      <span className="text-xs text-muted-foreground">IN</span>
                    </div>
                  </div>
                  
                  {/* Bottom Input */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 bg-background p-2 rounded border-2 border-primary/20">
                      <input
                        type="number"
                        value={paverBottomFeet}
                        onChange={(e) => onPaverBottomFeetChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded text-xs text-center"
                        min="0"
                        step="1"
                      />
                      <span className="text-xs text-muted-foreground">FT</span>
                      <input
                        type="number"
                        value={paverBottomInches}
                        onChange={(e) => onPaverBottomInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-12 px-1 py-1 border rounded text-xs text-center"
                        min="0"
                        max="11"
                      />
                      <span className="text-xs text-muted-foreground">IN</span>
                    </div>
                  </div>
                  
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <label className="text-sm font-semibold mb-2 block">Preset Pools</label>
                <button
                  onClick={() => onAddPresetPool?.(23, 11, "Azoria Topaze 12x24")}
                  className="w-full px-4 py-2 bg-pool-light text-pool-dark rounded-md hover:bg-pool-light/80 text-sm font-medium"
                >
                  Azoria Topaze 12x24
                </button>
              </div>
              
              <button
                onClick={onDeleteSelectedPool}
                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm"
              >
                Delete Selected Pool
              </button>
            </div>
          </div>

          {/* Measure Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-sm font-semibold text-primary-foreground">Measure</h2>
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
                  className="w-full px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 text-sm"
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
                        className="w-16 px-2 py-2 border rounded-md text-sm"
                        min="0"
                        step="0.1"
                      />
                      <span className="text-xs text-muted-foreground">FT</span>
                      <input
                        type="number"
                        value={typedDistanceInches}
                        onChange={(e) => onTypedDistanceInchesChange(e.target.value)}
                        placeholder="0"
                        className="w-16 px-2 py-2 border rounded-md text-sm"
                        min="0"
                        max="11"
                      />
                      <span className="text-xs text-muted-foreground">IN</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={typedDistanceMeters}
                        onChange={(e) => onTypedDistanceMetersChange(e.target.value)}
                        placeholder="0"
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        min="0"
                        step="0.1"
                      />
                      <span className="text-xs text-muted-foreground">METERS</span>
                    </div>
                  )}
                  <button
                    onClick={onAddTypedMeasurement}
                    className="w-full px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 text-sm"
                  >
                    Add Measurement
                  </button>
                </>
              )}
              
              <button
                onClick={onDeleteSelectedMeasurement}
                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm"
              >
                Delete Selected Measurement
              </button>
            </div>
          </div>

          {/* Fence Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-sm font-semibold text-primary-foreground">Fence</h2>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={onStartFenceDrawing}
                disabled={isDrawingFence}
                className="w-full px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 text-sm"
              >
                {isDrawingFence ? 'Click to add corners...' : 'Draw Fence'}
              </button>
              {isDrawingFence && (
                <p className="text-xs text-muted-foreground">
                  💡 Hold Shift for 90° & 45° angles<br/>
                  💡 Double-click, Right-click, or press Enter to finish
                </p>
              )}
              <button
                onClick={onDeleteSelectedFence}
                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm"
              >
                Delete Selected Fence
              </button>
            </div>
          </div>

          {/* Pavers Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-sm font-semibold text-primary-foreground">Pavers</h2>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={onStartPaverDrawing}
                disabled={isDrawingPaver}
                className="w-full px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 text-sm"
              >
                {isDrawingPaver ? 'Click to add corners...' : 'Draw Paver Area'}
              </button>
              {isDrawingPaver && (
                <p className="text-xs text-muted-foreground">
                  💡 Click to add points<br/>
                  💡 Hold Shift for straight lines<br/>
                  💡 Double-click, Right-click, or press Enter to finish
                </p>
              )}
              
              <div className="pt-3 border-t">
                <label className="text-sm font-semibold mb-2 block">Rectangular Paver</label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Width (FT)</label>
                    <input
                      type="number"
                      id="paverWidth"
                      placeholder="0"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Length (FT)</label>
                    <input
                      type="number"
                      id="paverLength"
                      placeholder="0"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const width = parseFloat((document.getElementById('paverWidth') as HTMLInputElement)?.value || '0');
                      const length = parseFloat((document.getElementById('paverLength') as HTMLInputElement)?.value || '0');
                      if (width > 0 && length > 0) {
                        onAddRectangularPaver(width, length);
                      }
                    }}
                    className="w-full px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 text-sm"
                  >
                    Add Rectangular Paver
                  </button>
                </div>
              </div>
              
              <button
                onClick={onDeleteSelectedPaver}
                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm"
              >
                Delete Selected Paver
              </button>
            </div>
          </div>

          {/* Background Image Opacity Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-sm font-semibold text-primary-foreground">🖼️ Image Opacity</h2>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bg-opacity" className="text-sm font-medium">
                  Background Opacity
                </Label>
                <span className="text-sm text-muted-foreground">{Math.round(bgImageOpacity * 100)}%</span>
              </div>
              <Slider
                id="bg-opacity"
                value={[bgImageOpacity]}
                onValueChange={(value) => onBgImageOpacityChange(value[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>
          </div>

          {/* Solar Simulation Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-sm font-semibold text-primary-foreground">☀️ Solar Simulation</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="solar-overlay" className="text-sm font-medium">
                  Show Sun Overlay
                </Label>
                <Switch
                  id="solar-overlay"
                  checked={showSolarOverlay}
                  onCheckedChange={onShowSolarOverlayChange}
                />
              </div>
              
              {showSolarOverlay && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Province/Location
                    </Label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => onSelectedProvinceChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      {Object.keys(CANADIAN_PROVINCES).map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Time of Day
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {timeOfDay}:00
                      </span>
                    </div>
                    <Slider
                      value={[timeOfDay]}
                      onValueChange={(value) => onTimeOfDayChange(value[0])}
                      min={6}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>6:00 AM</span>
                      <span>8:00 PM</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <p>💡 Rotate the red north arrow to set orientation</p>
                    <p>🟡 Yellow/Orange = High sunlight</p>
                    <p>🔵 Blue/Gray = Low sunlight/shade</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-sm font-semibold text-primary-foreground">💡 Tips</h2>
            </div>
            <div className="p-4 text-xs text-muted-foreground space-y-1">
              <p>Mouse wheel to zoom</p>
              <p>Click & drag to pan</p>
              <p>Rotate with corner handle</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};