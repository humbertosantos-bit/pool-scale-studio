import React, { useState } from 'react';
import { ImageUploadOptions } from './ImageUploadOptions';
import { PoolCanvas } from './PoolCanvas';
import { PoolControls } from './PoolControls';
import { PoolCalculations } from './PoolCalculations';
import { ManualTracingCanvas } from './ManualTracingCanvas';
import logo from '@/assets/piscineriviera-logo.png';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const PoolDesigner: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scaleInfo, setScaleInfo] = useState<{ metersPerPixel: number; latitude: number; zoom: number } | null>(null);
  const [poolState, setPoolState] = useState<any>(null);
  const [isManualTracing, setIsManualTracing] = useState(false);

  const handleFileSelect = (file: File, scaleData?: { metersPerPixel: number; latitude: number; zoom: number }) => {
    setSelectedImage(file);
    setScaleInfo(scaleData || null);
    setIsManualTracing(false);
  };

  const handleManualTraceSelect = () => {
    setIsManualTracing(true);
    setSelectedImage(null);
    setScaleInfo(null);
  };

  const handleStateChange = (state: any) => {
    setPoolState(state);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setScaleInfo(null);
    setPoolState(null);
    setIsManualTracing(false);
  };

  const showCanvas = selectedImage || isManualTracing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-pool-light/20">
      {/* Header */}
      <div className="border-b bg-[hsl(var(--header-bg))] backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between gap-6 relative">
          <img src={logo} alt="Piscine Riviera" className="h-16 w-auto" />
          <h1 className="text-3xl font-bold text-white absolute left-1/2 -translate-x-1/2">
            Piscine Riviera Design Tool
          </h1>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Reset</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all your work and clear the canvas. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-104px)]">
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - only show when NOT in manual tracing mode */}
          {!isManualTracing && (
            <div className="w-1/4 border-r bg-white overflow-y-auto">
              <div className="p-6 space-y-4">
                {/* Tools Section - shown when image is uploaded */}
                {selectedImage && poolState && (
                  <PoolControls 
                    {...poolState} 
                    selectedImage={selectedImage}
                    onFileSelect={handleFileSelect}
                    showSunPath={poolState.showSunPath}
                    onShowSunPathChange={poolState.onShowSunPathChange}
                    isSettingNorth={poolState.isSettingNorth}
                    onSetNorth={poolState.onSetNorth}
                    location={poolState.location}
                    onLocationChange={poolState.onLocationChange}
                    selectedDate={poolState.selectedDate}
                    onDateChange={poolState.onDateChange}
                    timeOfDay={poolState.timeOfDay}
                    onTimeOfDayChange={poolState.onTimeOfDayChange}
                    bgImageOpacity={poolState.bgImageOpacity}
                    onBgImageOpacityChange={poolState.onBgImageOpacityChange}
                  />
                )}
                
                {/* Upload only when no image */}
                {!selectedImage && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-primary px-4 py-3">
                      <h2 className="text-sm font-semibold text-primary-foreground">📁 Start Design</h2>
                    </div>
                    <div className="p-4">
                      <ImageUploadOptions 
                        onFileSelect={handleFileSelect} 
                        onManualTraceSelect={handleManualTraceSelect}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Canvas - full width when manual tracing, 3/4 width otherwise */}
          <div className={`${isManualTracing ? 'w-full' : 'w-3/4'} bg-gradient-to-br from-background to-pool-light/20 overflow-auto`}>
            {isManualTracing ? (
              <ManualTracingCanvas onStateChange={handleStateChange} />
            ) : selectedImage ? (
              <PoolCanvas imageFile={selectedImage} scaleInfo={scaleInfo} canvasOnly onStateChange={handleStateChange} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="text-6xl opacity-50">🏊‍♂️</div>
                  <p className="text-xl text-muted-foreground">Upload an image or draw from scratch to start designing</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Calculations Section at Bottom - shown when image is uploaded */}
        {selectedImage && poolState && poolState.calculatedData && (
          <PoolCalculations
            pools={poolState.calculatedData.pools || []}
            fences={poolState.calculatedData.fences || []}
            pavers={poolState.calculatedData.pavers || []}
          />
        )}
      </div>
    </div>
  );
};