import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, Mail, User } from 'lucide-react';
import type { Screen, AppState } from '../../App';

interface AuthScreenProps {
  onNavigate: (screen: Screen) => void;
  onAuth: (updates: Partial<AppState>) => void;
}

export function AuthScreen({ onNavigate, onAuth }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate sending magic link
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setEmailSent(true);
    setIsLoading(false);
  };

  const handleGuestContinue = () => {
    onAuth({ isAuthenticated: false, email: '' });
    onNavigate('upload');
  };

  const handleEmailSubmit = () => {
    onAuth({ isAuthenticated: true, email });
    onNavigate('upload');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => onNavigate('landing')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Create an account to save your analysis, or continue as a guest
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!emailSent ? (
              <>
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm mb-2">
                      Email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {isLoading ? 'Sending...' : 'Send Magic Link'}
                  </Button>
                </form>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleGuestContinue}
                >
                  <User className="w-4 h-4 mr-2" />
                  Continue as Guest
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800">
                    Magic link sent to {email}! Check your inbox and click the link to continue.
                  </p>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={handleEmailSubmit}
                >
                  I've clicked the link
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Try different email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}