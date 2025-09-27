import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Shield, FileText, TrendingUp, ArrowRight, Upload, Play } from 'lucide-react';
import type { Screen } from '../../App';

interface LandingScreenProps {
  onNavigate: (screen: Screen) => void;
}

export function LandingScreen({ onNavigate }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <span className="text-lg tracking-tight">Next Best Action</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('auth')}>
              Sign In
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center max-w-4xl">
        <h1 className="text-4xl md:text-6xl mb-6 tracking-tight">
          Upload your credit report.{' '}
          <span className="text-primary">Get your next best</span>{' '}
          financial moves.
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Turn your credit report into a prioritized action plan. See exactly what to do next 
          to save money and improve your credit score.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button 
            size="lg" 
            className="text-base px-8 py-6"
            onClick={() => onNavigate('upload')}
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Report (PDF/HTML)
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="text-base px-8 py-6"
          >
            <Play className="w-5 h-5 mr-2" />
            See How It Works
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mb-16">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Local parsing option
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            We don't sell data
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            SOC 2 compliant
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-6 text-center">
            <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="mb-2">Smart Analysis</h3>
            <p className="text-muted-foreground">
              Upload any credit report format. Our AI identifies opportunities across all your accounts.
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="mb-2">Prioritized Actions</h3>
            <p className="text-muted-foreground">
              Get a ranked list of actions based on impact, effort, and your financial goals.
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <ArrowRight className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="mb-2">Take Action</h3>
            <p className="text-muted-foreground">
              Step-by-step guidance to implement each recommendation and track your progress.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Next Best Action</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <button className="hover:text-foreground transition-colors">
                Privacy Policy
              </button>
              <button className="hover:text-foreground transition-colors">
                Terms of Service
              </button>
              <button className="hover:text-foreground transition-colors">
                Disclosures
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}