import React, { useState, useEffect, useRef, useCallback } from 'react';
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

interface ExactMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAngleDeg: number;
  unit: 'ft' | 'm';
  onConfirm: (lengthPixels: number, angleDeg: number) => void;
  onPreviewChange?: (lengthPixels: number, angleDeg: number) => void;
  pixelsPerMeter: number;
}

export const ExactMeasurementDialog: React.FC<ExactMeasurementDialogProps> = ({
  open,
  onOpenChange,
  currentAngleDeg,
  unit,
  onConfirm,
  onPreviewChange,
  pixelsPerMeter,
}) => {
  const [feet, setFeet] = useState('0');
  const [inches, setInches] = useState('0');
  const [meters, setMeters] = useState('0');
  const [angleDeg, setAngleDeg] = useState('0');
  const lengthInputRef = useRef<HTMLInputElement>(null);

  const METERS_TO_FEET = 3.28084;

  const calculateLengthMeters = useCallback(() => {
    if (unit === 'ft') {
      const totalFeet = (parseFloat(feet) || 0) + (parseFloat(inches) || 0) / 12;
      return totalFeet / METERS_TO_FEET;
    }

    return parseFloat(meters) || 0;
  }, [unit, feet, inches, meters]);

  useEffect(() => {
    if (open) {
      // Reset inputs
      setFeet('0');
      setInches('0');
      setMeters('0');
      // Normalize angle to 0-360
      let normalized = ((currentAngleDeg % 360) + 360) % 360;
      setAngleDeg(normalized.toFixed(1));
      // Focus length input after dialog opens
      setTimeout(() => lengthInputRef.current?.select(), 100);
    }
  }, [open, currentAngleDeg]);

  useEffect(() => {
    if (!open || !onPreviewChange) return;

    const lengthMeters = calculateLengthMeters();
    const angle = parseFloat(angleDeg) || 0;
    onPreviewChange(lengthMeters > 0 ? lengthMeters * pixelsPerMeter : 0, angle);
  }, [open, onPreviewChange, calculateLengthMeters, angleDeg, pixelsPerMeter]);

  const handleConfirm = () => {
    const lengthMeters = calculateLengthMeters();

    if (lengthMeters <= 0) return;

    const lengthPixels = lengthMeters * pixelsPerMeter;
    const angle = parseFloat(angleDeg) || 0;
    onConfirm(lengthPixels, angle);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-base">Exact Measurement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Length */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Length</Label>
            {unit === 'ft' ? (
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <Input
                      ref={lengthInputRef}
                      type="number"
                      min="0"
                      value={feet}
                      onChange={(e) => setFeet(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">ft</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="11"
                      value={inches}
                      onChange={(e) => setInches(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">in</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  ref={lengthInputRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={meters}
                  onChange={(e) => setMeters(e.target.value)}
                  className="h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">m</span>
              </div>
            )}
          </div>

          {/* Angle */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Angle (degrees)</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                max="360"
                step="0.1"
                value={angleDeg}
                onChange={(e) => setAngleDeg(e.target.value)}
                className="h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">°</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              0° = right, 90° = down, 180° = left, 270° = up
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
