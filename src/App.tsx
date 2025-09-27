import React, { useState } from 'react';
import { LandingScreen } from './components/screens/LandingScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { UploadScreen } from './components/screens/UploadScreen';
import { ParsingScreen } from './components/screens/ParsingScreen';
import { ResultsScreen } from './components/screens/ResultsScreen';
import { ActionDetailScreen } from './components/screens/ActionDetailScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { Toaster } from './components/ui/sonner';

export type Screen = 'landing' | 'auth' | 'upload' | 'parsing' | 'results' | 'action-detail' | 'history' | 'settings';

export interface CreditFile {
  id: string;
  name: string;
  size: number;
  type: string;
  bureau?: string;
  status: 'uploaded' | 'parsing' | 'parsed' | 'error';
}

export interface CreditAction {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedSavings: number;
  timeToComplete: string;
  effort: 'Low' | 'Medium' | 'High';
  impact: 'High' | 'Medium' | 'Low';
  scoreImpact?: number;
  steps: string[];
  requiredInputs: string[];
}

export interface AppState {
  currentScreen: Screen;
  isAuthenticated: boolean;
  email: string;
  files: CreditFile[];
  actions: CreditAction[];
  completedActions: string[];
  selectedAction: CreditAction | null;
  creditScore: number;
  totalDebt: number;
  monthlyPayments: number;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    currentScreen: 'landing',
    isAuthenticated: false,
    email: '',
    files: [],
    actions: [],
    completedActions: [],
    selectedAction: null,
    creditScore: 0,
    totalDebt: 0,
    monthlyPayments: 0,
  });

  const navigateTo = (screen: Screen) => {
    setState(prev => ({ ...prev, currentScreen: screen }));
  };

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'landing':
        return <LandingScreen onNavigate={navigateTo} />;
      case 'auth':
        return <AuthScreen onNavigate={navigateTo} onAuth={updateState} />;
      case 'upload':
        return <UploadScreen onNavigate={navigateTo} state={state} updateState={updateState} />;
      case 'parsing':
        return <ParsingScreen onNavigate={navigateTo} state={state} updateState={updateState} />;
      case 'results':
        return <ResultsScreen onNavigate={navigateTo} state={state} updateState={updateState} />;
      case 'action-detail':
        return <ActionDetailScreen onNavigate={navigateTo} state={state} updateState={updateState} />;
      case 'history':
        return <HistoryScreen onNavigate={navigateTo} state={state} updateState={updateState} />;
      case 'settings':
        return <SettingsScreen onNavigate={navigateTo} state={state} updateState={updateState} />;
      default:
        return <LandingScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderScreen()}
      <Toaster />
    </div>
  );
}