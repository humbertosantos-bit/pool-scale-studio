import React, { useState } from 'react';
import { ImageUploadOptions } from './ImageUploadOptions';
import { PoolCanvas } from './PoolCanvas';
import { PoolControls } from './PoolControls';
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

  const handleFileSelect = (file: File, scaleData?: { metersPerPixel: number; latitude: number; zoom: number }) => {
    setSelectedImage(file);
    setScaleInfo(scaleData || null);
  };

  const handleStateChange = (state: any) => {
    setPoolState(state);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setScaleInfo(null);
    setPoolState(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-pool-light/20">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <img src={logo} alt="Piscine Riviera" className="h-16 w-auto" />
            <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Piscine Riviera Design Tool
            </h1>
          </div>
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
      <div className="flex h-[calc(100vh-104px)]">
        {/* Left Sidebar - 1/4 width */}
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
                  <h2 className="text-sm font-semibold text-primary-foreground">📁 Upload Property Image</h2>
                </div>
                <div className="p-4">
                  <ImageUploadOptions onFileSelect={handleFileSelect} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Canvas - 3/4 width */}
        <div className="w-3/4 bg-gradient-to-br from-background to-pool-light/20 overflow-auto">
          {selectedImage ? (
            <PoolCanvas imageFile={selectedImage} scaleInfo={scaleInfo} canvasOnly onStateChange={handleStateChange} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl opacity-50">🏊‍♂️</div>
                <p className="text-xl text-muted-foreground">Upload an image to start designing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};