import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientInfoForm, ClientInfo } from '@/components/pool-designer/ClientInfoForm';
import { Button } from '@/components/ui/button';
import logo from '@/assets/piscineriviera-logo.png';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    phone: '',
    address: '',
    email: '',
    representativeId: '',
  });

  const handleStartDesign = () => {
    // Store client info with creation date in sessionStorage
    const dataToStore = {
      ...clientInfo,
      createdAt: new Date().toISOString(),
    };
    sessionStorage.setItem('clientInfo', JSON.stringify(dataToStore));
    navigate('/design');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-pool-light/20">
      {/* Header */}
      <div className="border-b bg-[hsl(var(--header-bg))] backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-center gap-6">
          <img src={logo} alt="Piscine Riviera" className="h-16 w-auto" />
          <h1 className="text-3xl font-bold text-white">
            Piscine Riviera Design Tool
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-104px)] p-8">
        <div className="w-full max-w-md space-y-6">
          <ClientInfoForm 
            clientInfo={clientInfo}
            onClientInfoChange={setClientInfo}
          />
          
          <Button 
            onClick={handleStartDesign}
            className="w-full text-lg py-6"
            size="lg"
          >
            🎨 Start Design
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
