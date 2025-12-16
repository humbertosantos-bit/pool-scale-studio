import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { representatives, Representative } from '@/data/representatives';

export interface ClientInfo {
  name: string;
  phone: string;
  address: string;
  email: string;
  representativeId: string;
}

interface ClientInfoFormProps {
  clientInfo: ClientInfo;
  onClientInfoChange: (info: ClientInfo) => void;
}

export const ClientInfoForm: React.FC<ClientInfoFormProps> = ({
  clientInfo,
  onClientInfoChange,
}) => {
  const handleChange = (field: keyof ClientInfo, value: string) => {
    onClientInfoChange({ ...clientInfo, [field]: value });
  };

  const selectedRep = representatives.find(r => r.id === clientInfo.representativeId);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-primary px-4 py-3">
        <h2 className="text-sm font-semibold text-primary-foreground">👤 Client Information</h2>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <Label htmlFor="clientName" className="text-xs font-semibold mb-1.5 block">
            Client Name
          </Label>
          <Input
            id="clientName"
            type="text"
            placeholder="Enter client name"
            value={clientInfo.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="text-xs"
          />
        </div>
        
        <div>
          <Label htmlFor="clientPhone" className="text-xs font-semibold mb-1.5 block">
            Phone Number
          </Label>
          <Input
            id="clientPhone"
            type="tel"
            placeholder="Enter phone number"
            value={clientInfo.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="text-xs"
          />
        </div>
        
        <div>
          <Label htmlFor="clientAddress" className="text-xs font-semibold mb-1.5 block">
            Address
          </Label>
          <Input
            id="clientAddress"
            type="text"
            placeholder="Enter address"
            value={clientInfo.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="text-xs"
          />
        </div>
        
        <div>
          <Label htmlFor="clientEmail" className="text-xs font-semibold mb-1.5 block">
            Email
          </Label>
          <Input
            id="clientEmail"
            type="email"
            placeholder="Enter email"
            value={clientInfo.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="text-xs"
          />
        </div>
        
        <div>
          <Label htmlFor="representative" className="text-xs font-semibold mb-1.5 block">
            Representative
          </Label>
          <Select
            value={clientInfo.representativeId}
            onValueChange={(value) => handleChange('representativeId', value)}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select a representative" />
            </SelectTrigger>
            <SelectContent>
              {representatives.map((rep) => (
                <SelectItem key={rep.id} value={rep.id} className="text-xs">
                  {rep.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
