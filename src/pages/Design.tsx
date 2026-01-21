import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageUploadOptions } from '@/components/pool-designer/ImageUploadOptions';
import { PoolCanvas } from '@/components/pool-designer/PoolCanvas';
import { PoolControls } from '@/components/pool-designer/PoolControls';
import { PoolCalculations } from '@/components/pool-designer/PoolCalculations';
import { ManualTracingCanvas } from '@/components/pool-designer/ManualTracingCanvas';
import logo from '@/assets/piscineriviera-logo.png';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Settings } from 'lucide-react';
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

interface StoredProjectInfo {
  createdAt?: string;
}

const Design: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scaleInfo, setScaleInfo] = useState<{ metersPerPixel: number; latitude: number; zoom: number } | null>(null);
  const [poolState, setPoolState] = useState<any>(null);
  const [isManualTracing, setIsManualTracing] = useState(false);
  const [projectInfo, setProjectInfo] = useState<StoredProjectInfo>({
    createdAt: new Date().toISOString(),
  });
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    // Load project info from sessionStorage
    const stored = sessionStorage.getItem('projectInfo');
    if (stored) {
      setProjectInfo(JSON.parse(stored));
    } else {
      // Initialize with current date
      const newProjectInfo = { createdAt: new Date().toISOString() };
      sessionStorage.setItem('projectInfo', JSON.stringify(newProjectInfo));
      setProjectInfo(newProjectInfo);
    }
    // Load notes from sessionStorage
    const storedNotes = sessionStorage.getItem('projectNotes');
    if (storedNotes) {
      setNotes(storedNotes);
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
    setNotes('');
    sessionStorage.removeItem('projectNotes');
  };

  const handleStartNewProject = () => {
    sessionStorage.removeItem('projectInfo');
    sessionStorage.removeItem('projectNotes');
    // Reset project info with new date
    const newProjectInfo = { createdAt: new Date().toISOString() };
    sessionStorage.setItem('projectInfo', JSON.stringify(newProjectInfo));
    setProjectInfo(newProjectInfo);
    handleReset();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    sessionStorage.setItem('projectNotes', value);
  };

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
                    This will clear all current work and start a new project. This action cannot be undone.
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
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => navigate('/admin')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Admin
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-104px)]">
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Always visible */}
          <div className="w-64 min-w-[240px] border-r bg-white overflow-y-auto flex flex-col">
            <div className="p-3 space-y-3 flex-1">
              {/* Project Date */}
              <div className="bg-primary/10 rounded-lg p-2 space-y-1">
                {projectInfo.createdAt && (
                  <p className="text-sm font-medium text-primary">{formatDate(projectInfo.createdAt)}</p>
                )}
              </div>

              {/* Notes Section */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this project..."
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="min-h-[80px] text-xs resize-none"
                />
              </div>
              
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
