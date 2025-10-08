import React from 'react';

interface PoolControlsProps {
  scaleUnit: 'feet' | 'meters';
  onUnitChange: (unit: 'feet' | 'meters') => void;
  isSettingScale: boolean;
  scaleReference: { length: number; pixelLength: number } | null;
  onStartScaleReference: () => void;
  poolLength: string;
  poolWidth: string;
  onPoolLengthChange: (value: string) => void;
  onPoolWidthChange: (value: string) => void;
  onAddPool: () => void;
  onDeleteSelectedPool: () => void;
  measurementMode: 'draw' | 'type';
  onMeasurementModeChange: (mode: 'draw' | 'type') => void;
  isMeasuring: boolean;
  onStartMeasurement: () => void;
  typedDistance: string;
  onTypedDistanceChange: (value: string) => void;
  onAddTypedMeasurement: () => void;
  onDeleteSelectedMeasurement: () => void;
  copingSize: number | null;
  onCopingSizeChange: (size: number | null) => void;
  isDrawingFence: boolean;
  onStartFenceDrawing: () => void;
  onDeleteSelectedFence: () => void;
}

export const PoolControls: React.FC<PoolControlsProps> = ({
  scaleUnit,
  onUnitChange,
  isSettingScale,
  scaleReference,
  onStartScaleReference,
  poolLength,
  poolWidth,
  onPoolLengthChange,
  onPoolWidthChange,
  onAddPool,
  onDeleteSelectedPool,
  measurementMode,
  onMeasurementModeChange,
  isMeasuring,
  onStartMeasurement,
  typedDistance,
  onTypedDistanceChange,
  onAddTypedMeasurement,
  onDeleteSelectedMeasurement,
  copingSize,
  onCopingSizeChange,
  isDrawingFence,
  onStartFenceDrawing,
  onDeleteSelectedFence,
}) => {
  return (
    <div className="space-y-6">
      {/* Units */}
      <div>
        <label className="text-sm font-semibold mb-2 block">Units</label>
        <select 
          value={scaleUnit} 
          onChange={(e) => onUnitChange(e.target.value as 'feet' | 'meters')}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="feet">Feet</option>
          <option value="meters">Meters</option>
        </select>
      </div>

      {/* Scale Reference */}
      <div>
        <label className="text-sm font-semibold mb-2 block">Scale Reference</label>
        <button
          onClick={onStartScaleReference}
          disabled={isSettingScale}
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

      {scaleReference && (
        <>
          {/* Pool Size */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Pool Size</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={poolLength}
                  onChange={(e) => onPoolLengthChange(e.target.value)}
                  placeholder="Length"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                  step="0.1"
                  min="0"
                />
                <span className="text-sm text-muted-foreground">{scaleUnit === 'feet' ? 'FT' : 'M'}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={poolWidth}
                  onChange={(e) => onPoolWidthChange(e.target.value)}
                  placeholder="Width"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                  step="0.1"
                  min="0"
                />
                <span className="text-sm text-muted-foreground">{scaleUnit === 'feet' ? 'FT' : 'M'}</span>
              </div>
              
              {/* Coping Options */}
              <div className="pt-2">
                <label className="text-sm font-medium mb-2 block">Coping</label>
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
              
              <button
                onClick={onAddPool}
                className="w-full px-4 py-2 bg-pool-light text-pool-dark rounded-md hover:bg-pool-light/80 text-sm"
              >
                Add Pool
              </button>
              <button
                onClick={onDeleteSelectedPool}
                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm"
              >
                Delete Selected Pool
              </button>
            </div>
          </div>

          {/* Measure */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Measure</label>
            <div className="space-y-2">
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
                  <input
                    type="number"
                    value={typedDistance}
                    onChange={(e) => onTypedDistanceChange(e.target.value)}
                    placeholder={`Distance in ${scaleUnit === 'feet' ? 'FT' : 'M'}`}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    step="0.01"
                    min="0"
                  />
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

          {/* Fence */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Fence</label>
            <div className="space-y-2">
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
                  💡 Double-click to finish
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

          {/* Tips */}
          <div className="text-xs text-muted-foreground pt-4 border-t space-y-1">
            <p>💡 Mouse wheel to zoom</p>
            <p>💡 Click & drag to pan</p>
            <p>💡 Rotate with corner handle</p>
          </div>
        </>
      )}
    </div>
  );
};