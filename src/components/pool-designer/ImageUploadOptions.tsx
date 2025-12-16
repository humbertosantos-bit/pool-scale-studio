import React from 'react';
import { Button } from '@/components/ui/button';

interface ImageUploadOptionsProps {
  onFileSelect: (file: File, scaleInfo?: { metersPerPixel: number; latitude: number; zoom: number }) => void;
  onManualTraceSelect?: () => void;
}

export const ImageUploadOptions: React.FC<ImageUploadOptionsProps> = ({ onManualTraceSelect }) => {
  const handleManualSelect = () => {
    onManualTraceSelect?.();
  };

  return (
    <div className="space-y-3 text-center py-4">
      <div className="text-4xl">✏️</div>
      <p className="text-xs text-muted-foreground">
        Draw your property and house directly on a blank canvas
      </p>
      <div className="text-[10px] text-muted-foreground space-y-1">
        <p>1. Draw property boundary</p>
        <p>2. Set scale with a known measurement</p>
        <p>3. Draw house footprint</p>
        <p>4. Place pools in remaining space</p>
      </div>
      <Button
        onClick={handleManualSelect}
        className="w-full text-xs mt-4"
      >
        Start Drawing
      </Button>
    </div>
  );
};
