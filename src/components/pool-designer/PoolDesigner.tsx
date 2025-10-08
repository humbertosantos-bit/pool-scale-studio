import React, { useState } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { PoolCanvas } from './PoolCanvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/piscineriviera-logo.png';

export const PoolDesigner: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedImage(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-pool-light/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center gap-6">
          <img src={logo} alt="Piscine Riviera" className="h-20 w-auto" />
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Piscine Riviera Design Tool
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📁 Upload Property Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFileSelect={handleFileSelect} />
              
              {selectedImage && (
                <div className="mt-4 p-3 bg-pool-light/20 rounded-lg">
                  <p className="text-sm text-foreground font-medium">
                    ✅ {selectedImage.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ready for design
                  </p>
                </div>
              )}
              
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium">1.</span>
                  <span>Upload your property photo</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium">2.</span>
                  <span>Set scale reference (draw a line on a known measurement)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium">3.</span>
                  <span>Add and position pools to visualize</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎨 Design Canvas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedImage ? (
                <PoolCanvas imageFile={selectedImage} />
              ) : (
                <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-primary/30 rounded-lg">
                  <div className="text-center space-y-2">
                    <div className="text-4xl opacity-50">🏊‍♂️</div>
                    <p className="text-muted-foreground">Upload an image to start designing</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};