import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageUploadOptions } from '@/components/pool-designer/ImageUploadOptions';
import { PoolCanvas } from '@/components/pool-designer/PoolCanvas';
import { PoolControls } from '@/components/pool-designer/PoolControls';
import { PoolCalculations } from '@/components/pool-designer/PoolCalculations';
import { ManualTracingCanvas } from '@/components/pool-designer/ManualTracingCanvas';
import { ClientInfo, ClientInfoForm } from '@/components/pool-designer/ClientInfoForm';
import { representatives } from '@/data/representatives';
import logo from '@/assets/piscineriviera-logo.png';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StoredClientInfo extends ClientInfo {
  createdAt?: string;
}

const Design: React.FC = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scaleInfo, setScaleInfo] = useState<{ metersPerPixel: number; latitude: number; zoom: number } | null>(null);
  const [poolState, setPoolState] = useState<any>(null);
  const [isManualTracing, setIsManualTracing] = useState(false);
  const [isEditingClientInfo, setIsEditingClientInfo] = useState(false);
  const [clientInfo, setClientInfo] = useState<StoredClientInfo>({
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

  const handleStartNewProject = () => {
    sessionStorage.removeItem('clientInfo');
    navigate('/');
  };

  const handleSaveClientInfo = () => {
    const dataToStore = {
      ...clientInfo,
      createdAt: clientInfo.createdAt || new Date().toISOString(),
    };
    sessionStorage.setItem('clientInfo', JSON.stringify(dataToStore));
    setIsEditingClientInfo(false);
  };

  const representative = representatives.find(r => r.id === clientInfo.representativeId);
  
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">New Project</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start New Project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all current work and return to the client info screen. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleStartNewProject}>Start New</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-104px)]">
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Always visible */}
          <div className="w-64 min-w-[240px] border-r bg-white overflow-y-auto flex flex-col">
            <div className="p-3 space-y-3 flex-1">
              {/* Client Info Header */}
              <div className="bg-primary/10 rounded-lg p-2 space-y-1 relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => setIsEditingClientInfo(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                {clientInfo.createdAt && (
                  <p className="text-[10px] text-muted-foreground">{formatDate(clientInfo.createdAt)}</p>
                )}
                {clientInfo.name && (
                  <p className="text-sm font-semibold text-primary">{clientInfo.name}</p>
                )}
                {clientInfo.address && (
                  <p className="text-xs text-muted-foreground">{clientInfo.address}</p>
                )}
                {clientInfo.phone && (
                  <p className="text-xs text-muted-foreground">{clientInfo.phone}</p>
                )}
                {clientInfo.email && (
                  <p className="text-xs text-muted-foreground">{clientInfo.email}</p>
                )}
                {representative && (
                  <p className="text-xs font-medium text-primary/80">Rep: {representative.name}</p>
                )}
              </div>

              {/* Edit Client Info Dialog */}
              <Dialog open={isEditingClientInfo} onOpenChange={setIsEditingClientInfo}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Client Information</DialogTitle>
                  </DialogHeader>
                  <ClientInfoForm 
                    clientInfo={clientInfo}
                    onClientInfoChange={setClientInfo}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsEditingClientInfo(false)}>Cancel</Button>
                    <Button onClick={handleSaveClientInfo}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Calculations - Always visible */}
              <PoolCalculations
                pools={poolState?.calculatedData?.pools || []}
                fences={poolState?.calculatedData?.fences || []}
                pavers={poolState?.calculatedData?.pavers || []}
                compact
              />
              
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
                  <div className="bg-primary px-3 py-1.5">
                    <h2 className="text-xs font-semibold text-primary-foreground">📁 Import / Draw</h2>
                  </div>
                  <div className="p-3">
                    <ImageUploadOptions 
                      onFileSelect={handleFileSelect} 
                      onManualTraceSelect={handleManualTraceSelect}
                    />
                  </div>
                </div>
              )}
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
