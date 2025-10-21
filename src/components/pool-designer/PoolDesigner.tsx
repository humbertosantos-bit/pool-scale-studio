import React, { useState } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { PoolCanvas } from './PoolCanvas';
import { PoolControls } from './PoolControls';
import logo from '@/assets/piscineriviera-logo.png';
import type { Unit, CopingSize, PoolModel, CustomPoolDimensions, PaverConfig } from '@/types/poolDesigner';

export const PoolDesigner: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [unit, setUnit] = useState<Unit>('feet');
  const [selectedModel, setSelectedModel] = useState<PoolModel | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customDimensions, setCustomDimensions] = useState<CustomPoolDimensions>({
    lengthFeet: 20,
    lengthInches: 0,
    widthFeet: 12,
    widthInches: 0,
  });
  const [copingSize, setCopingSize] = useState<CopingSize>(0);
  const [paverConfig, setPaverConfig] = useState<PaverConfig>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    sameOnAllSides: false,
  });
  const [scaleReference, setScaleReference] = useState<{ length: number; pixelLength: number } | null>(null);
  const [isSettingScale, setIsSettingScale] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedImage(file);
  };

  const handleStateChange = (state: any) => {
    if (state.scaleReference !== undefined) {
      setScaleReference(state.scaleReference);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center gap-6">
          <img src={logo} alt="Piscine Riviera" className="h-16 w-auto" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Piscine Riviera Design Tool
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Left Sidebar */}
        <div className="w-1/4 border-r bg-card overflow-y-auto">
          <div className="p-6 space-y-4">
            {selectedImage ? (
              <PoolControls
                unit={unit}
                onUnitChange={setUnit}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                isCustom={isCustom}
                onIsCustomChange={setIsCustom}
                customDimensions={customDimensions}
                onCustomDimensionsChange={setCustomDimensions}
                copingSize={copingSize}
                onCopingSizeChange={setCopingSize}
                paverConfig={paverConfig}
                onPaverConfigChange={setPaverConfig}
                scaleReference={scaleReference}
                onStartScaleReference={() => setIsSettingScale(true)}
              />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-primary px-4 py-3">
                  <h2 className="text-sm font-semibold text-primary-foreground">
                    📁 Upload Property Image
                  </h2>
                </div>
                <div className="p-4">
                  <FileUpload onFileSelect={handleFileSelect} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Canvas */}
        <div className="w-3/4 bg-gradient-to-br from-background to-primary/5 overflow-auto">
          {selectedImage ? (
            <PoolCanvas
              imageFile={selectedImage}
              canvasOnly
              onStateChange={handleStateChange}
              selectedModel={selectedModel}
              customDimensions={customDimensions}
              isCustom={isCustom}
              unit={unit}
              copingSize={copingSize}
              paverConfig={paverConfig}
              isSettingScale={isSettingScale}
              onIsSettingScaleChange={setIsSettingScale}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl opacity-50">🏊‍♂️</div>
                <p className="text-xl text-muted-foreground">
                  Upload an image to start designing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
