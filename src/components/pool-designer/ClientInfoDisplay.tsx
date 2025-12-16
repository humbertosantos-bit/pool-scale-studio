import React from 'react';
import { ClientInfo } from './ClientInfoForm';
import { representatives } from '@/data/representatives';

interface ClientInfoDisplayProps {
  clientInfo: ClientInfo;
}

export const ClientInfoDisplay: React.FC<ClientInfoDisplayProps> = ({ clientInfo }) => {
  const selectedRep = representatives.find(r => r.id === clientInfo.representativeId);

  return (
    <div className="space-y-4">
      {/* Representative Info */}
      {selectedRep && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-primary px-4 py-2">
            <h2 className="text-xs font-semibold text-primary-foreground">👔 Representative</h2>
          </div>
          <div className="p-3 space-y-1 text-xs">
            <p className="font-semibold">{selectedRep.name}</p>
            <p className="text-muted-foreground">{selectedRep.phone}</p>
            <p className="text-muted-foreground">{selectedRep.email}</p>
          </div>
        </div>
      )}

      {/* Client Info */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-primary px-4 py-2">
          <h2 className="text-xs font-semibold text-primary-foreground">👤 Client</h2>
        </div>
        <div className="p-3 space-y-1 text-xs">
          {clientInfo.name && <p className="font-semibold">{clientInfo.name}</p>}
          {clientInfo.phone && <p className="text-muted-foreground">{clientInfo.phone}</p>}
          {clientInfo.email && <p className="text-muted-foreground">{clientInfo.email}</p>}
          {clientInfo.address && <p className="text-muted-foreground">{clientInfo.address}</p>}
          {!clientInfo.name && !clientInfo.phone && !clientInfo.email && !clientInfo.address && (
            <p className="text-muted-foreground italic">No client info provided</p>
          )}
        </div>
      </div>
    </div>
  );
};
