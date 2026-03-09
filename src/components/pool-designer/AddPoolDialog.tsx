import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw, Pencil } from 'lucide-react';

interface PresetPool {
  name: string;
  displayName: string;
  widthFeet: number;
  widthInches: number;
  lengthFeet: number;
  lengthInches: number;
}

export interface PoolDialogResult {
  type: 'preset' | 'custom' | 'draw';
  preset?: PresetPool;
  customWidthFeet?: number;
  customLengthFeet?: number;
  copingSize: number;
  rotated: boolean;
  paverTop: { feet: string; inches: string };
  paverBottom: { feet: string; inches: string };
  paverLeft: { feet: string; inches: string };
  paverRight: { feet: string; inches: string };
}

interface AddPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetPools: PresetPool[];
  onConfirm: (result: PoolDialogResult) => void;
  onDrawCustom: () => void;
}

export const AddPoolDialog: React.FC<AddPoolDialogProps> = ({
  open,
  onOpenChange,
  presetPools,
  onConfirm,
  onDrawCustom,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetPool | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customWidth, setCustomWidth] = useState('12');
  const [customLength, setCustomLength] = useState('24');
  const [copingSize, setCopingSize] = useState(16);
  const [rotated, setRotated] = useState(false);
  
  // Sidewalk dimensions per side
  const [paverTopFt, setPaverTopFt] = useState('4');
  const [paverTopIn, setPaverTopIn] = useState('0');
  const [paverBottomFt, setPaverBottomFt] = useState('4');
  const [paverBottomIn, setPaverBottomIn] = useState('0');
  const [paverLeftFt, setPaverLeftFt] = useState('4');
  const [paverLeftIn, setPaverLeftIn] = useState('0');
  const [paverRightFt, setPaverRightFt] = useState('4');
  const [paverRightIn, setPaverRightIn] = useState('0');

  const getPoolDimensions = () => {
    if (selectedPreset) {
      const w = selectedPreset.widthFeet + selectedPreset.widthInches / 12;
      const l = selectedPreset.lengthFeet + selectedPreset.lengthInches / 12;
      return rotated ? { width: l, length: w } : { width: w, length: l };
    }
    if (isCustom) {
      const w = parseFloat(customWidth) || 12;
      const l = parseFloat(customLength) || 24;
      return rotated ? { width: l, length: w } : { width: w, length: l };
    }
    return null;
  };

  const dims = getPoolDimensions();

  const handleConfirm = () => {
    const result: PoolDialogResult = {
      type: selectedPreset ? 'preset' : 'custom',
      preset: selectedPreset || undefined,
      customWidthFeet: isCustom ? parseFloat(customWidth) || 12 : undefined,
      customLengthFeet: isCustom ? parseFloat(customLength) || 24 : undefined,
      copingSize,
      rotated,
      paverTop: { feet: paverTopFt, inches: paverTopIn },
      paverBottom: { feet: paverBottomFt, inches: paverBottomIn },
      paverLeft: { feet: paverLeftFt, inches: paverLeftIn },
      paverRight: { feet: paverRightFt, inches: paverRightIn },
    };
    onConfirm(result);
    resetState();
  };

  const handleDrawCustom = () => {
    onOpenChange(false);
    onDrawCustom();
    resetState();
  };

  const resetState = () => {
    setSelectedPreset(null);
    setIsCustom(false);
    setRotated(false);
  };

  const formatDim = (feet: number, inches: number) => {
    if (inches > 0) return `${feet}'${inches}"`;
    return `${feet}'`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Pool</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pool Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Pool Model</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {presetPools.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => { setSelectedPreset(preset); setIsCustom(false); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                    selectedPreset?.name === preset.name
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span>{preset.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDim(preset.widthFeet, preset.widthInches)} × {formatDim(preset.lengthFeet, preset.lengthInches)}
                  </span>
                </button>
              ))}
              <button
                onClick={() => { setIsCustom(true); setSelectedPreset(null); }}
                className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                  isCustom
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <span>Custom Dimensions</span>
              </button>
            </div>
          </div>

          {/* Custom dimensions input */}
          {isCustom && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border">
              <div className="flex items-center gap-1">
                <Label className="text-xs">Width:</Label>
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="w-16 h-8 text-xs"
                />
                <span className="text-xs">ft</span>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">Length:</Label>
                <Input
                  type="number"
                  value={customLength}
                  onChange={(e) => setCustomLength(e.target.value)}
                  className="w-16 h-8 text-xs"
                />
                <span className="text-xs">ft</span>
              </div>
            </div>
          )}

          {/* Pool Preview + Rotation */}
          {dims && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Preview</Label>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setRotated(!rotated)}>
                  <RotateCcw className="h-3 w-3" />
                  Rotate 90°
                </Button>
              </div>
              <div className="flex items-center justify-center p-4 bg-muted/20 rounded-md border min-h-[120px]">
                {/* Simple pool rectangle preview with default water color */}
                <div className="relative">
                  <div
                    className="rounded-sm border-2 border-primary/40"
                    style={{
                      width: `${Math.min(200, dims.width * 8)}px`,
                      height: `${Math.min(200, dims.length * 8)}px`,
                      background: 'linear-gradient(135deg, #0EA5E9, #38BDF8, #7DD3FC, #BAE6FD)',
                    }}
                  />
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
                    {dims.width.toFixed(1)}' × {dims.length.toFixed(1)}'
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Coping Width */}
          {(selectedPreset || isCustom) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Coping Width</Label>
              <div className="flex gap-2">
                {[12, 14, 16].map((size) => (
                  <Button
                    key={size}
                    size="sm"
                    variant={copingSize === size ? 'default' : 'outline'}
                    className="flex-1 h-8"
                    onClick={() => setCopingSize(size)}
                  >
                    {size}"
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sidewalk dimensions */}
          {(selectedPreset || isCustom) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Sidewalk (per side)</Label>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-md border">
                {/* Top */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-10">Top:</span>
                  <Input type="number" value={paverTopFt} onChange={(e) => setPaverTopFt(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" />
                  <span className="text-[10px]">'</span>
                  <Input type="number" value={paverTopIn} onChange={(e) => setPaverTopIn(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" max="11" />
                  <span className="text-[10px]">"</span>
                </div>
                {/* Bottom */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-10">Bottom:</span>
                  <Input type="number" value={paverBottomFt} onChange={(e) => setPaverBottomFt(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" />
                  <span className="text-[10px]">'</span>
                  <Input type="number" value={paverBottomIn} onChange={(e) => setPaverBottomIn(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" max="11" />
                  <span className="text-[10px]">"</span>
                </div>
                {/* Left */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-10">Left:</span>
                  <Input type="number" value={paverLeftFt} onChange={(e) => setPaverLeftFt(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" />
                  <span className="text-[10px]">'</span>
                  <Input type="number" value={paverLeftIn} onChange={(e) => setPaverLeftIn(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" max="11" />
                  <span className="text-[10px]">"</span>
                </div>
                {/* Right */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-10">Right:</span>
                  <Input type="number" value={paverRightFt} onChange={(e) => setPaverRightFt(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" />
                  <span className="text-[10px]">'</span>
                  <Input type="number" value={paverRightIn} onChange={(e) => setPaverRightIn(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" max="11" />
                  <span className="text-[10px]">"</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleDrawCustom}>
            <Pencil className="h-3 w-3" />
            Draw Custom Shape
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedPreset && !isCustom}
          >
            Add Pool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
