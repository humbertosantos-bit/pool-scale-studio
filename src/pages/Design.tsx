import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageUploadOptions } from '@/components/pool-designer/ImageUploadOptions';
import { PoolCanvas } from '@/components/pool-designer/PoolCanvas';
import { PoolControls } from '@/components/pool-designer/PoolControls';
import { PoolCalculations } from '@/components/pool-designer/PoolCalculations';
import { ManualTracingCanvas } from '@/components/pool-designer/ManualTracingCanvas';
import { ClientInfoDisplay } from '@/components/pool-designer/ClientInfoDisplay';
import { ClientInfo } from '@/components/pool-designer/ClientInfoForm';
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

const Design: React.FC = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scaleInfo, setScaleInfo] = useState<{ metersPerPixel: number; latitude: number; zoom: number } | null>(null);
  const [poolState, setPoolState] = useState<any>(null);
  const [isManualTracing, setIsManualTracing] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    phone: '',
    address: '',
    email: '',
    representativeId: '',
  });

  useEffect(() => {
    // Load client info from sessionStorage
    const stored = sessionStorage.getItem('clientInfo');
    if (stored) {
      setClientInfo(JSON.parse(stored));
    }
  }, []);

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

  const handleBackToHome = () => {
    navigate('/');
  };

  const showCanvas = selectedImage || isManualTracing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-pool-light/20">
      {/* Header */}
      <div className="border-b bg-[hsl(var(--header-bg))] backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between gap-6 relative">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleBackToHome} className="text-white border-white/30 hover:bg-white/10">
              ← Back
            </Button>
            <img src={logo} alt="Piscine Riviera" className="h-16 w-auto" />
          </div>
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
          {/* Left Sidebar - Always visible */}
          <div className="w-1/4 min-w-[280px] border-r bg-white overflow-y-auto flex flex-col">
            <div className="p-4 space-y-4 flex-1">
              {/* Client Name Header */}
              {clientInfo.name && (
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-lg font-semibold text-primary">{clientInfo.name}</p>
                  {clientInfo.address && (
                    <p className="text-sm text-muted-foreground">{clientInfo.address}</p>
                  )}
                </div>
              )}
              
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
              
              {/* Start Design Options - shown when no image and not manual tracing */}
              {!selectedImage && !isManualTracing && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-primary px-4 py-2">
                    <h2 className="text-xs font-semibold text-primary-foreground">📁 Import / Draw</h2>
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
            
            {/* Calculations at bottom of sidebar - Always visible */}
            <div className="border-t p-4">
              <PoolCalculations
                pools={poolState?.calculatedData?.pools || []}
                fences={poolState?.calculatedData?.fences || []}
                pavers={poolState?.calculatedData?.pavers || []}
                compact
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gradient-to-br from-background to-pool-light/20 overflow-auto">
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
      </div>
    </div>
  );
};

export default Design;
