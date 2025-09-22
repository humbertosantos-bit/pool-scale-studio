import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
  children?: React.ReactNode;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "image/*",
  className,
  children
}) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={cn(
        "border-2 border-dashed border-primary/30 rounded-lg p-8 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-pool-light/10",
        className
      )}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />
      {children || (
        <div className="space-y-2">
          <div className="text-4xl">📁</div>
          <p className="text-foreground font-medium">Drop your image here or click to select</p>
          <p className="text-muted-foreground text-sm">Supports JPG, PNG, WEBP</p>
        </div>
      )}
    </div>
  );
};