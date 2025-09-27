import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { ArrowLeft, FileText, Search, Map, TrendingUp, AlertCircle } from 'lucide-react';
import type { Screen, AppState, CreditAction } from '../../App';

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

const MOCK_ACTIONS: CreditAction[] = [
  {
    id: '1',
    name: 'Negotiate APR on Chase Sapphire',
    category: 'credit-cards',
    description: 'Contact Chase to request a lower APR based on your payment history',
    estimatedSavings: 420,
    timeToComplete: '15 min',
    effort: 'Low',
    impact: 'High',
    scoreImpact: 0,
    steps: [
      'Call the number on the back of your card',
      'Ask to speak with the retention department',
      'Mention your good payment history and request a rate reduction',
      'If declined, ask about temporary promotional rates'
    ],
    requiredInputs: ['Current APR', 'Account tenure', 'Payment history']
  },
  {
    id: '2',
    name: 'Balance transfer to 0% intro card',
    category: 'credit-cards',
    description: 'Move high-interest debt to a new card with 0% introductory APR',
    estimatedSavings: 610,
    timeToComplete: '30 min',
    effort: 'Medium',
    impact: 'High',
    scoreImpact: -5,
    steps: [
      'Research 0% balance transfer offers',
      'Apply for the best card for your profile',
      'Once approved, initiate balance transfers',
      'Set up autopay for minimum payments'
    ],
    requiredInputs: ['Current balances', 'Credit score range', 'Income']
  },
  {
    id: '3',
    name: 'Set card autopay above minimum',
    category: 'credit-cards',
    description: 'Automate payments to avoid late fees and reduce balances faster',
    estimatedSavings: 300,
    timeToComplete: '2 min',
    effort: 'Low',
    impact: 'Medium',
    scoreImpact: 15,
    steps: [
      'Log into your credit card account',
      'Go to autopay settings',
      'Set payment to at least $25 above minimum',
      'Confirm payment date is before due date'
    ],
    requiredInputs: ['Bank account information', 'Preferred payment amount']
  },
  {
    id: '4',
    name: 'Refinance auto loan',
    category: 'loans',
    description: 'Get a lower rate on your auto loan with current improved credit',
    estimatedSavings: 480,
    timeToComplete: '45 min',
    effort: 'High',
    impact: 'High',
    scoreImpact: 0,
    steps: [
      'Check current loan balance and rate',
      'Get quotes from 3-5 lenders',
      'Compare total costs including fees',
      'Submit application with best offer'
    ],
    requiredInputs: ['Vehicle information', 'Current loan details', 'Income verification']
  },
  {
    id: '5',
    name: 'Dispute incorrect address',
    category: 'credit-report',
    description: 'Remove outdated address that may be affecting credit applications',
    estimatedSavings: 0,
    timeToComplete: '20 min',
    effort: 'Medium',
    impact: 'Low',
    scoreImpact: 5,
    steps: [
      'Gather documentation of current address',
      'File dispute online with each bureau',
      'Upload supporting documents',
      'Monitor dispute status for 30 days'
    ],
    requiredInputs: ['Proof of current address', 'Bureau account access']
  },
  {
    id: '6',
    name: 'Freeze credit for security',
    category: 'security',
    description: 'Prevent unauthorized new account openings',
    estimatedSavings: 0,
    timeToComplete: '3 min',
    effort: 'Low',
    impact: 'Medium',
    scoreImpact: 0,
    steps: [
      'Visit each bureau website',
      'Create account if needed',
      'Request security freeze',
      'Save PIN/password for future unfreezing'
    ],
    requiredInputs: ['Personal information', 'Email address']
  }
];

export function ParsingScreen({ onNavigate, state, updateState }: ParsingScreenProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parseFiles = async () => {
      // Simulate file parsing with realistic timing
      for (let i = 0; i <= PARSING_STAGES.length; i++) {
        if (i < PARSING_STAGES.length) {
          setCurrentStage(i);
        }
        
        // Update progress over time for each stage
        const stageProgress = (i / PARSING_STAGES.length) * 100;
        let localProgress = 0;
        
        while (localProgress <= 100) {
          setProgress(stageProgress + (localProgress / PARSING_STAGES.length));
          await new Promise(resolve => setTimeout(resolve, 50));
          localProgress += Math.random() * 10;
        }
      }

      // Check for potential errors (simulate edge cases)
      const hasPasswordProtectedFile = state.files.some(f => f.name.includes('password'));
      const hasUnreadableFile = state.files.some(f => f.size < 1000); // Very small files
      
      if (hasPasswordProtectedFile) {
        setError('Password-protected file detected. Please upload an unlocked version.');
        return;
      }
      
      if (hasUnreadableFile) {
        setError('File appears to be corrupted or unreadable. Please try a different format.');
        return;
      }

      // Success - update state with mock data
      updateState({
        actions: MOCK_ACTIONS,
        creditScore: 720,
        totalDebt: 15420,
        monthlyPayments: 850,
        files: state.files.map(f => ({ ...f, status: 'parsed' as const }))
      });

      // Brief pause before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      onNavigate('results');
    };

    parseFiles();
  }, [state.files, updateState, onNavigate]);

  const handleRetry = () => {
    setError(null);
    setCurrentStage(0);
    setProgress(0);
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