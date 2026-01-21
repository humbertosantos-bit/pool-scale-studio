import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/piscineriviera-logo.png';
import { ArrowLeft } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSent(true);
      toast({
        title: 'Email sent',
        description: 'Check your inbox for the password reset link.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-pool-light/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src={logo} alt="Piscine Riviera" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary">Reset Password</h1>
          <p className="text-muted-foreground mt-2">
            {sent ? 'Check your email for the reset link' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <p className="text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <Button variant="outline" onClick={() => setSent(false)} className="w-full">
                Send again
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}

          <Link 
            to="/login" 
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;