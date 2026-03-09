import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CatalogPool {
  id: string;
  name: string;
  display_name: string;
  width_feet: number;
  width_inches: number;
  length_feet: number;
  length_inches: number;
  image_url: string | null;
}

export interface PoolDialogResult {
  type: 'preset' | 'custom' | 'draw';
  pool?: CatalogPool;
  customWidthFeet?: number;
  customLengthFeet?: number;
  copingSize: number;
  rotated: boolean;
  imageUrl?: string | null;
  paverTop: { feet: string; inches: string };
  paverBottom: { feet: string; inches: string };
  paverLeft: { feet: string; inches: string };
  paverRight: { feet: string; inches: string };
}

interface AddPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: PoolDialogResult) => void;
  onDrawCustom: () => void;
}

export const AddPoolDialog: React.FC<AddPoolDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onDrawCustom,
}) => {
  const [catalogPools, setCatalogPools] = useState<CatalogPool[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedPool, setSelectedPool] = useState<CatalogPool | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customWidth, setCustomWidth] = useState('12');
  const [customLength, setCustomLength] = useState('24');
  const [copingSize, setCopingSize] = useState(16);
  const [rotated, setRotated] = useState(false);

  // Sidewalk dimensions per side
  const [paverTopFt, setPaverTopFt] = useState('4');
  const [paverTopIn, setPaverTopIn] = useState('0');
  const [paverBottomFt, setPaverBottomFt] = useState('4');
  const [paverBottomIn, setPaverBottomIn] = useState('0');
  const [paverLeftFt, setPaverLeftFt] = useState('4');
  const [paverLeftIn, setPaverLeftIn] = useState('0');
  const [paverRightFt, setPaverRightFt] = useState('4');
  const [paverRightIn, setPaverRightIn] = useState('0');

  // Fetch catalog when dialog opens
  useEffect(() => {
    if (open) {
      fetchCatalog();
    }
  }, [open]);

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const { data, error } = await supabase
        .from('pool_models')
        .select('*')
        .order('display_name');
      if (error) throw error;
      setCatalogPools((data as unknown as CatalogPool[]) || []);
    } catch {
      setCatalogPools([]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const getPoolDimensions = () => {
    if (selectedPool) {
      const w = selectedPool.width_feet + selectedPool.width_inches / 12;
      const l = selectedPool.length_feet + selectedPool.length_inches / 12;
      return rotated ? { width: l, length: w } : { width: w, length: l };
    }
    if (isCustom) {
      const w = parseFloat(customWidth) || 12;
      const l = parseFloat(customLength) || 24;
      return rotated ? { width: l, length: w } : { width: w, length: l };
    }
    return null;
  };

  const dims = getPoolDimensions();

  const handleConfirm = () => {
    const result: PoolDialogResult = {
      type: selectedPool ? 'preset' : 'custom',
      pool: selectedPool || undefined,
      customWidthFeet: isCustom ? parseFloat(customWidth) || 12 : undefined,
      customLengthFeet: isCustom ? parseFloat(customLength) || 24 : undefined,
      copingSize,
      rotated,
      imageUrl: selectedPool?.image_url || null,
      paverTop: { feet: paverTopFt, inches: paverTopIn },
      paverBottom: { feet: paverBottomFt, inches: paverBottomIn },
      paverLeft: { feet: paverLeftFt, inches: paverLeftIn },
      paverRight: { feet: paverRightFt, inches: paverRightIn },
    };
    onConfirm(result);
    resetState();
  };

  const handleDrawCustom = () => {
    onOpenChange(false);
    onDrawCustom();
    resetState();
  };

  const resetState = () => {
    setSelectedPool(null);
    setIsCustom(false);
    setRotated(false);
  };

  const formatDim = (feet: number, inches: number) => {
    if (inches > 0) return `${feet}'${inches}"`;
    return `${feet}'`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Pool</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pool Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Pool Model</Label>
            {loadingCatalog ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-[250px] overflow-y-auto pr-1">
                {catalogPools.map((pool) => (
                  <button
                    key={pool.id}
                    onClick={() => { setSelectedPool(pool); setIsCustom(false); }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md border text-sm transition-colors text-left ${
                      selectedPool?.id === pool.id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    {/* Thumbnail */}
                    {pool.image_url ? (
                      <img src={pool.image_url} alt={pool.display_name} className="h-10 w-14 object-contain rounded border flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-14 rounded border flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0EA5E9, #38BDF8, #7DD3FC)' }}>
                        <span className="text-[8px] text-white font-bold">POOL</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{pool.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDim(pool.width_feet, pool.width_inches)} × {formatDim(pool.length_feet, pool.length_inches)}
                      </div>
                    </div>
                  </button>
                ))}
                {catalogPools.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No pool models in catalog. Admin can add them.</p>
                )}
                <button
                  onClick={() => { setIsCustom(true); setSelectedPool(null); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                    isCustom
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span>Custom Dimensions</span>
                </button>
              </div>
            )}
          </div>

          {/* Custom dimensions input */}
          {isCustom && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border">
              <div className="flex items-center gap-1">
                <Label className="text-xs">Width:</Label>
                <Input type="number" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} className="w-16 h-8 text-xs" />
                <span className="text-xs">ft</span>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">Length:</Label>
                <Input type="number" value={customLength} onChange={(e) => setCustomLength(e.target.value)} className="w-16 h-8 text-xs" />
                <span className="text-xs">ft</span>
              </div>
            </div>
          )}

          {/* Pool Preview + Rotation */}
          {dims && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Preview</Label>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setRotated(!rotated)}>
                  <RotateCcw className="h-3 w-3" />
                  Rotate 90°
                </Button>
              </div>
              <div className="flex items-center justify-center p-4 bg-muted/20 rounded-md border min-h-[120px]">
                <div className="relative">
                  {/* Pool images are imported horizontally (length is the long side).
                      Default: show horizontal (length as display width, width as display height).
                      Rotated: swap so it becomes vertical. */}
                  {(() => {
                    // Display dimensions: default horizontal, rotated vertical
                    const displayW = rotated ? Math.min(200, dims.width * 8) : Math.min(200, dims.length * 8);
                    const displayH = rotated ? Math.min(200, dims.length * 8) : Math.min(200, dims.width * 8);
                    return selectedPool?.image_url ? (
                      <img
                        src={selectedPool.image_url}
                        alt={selectedPool.display_name}
                        className="border-2 border-primary/40 rounded-sm"
                        style={{
                          width: `${displayW}px`,
                          height: `${displayH}px`,
                          objectFit: 'fill',
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-sm border-2 border-primary/40"
                        style={{
                          width: `${displayW}px`,
                          height: `${displayH}px`,
                          background: 'linear-gradient(135deg, #0EA5E9, #38BDF8, #7DD3FC, #BAE6FD)',
                        }}
                      />
                    );
                  })()}
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
                    {dims.width.toFixed(1)}' × {dims.length.toFixed(1)}'
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Coping Width */}
          {(selectedPool || isCustom) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Coping Width</Label>
              <div className="flex gap-2">
                {[12, 14, 16].map((size) => (
                  <Button
                    key={size}
                    size="sm"
                    variant={copingSize === size ? 'default' : 'outline'}
                    className="flex-1 h-8"
                    onClick={() => setCopingSize(size)}
                  >
                    {size}"
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sidewalk dimensions */}
          {(selectedPool || isCustom) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Sidewalk (per side)</Label>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-md border">
                {[
                  { label: 'Top', ft: paverTopFt, setFt: setPaverTopFt, inch: paverTopIn, setInch: setPaverTopIn },
                  { label: 'Bottom', ft: paverBottomFt, setFt: setPaverBottomFt, inch: paverBottomIn, setInch: setPaverBottomIn },
                  { label: 'Left', ft: paverLeftFt, setFt: setPaverLeftFt, inch: paverLeftIn, setInch: setPaverLeftIn },
                  { label: 'Right', ft: paverRightFt, setFt: setPaverRightFt, inch: paverRightIn, setInch: setPaverRightIn },
                ].map(({ label, ft, setFt, inch, setInch }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-10">{label}:</span>
                    <Input type="number" value={ft} onChange={(e) => setFt(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" />
                    <span className="text-[10px]">'</span>
                    <Input type="number" value={inch} onChange={(e) => setInch(e.target.value)} className="w-12 h-7 text-xs text-center p-0" min="0" max="11" />
                    <span className="text-[10px]">"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleDrawCustom}>
            <Pencil className="h-3 w-3" />
            Draw Custom Shape
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selectedPool && !isCustom}>
            Add Pool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
