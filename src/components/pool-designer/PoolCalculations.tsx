import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PoolData {
  poolId: string;
  poolName: string;
  copingSqFt: number;
  paverAroundPoolSqFt: number;
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
  return (
    <div className="w-full border-t bg-background p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calculations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pool Calculations */}
          {pools.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Pools</h3>
              {pools.map((pool) => (
                <div key={pool.poolId} className="pl-4 space-y-1 text-sm">
                  <p className="font-medium">{pool.poolName}</p>
                  <p className="text-muted-foreground">
                    Coping: {pool.copingSqFt.toFixed(2)} sq ft (with 10%: {(pool.copingSqFt * 1.1).toFixed(2)} sq ft)
                  </p>
                  <p className="text-muted-foreground">
                    Pavers Around Pool: {pool.paverAroundPoolSqFt.toFixed(2)} sq ft (with 10%: {(pool.paverAroundPoolSqFt * 1.1).toFixed(2)} sq ft)
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Fence Calculations */}
          {fences.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Fences</h3>
              {fences.map((fence, index) => (
                <div key={fence.fenceId} className="pl-4 text-sm">
                  <p className="text-muted-foreground">
                    Fence {index + 1}: {fence.linearFt.toFixed(2)} linear ft
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Paver Calculations */}
          {pavers.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Additional Pavers</h3>
              <div className="pl-4 text-sm">
                <p className="text-muted-foreground">
                  Total: {pavers.reduce((sum, p) => sum + p.sqFt, 0).toFixed(2)} sq ft 
                  (with 10%: {(pavers.reduce((sum, p) => sum + p.sqFt, 0) * 1.1).toFixed(2)} sq ft)
                </p>
              </div>
            </div>
          )}

          {pools.length === 0 && fences.length === 0 && pavers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No items added yet. Add pools, fences, or pavers to see calculations.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
