import React, { useState, useEffect } from 'react';
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

export interface EditPoolResult {
  copingSize: number;
  widthFeet: number;
  lengthFeet: number;
  paverTop: { feet: string; inches: string };
  paverBottom: { feet: string; inches: string };
  paverLeft: { feet: string; inches: string };
  paverRight: { feet: string; inches: string };
}

interface EditPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolName: string;
  currentWidthFeet: number;
  currentLengthFeet: number;
  currentCopingSize: number;
  currentPaverDimensions: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  isPreset?: boolean;
  onConfirm: (result: EditPoolResult) => void;
}

export const EditPoolDialog: React.FC<EditPoolDialogProps> = ({
  open,
  onOpenChange,
  poolName,
  currentWidthFeet,
  currentLengthFeet,
  currentCopingSize,
  currentPaverDimensions,
  isPreset,
  onConfirm,
}) => {
  const [copingSize, setCopingSize] = useState(currentCopingSize);
  const [widthFeet, setWidthFeet] = useState(String(currentWidthFeet));
  const [lengthFeet, setLengthFeet] = useState(String(currentLengthFeet));
  const [paverTopFt, setPaverTopFt] = useState('0');
  const [paverTopIn, setPaverTopIn] = useState('0');
  const [paverBottomFt, setPaverBottomFt] = useState('0');
  const [paverBottomIn, setPaverBottomIn] = useState('0');
  const [paverLeftFt, setPaverLeftFt] = useState('0');
  const [paverLeftIn, setPaverLeftIn] = useState('0');
  const [paverRightFt, setPaverRightFt] = useState('0');
  const [paverRightIn, setPaverRightIn] = useState('0');

  useEffect(() => {
    if (open) {
      setCopingSize(currentCopingSize);
      setWidthFeet(String(currentWidthFeet));
      setLengthFeet(String(currentLengthFeet));
      setPaverTopFt(String(Math.floor(currentPaverDimensions.top)));
      setPaverTopIn(String(Math.round((currentPaverDimensions.top % 1) * 12)));
      setPaverBottomFt(String(Math.floor(currentPaverDimensions.bottom)));
      setPaverBottomIn(String(Math.round((currentPaverDimensions.bottom % 1) * 12)));
      setPaverLeftFt(String(Math.floor(currentPaverDimensions.left)));
      setPaverLeftIn(String(Math.round((currentPaverDimensions.left % 1) * 12)));
      setPaverRightFt(String(Math.floor(currentPaverDimensions.right)));
      setPaverRightIn(String(Math.round((currentPaverDimensions.right % 1) * 12)));
    }
  }, [open, currentCopingSize, currentWidthFeet, currentLengthFeet, currentPaverDimensions]);

  const handleConfirm = () => {
    onConfirm({
      copingSize,
      widthFeet: parseFloat(widthFeet) || currentWidthFeet,
      lengthFeet: parseFloat(lengthFeet) || currentLengthFeet,
      paverTop: { feet: paverTopFt, inches: paverTopIn },
      paverBottom: { feet: paverBottomFt, inches: paverBottomIn },
      paverLeft: { feet: paverLeftFt, inches: paverLeftIn },
      paverRight: { feet: paverRightFt, inches: paverRightIn },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit Pool — {poolName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pool Dimensions */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Pool Dimensions</Label>
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-md border">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Width:</span>
                <Input
                  type="number"
                  value={widthFeet}
                  onChange={(e) => setWidthFeet(e.target.value)}
                  className="w-16 h-7 text-xs text-center p-0"
                  min="1"
                  step="0.5"
                />
                <span className="text-[10px]">ft</span>
              </div>
              <span className="text-muted-foreground">×</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Length:</span>
                <Input
                  type="number"
                  value={lengthFeet}
                  onChange={(e) => setLengthFeet(e.target.value)}
                  className="w-16 h-7 text-xs text-center p-0"
                  min="1"
                  step="0.5"
                />
                <span className="text-[10px]">ft</span>
              </div>
            </div>
          </div>

          {/* Coping Width */}
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

          {/* Sidewalk dimensions */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Sidewalk (per side)</Label>
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-md border">
              {[
                { label: 'Top', ft: paverTopFt, setFt: setPaverTopFt, inch: paverTopIn, setInch: setPaverTopIn },
                { label: 'Bottom', ft: paverBottomFt, setFt: setPaverBottomFt, inch: paverBottomIn, setInch: setPaverBottomIn },
                { label: 'Left', ft: paverLeftFt, setFt: setPaverLeftFt, inch: paverLeftIn, setInch: setPaverLeftIn },
                { label: 'Right', ft: paverRightFt, setFt: setPaverRightFt, inch: paverRightIn, setInch: setPaverRightIn },
              ].map(({ label, ft, setFt, inch, setInch }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-10">{label}:</span>
                  <Input type="number" value={ft} onChange={(e) => setFt(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" />
                  <span className="text-[10px]">'</span>
                  <Input type="number" value={inch} onChange={(e) => setInch(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" max="11" />
                  <span className="text-[10px]">"</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm}>Apply Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
