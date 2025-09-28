import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { ArrowLeft, FileText, Search, Map, TrendingUp, AlertCircle } from 'lucide-react';
import type { Screen, AppState, CreditAction } from '../../App';
import type { AnalysisResponse } from '@/types/credit';
import { analyzeCreditReport } from '@/lib/api';

interface ParsingScreenProps {
  onNavigate: (screen: Screen) => void;
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const PARSING_STAGES = [
  { id: 'scanning', label: 'Scanning', icon: Search, description: 'Reading document structure' },
  { id: 'extracting', label: 'Extracting', icon: FileText, description: 'Pulling account data' },
  { id: 'mapping', label: 'Mapping', icon: Map, description: 'Categorizing information' },
  { id: 'scoring', label: 'Scoring', icon: TrendingUp, description: 'Calculating recommendations' },
];

// No MOCK actions: rely on API analysis response only.

export function ParsingScreen({ onNavigate, state, updateState }: ParsingScreenProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Staged progress animation (non-blocking)
    const runProgress = async () => {
      for (let i = 0; i <= PARSING_STAGES.length; i++) {
        if (cancelled) return;
        if (i < PARSING_STAGES.length) setCurrentStage(i);
        const stageProgress = (i / PARSING_STAGES.length) * 100;
        let localProgress = 0;
        while (!cancelled && localProgress <= 100) {
          setProgress(stageProgress + localProgress / PARSING_STAGES.length);
          await new Promise((r) => setTimeout(r, 50));
          localProgress += Math.random() * 10;
        }
      }
    };

    const runAnalysis = async () => {
      try {
        const rawFile = window.__nbaFile as File | undefined;
        if (!rawFile) {
          setError('No file found to analyze. Please upload again.');
          return;
        }
        const resp: AnalysisResponse = await analyzeCreditReport(rawFile);
        if (cancelled) return;
        updateState({ analysis: resp });
        onNavigate('results');
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Analysis failed. Please try again.';
        setError(msg);
      }
    };

    runProgress();
    runAnalysis();

    return () => {
      cancelled = true;
    };
  }, [updateState, onNavigate]);

  const handleRetry = () => {
    setError(null);
    setCurrentStage(0);
    setProgress(0);
    // Re-run analysis after a brief tick to let state reset
    setTimeout(() => {
      const rawFile = window.__nbaFile as File | undefined;
      if (rawFile) {
        analyzeCreditReport(rawFile)
          .then((resp: AnalysisResponse) => {
            updateState({ analysis: resp });
            onNavigate('results');
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : 'Analysis failed. Please try again.';
            setError(msg);
          });
      }
    }, 0);
  };

  const handleSkipAuth = () => {
    onNavigate('auth');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-lg">Processing Error</h2>
              <p className="text-muted-foreground text-sm">
                {error}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onNavigate('upload')}>
                  Upload Different File
                </Button>
                <Button onClick={handleRetry}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNavigate('upload')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl mb-1">Analyzing Your Credit Report</h1>
            <p className="text-muted-foreground">
              This usually takes 30-60 seconds
            </p>
          </div>
        </div>

        {/* Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Overall Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Processing Progress</span>
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Current Stage */}
              <div className="space-y-4">
                {PARSING_STAGES.map((stage, index) => {
                  const Icon = stage.icon;
                  const isActive = index === currentStage;
                  const isCompleted = index < currentStage;
                  
                  return (
                    <div 
                      key={stage.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary/5 border border-primary/20' 
                          : isCompleted
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                          {stage.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Files Being Processed */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Processing Files</h4>
                <div className="space-y-2">
                  {state.files.map(file => (
                    <div key={file.id} className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1">{file.name}</span>
                      {file.bureau && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {file.bureau}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional: Create Account CTA */}
        {!state.isAuthenticated && (
          <Card className="mt-6 bg-primary/5 border-primary/20">
            <CardContent className="pt-6 text-center">
              <h3 className="font-medium mb-2">Save Your Analysis</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create an account to save your recommendations and track progress over time.
              </p>
              <Button variant="outline" onClick={handleSkipAuth}>
                Create Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
