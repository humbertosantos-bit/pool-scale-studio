import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import type { Unit, CopingSize, PoolModel, CustomPoolDimensions, PaverConfig } from '@/types/poolDesigner';
import { PREDEFINED_MODELS, formatDimension, feetToMeters, metersToFeet } from '@/types/poolDesigner';

interface PoolControlsProps {
  unit: Unit;
  onUnitChange: (unit: Unit) => void;
  selectedModel: PoolModel | null;
  onModelSelect: (model: PoolModel | null) => void;
  isCustom: boolean;
  onIsCustomChange: (isCustom: boolean) => void;
  customDimensions: CustomPoolDimensions;
  onCustomDimensionsChange: (dims: CustomPoolDimensions) => void;
  copingSize: CopingSize;
  onCopingSizeChange: (size: CopingSize) => void;
  paverConfig: PaverConfig;
  onPaverConfigChange: (config: PaverConfig) => void;
  scaleReference: { length: number; pixelLength: number } | null;
  onStartScaleReference: () => void;
  onExportLayout: () => void;
}

export const PoolControls: React.FC<PoolControlsProps> = ({
  unit,
  onUnitChange,
  selectedModel,
  onModelSelect,
  isCustom,
  onIsCustomChange,
  customDimensions,
  onCustomDimensionsChange,
  copingSize,
  onCopingSizeChange,
  paverConfig,
  onPaverConfigChange,
  scaleReference,
  onStartScaleReference,
  onExportLayout,
}) => {
  const [customModelName, setCustomModelName] = useState('');

  return (
    <div className="space-y-4">
      {/* Unit Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📏 Units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4">
            <Button
              variant={unit === 'feet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUnitChange('feet')}
              className="flex-1"
            >
              Feet/Inches
            </Button>
            <Button
              variant={unit === 'meters' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUnitChange('meters')}
              className="flex-1"
            >
              Meters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scale Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📐 Set Scale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Draw a line on a known distance to set the scale.
          </p>
          <Button onClick={onStartScaleReference} size="sm" className="w-full">
            {scaleReference ? 'Reset Scale' : 'Set Scale Reference'}
          </Button>
          {scaleReference && (
            <p className="text-xs text-green-600">
              ✓ Scale set: {scaleReference.length} {unit === 'feet' ? 'ft' : 'm'}
            </p>
          )}
        </CardContent>
      </Card>

      {scaleReference && (
        <>
          {/* Pool Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🏊 Pool Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup
                value={isCustom ? 'custom' : selectedModel?.id || ''}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    onIsCustomChange(true);
                    onModelSelect(null);
                  } else {
                    onIsCustomChange(false);
                    const model = PREDEFINED_MODELS.find((m) => m.id === value);
                    onModelSelect(model || null);
                  }
                }}
              >
                {PREDEFINED_MODELS.map((model) => (
                  <div key={model.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={model.id} id={model.id} />
                    <Label htmlFor={model.id} className="text-sm cursor-pointer">
                      {model.name} ({formatDimension(model.widthFeet, unit)} x{' '}
                      {formatDimension(model.lengthFeet, unit)})
                    </Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="text-sm cursor-pointer">
                    Custom Model
                  </Label>
                </div>
              </RadioGroup>

              {isCustom && (
                <div className="space-y-2 pt-2 border-t">
                  <div>
                    <Label className="text-xs">Model Name (optional)</Label>
                    <Input
                      value={customModelName}
                      onChange={(e) => setCustomModelName(e.target.value)}
                      placeholder="e.g., My Custom Pool"
                      className="text-sm"
                    />
                  </div>
                  
                  {unit === 'feet' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Length (ft)</Label>
                          <Input
                            type="number"
                            value={customDimensions.lengthFeet}
                            onChange={(e) =>
                              onCustomDimensionsChange({
                                ...customDimensions,
                                lengthFeet: parseInt(e.target.value) || 0,
                              })
                            }
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Length (in)</Label>
                          <Input
                            type="number"
                            value={customDimensions.lengthInches}
                            onChange={(e) =>
                              onCustomDimensionsChange({
                                ...customDimensions,
                                lengthInches: parseInt(e.target.value) || 0,
                              })
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width (ft)</Label>
                          <Input
                            type="number"
                            value={customDimensions.widthFeet}
                            onChange={(e) =>
                              onCustomDimensionsChange({
                                ...customDimensions,
                                widthFeet: parseInt(e.target.value) || 0,
                              })
                            }
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Width (in)</Label>
                          <Input
                            type="number"
                            value={customDimensions.widthInches}
                            onChange={(e) =>
                              onCustomDimensionsChange({
                                ...customDimensions,
                                widthInches: parseInt(e.target.value) || 0,
                              })
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs">Length (m)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={feetToMeters(
                            customDimensions.lengthFeet + customDimensions.lengthInches / 12
                          ).toFixed(2)}
                          onChange={(e) => {
                            const meters = parseFloat(e.target.value) || 0;
                            const feet = metersToFeet(meters);
                            onCustomDimensionsChange({
                              ...customDimensions,
                              lengthFeet: Math.floor(feet),
                              lengthInches: Math.round((feet % 1) * 12),
                            });
                          }}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Width (m)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={feetToMeters(
                            customDimensions.widthFeet + customDimensions.widthInches / 12
                          ).toFixed(2)}
                          onChange={(e) => {
                            const meters = parseFloat(e.target.value) || 0;
                            const feet = metersToFeet(meters);
                            onCustomDimensionsChange({
                              ...customDimensions,
                              widthFeet: Math.floor(feet),
                              widthInches: Math.round((feet % 1) * 12),
                            });
                          }}
                          className="text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coping Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🔲 Coping</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={copingSize.toString()}
                onValueChange={(value) => onCopingSizeChange(parseInt(value) as CopingSize)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="0" id="coping-none" />
                  <Label htmlFor="coping-none" className="text-sm cursor-pointer">
                    No Coping
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="12" id="coping-12" />
                  <Label htmlFor="coping-12" className="text-sm cursor-pointer">
                    12" Coping
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="16" id="coping-16" />
                  <Label htmlFor="coping-16" className="text-sm cursor-pointer">
                    16" Coping
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Paver Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🔳 Pavers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Same on all sides</Label>
                <Switch
                  checked={paverConfig.sameOnAllSides}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const value = paverConfig.top;
                      onPaverConfigChange({
                        top: value,
                        right: value,
                        bottom: value,
                        left: value,
                        sameOnAllSides: true,
                      });
                    } else {
                      onPaverConfigChange({
                        ...paverConfig,
                        sameOnAllSides: false,
                      });
                    }
                  }}
                />
              </div>

              {paverConfig.sameOnAllSides ? (
                <div>
                  <Label className="text-xs">
                    All Sides ({unit === 'feet' ? 'ft' : 'm'})
                  </Label>
                  <Input
                    type="number"
                    step={unit === 'feet' ? '1' : '0.1'}
                    value={
                      unit === 'feet'
                        ? paverConfig.top
                        : feetToMeters(paverConfig.top).toFixed(2)
                    }
                    onChange={(e) => {
                      const value =
                        unit === 'feet'
                          ? parseFloat(e.target.value) || 0
                          : metersToFeet(parseFloat(e.target.value) || 0);
                      onPaverConfigChange({
                        top: value,
                        right: value,
                        bottom: value,
                        left: value,
                        sameOnAllSides: true,
                      });
                    }}
                    className="text-sm"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">
                      Top ({unit === 'feet' ? 'ft' : 'm'})
                    </Label>
                    <Input
                      type="number"
                      step={unit === 'feet' ? '1' : '0.1'}
                      value={
                        unit === 'feet'
                          ? paverConfig.top
                          : feetToMeters(paverConfig.top).toFixed(2)
                      }
                      onChange={(e) => {
                        const value =
                          unit === 'feet'
                            ? parseFloat(e.target.value) || 0
                            : metersToFeet(parseFloat(e.target.value) || 0);
                        onPaverConfigChange({ ...paverConfig, top: value });
                      }}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Right ({unit === 'feet' ? 'ft' : 'm'})
                    </Label>
                    <Input
                      type="number"
                      step={unit === 'feet' ? '1' : '0.1'}
                      value={
                        unit === 'feet'
                          ? paverConfig.right
                          : feetToMeters(paverConfig.right).toFixed(2)
                      }
                      onChange={(e) => {
                        const value =
                          unit === 'feet'
                            ? parseFloat(e.target.value) || 0
                            : metersToFeet(parseFloat(e.target.value) || 0);
                        onPaverConfigChange({ ...paverConfig, right: value });
                      }}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Bottom ({unit === 'feet' ? 'ft' : 'm'})
                    </Label>
                    <Input
                      type="number"
                      step={unit === 'feet' ? '1' : '0.1'}
                      value={
                        unit === 'feet'
                          ? paverConfig.bottom
                          : feetToMeters(paverConfig.bottom).toFixed(2)
                      }
                      onChange={(e) => {
                        const value =
                          unit === 'feet'
                            ? parseFloat(e.target.value) || 0
                            : metersToFeet(parseFloat(e.target.value) || 0);
                        onPaverConfigChange({ ...paverConfig, bottom: value });
                      }}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Left ({unit === 'feet' ? 'ft' : 'm'})
                    </Label>
                    <Input
                      type="number"
                      step={unit === 'feet' ? '1' : '0.1'}
                      value={
                        unit === 'feet'
                          ? paverConfig.left
                          : feetToMeters(paverConfig.left).toFixed(2)
                      }
                      onChange={(e) => {
                        const value =
                          unit === 'feet'
                            ? parseFloat(e.target.value) || 0
                            : metersToFeet(parseFloat(e.target.value) || 0);
                        onPaverConfigChange({ ...paverConfig, left: value });
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">💾 Export</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={onExportLayout} 
                className="w-full"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Layout
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Exports PNG image and PDF with dimensions
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
