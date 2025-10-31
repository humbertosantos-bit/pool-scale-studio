import React, { useState } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ImageUploadOptionsProps {
  onFileSelect: (file: File, scaleInfo?: { metersPerPixel: number; latitude: number; zoom: number }) => void;
}

export const ImageUploadOptions: React.FC<ImageUploadOptionsProps> = ({ onFileSelect }) => {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'satellite'>('file');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchSatelliteImage = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setIsLoading(true);
    try {
      // First, geocode the address to get coordinates
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyAUY7FaBSea9DEfTNO1neyAy-2KmARFlSw`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.status !== 'OK' || !geocodeData.results[0]) {
        toast.error('Address not found. Please try a different address.');
        return;
      }

      const { lat, lng } = geocodeData.results[0].geometry.location;

      // Use Static Maps API to get satellite image
      const zoom = 20; // High zoom for detailed view
      const size = '1280x1280';
      const mapType = 'satellite';
      
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=AIzaSyAUY7FaBSea9DEfTNO1neyAy-2KmARFlSw`;

      // Fetch the image
      const imageResponse = await fetch(staticMapUrl);
      const imageBlob = await imageResponse.blob();

      // Convert blob to File
      const file = new File([imageBlob], `satellite-${Date.now()}.png`, { type: 'image/png' });
      
      // Calculate scale: meters per pixel at this zoom level and latitude
      // Formula: 156543.03392 * cos(latitude) / (2 ^ zoom)
      const metersPerPixel = (156543.03392 * Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom);
      
      onFileSelect(file, { metersPerPixel, latitude: lat, zoom });
      toast.success('Satellite image loaded successfully!');
    } catch (error) {
      console.error('Error fetching satellite image:', error);
      toast.error('Failed to load satellite image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle between upload methods */}
      <div className="flex gap-2">
        <button
          onClick={() => setUploadMethod('file')}
          className={`flex-1 px-3 py-2 border rounded-md text-xs transition-colors ${
            uploadMethod === 'file'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background hover:bg-muted'
          }`}
        >
          📁 Upload File
        </button>
        <button
          onClick={() => setUploadMethod('satellite')}
          className={`flex-1 px-3 py-2 border rounded-md text-xs transition-colors ${
            uploadMethod === 'satellite'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background hover:bg-muted'
          }`}
        >
          🛰️ Satellite Image
        </button>
      </div>

      {/* File upload */}
      {uploadMethod === 'file' && (
        <FileUpload onFileSelect={onFileSelect} />
      )}

      {/* Satellite image */}
      {uploadMethod === 'satellite' && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="address" className="text-xs font-semibold mb-1.5 block">
              Property Address
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="Enter full address (e.g., 123 Main St, City, State)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchSatelliteImage();
                }
              }}
              className="text-xs"
            />
          </div>
          <Button
            onClick={fetchSatelliteImage}
            disabled={isLoading}
            className="w-full text-xs"
          >
            {isLoading ? 'Loading...' : 'Load Satellite Image'}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            💡 Enter the complete property address for best results
          </p>
        </div>
      )}
    </div>
  );
};
