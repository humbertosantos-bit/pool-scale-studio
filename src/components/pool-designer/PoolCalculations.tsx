import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PoolData {
  poolId: string;
  poolName: string;
  copingSqFt: number;
  paverNetSqFt: number;
  paverWithWasteSqFt: number;
}

interface FenceData {
  fenceId: string;
  name: string;
  linearFt: number;
}

interface PaverData {
  paverId: string;
  sqFt: number;
}

interface PoolCalculationsProps {
  pools: PoolData[];
  fences: FenceData[];
  pavers: PaverData[];
}

export const PoolCalculations: React.FC<PoolCalculationsProps> = ({
  pools,
  fences,
  pavers,
}) => {
  const hasAnyElements = pools.length > 0 || fences.length > 0 || pavers.length > 0;

  return (
    <div className="w-full border-t bg-background">
      <Card className="rounded-none border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Calculations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAnyElements && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No elements yet. Add pools, fences, or pavers to see calculations.
            </p>
          )}

          {/* Pool Calculations */}
          {pools.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Pools</h3>
              {pools.map((pool) => (
                <div key={pool.poolId} className="pl-4 space-y-1.5 text-sm border-l-2 border-primary/20">
                  <p className="font-medium text-foreground">{pool.poolName}</p>
                  
                  {/* Coping */}
                  <div className="bg-muted/50 p-2 rounded">
                    <p className="text-xs font-medium text-muted-foreground">Coping Area</p>
                    <p className="text-sm font-semibold">{pool.copingSqFt.toFixed(2)} sq ft</p>
                  </div>
                  
                  {/* Pavers */}
                  {pool.paverNetSqFt > 0 && (
                    <div className="bg-muted/50 p-2 rounded space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Paver Area (Net)</p>
                      <p className="text-sm">{pool.paverNetSqFt.toFixed(2)} sq ft</p>
                      
                      <div className="border-t border-border/50 pt-1 mt-1">
                        <p className="text-xs font-medium text-primary">Paver Area + 10% Waste</p>
                        <p className="text-sm font-bold text-primary">{pool.paverWithWasteSqFt.toFixed(2)} sq ft</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fence Calculations */}
          {fences.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Fences</h3>
              {fences.map((fence) => (
                <div key={fence.fenceId} className="pl-4 text-sm">
                  <p className="text-muted-foreground">
                    {fence.name}: {fence.linearFt.toFixed(2)} linear ft
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Additional Paver Calculations */}
          {pavers.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Additional Pavers</h3>
              <div className="pl-4 text-sm space-y-1">
                <p className="text-muted-foreground">
                  Net: {pavers.reduce((sum, p) => sum + p.sqFt, 0).toFixed(2)} sq ft
                </p>
                <p className="text-primary font-medium">
                  + 10% Waste: {(pavers.reduce((sum, p) => sum + p.sqFt, 0) * 1.1).toFixed(2)} sq ft
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
