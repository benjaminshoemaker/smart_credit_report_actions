import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowLeft, Download, CheckCircle, Clock, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';
import type { Screen, AppState } from '../../App';

interface HistoryScreenProps {
  onNavigate: (screen: Screen) => void;
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

// Mock history data
const MOCK_HISTORY = [
  {
    id: '1',
    action: 'Set card autopay above minimum',
    status: 'completed',
    completedDate: '2024-01-15',
    estimatedSavings: 300,
    actualSavings: 280,
    scoreImpact: 15,
    actualScoreImpact: 12,
    notes: 'Set up autopay for $75/month on Chase Sapphire. Avoided 2 late fees so far.'
  },
  {
    id: '2',
    action: 'Dispute incorrect address',
    status: 'completed',
    completedDate: '2024-01-08',
    estimatedSavings: 0,
    actualSavings: 0,
    scoreImpact: 5,
    actualScoreImpact: 8,
    notes: 'Successfully removed old address from all three bureaus. Score improved more than expected.'
  },
  {
    id: '3',
    action: 'Negotiate APR on Chase Sapphire',
    status: 'in-progress',
    startedDate: '2024-01-20',
    estimatedSavings: 420,
    scoreImpact: 0,
    notes: 'Called retention department. They offered temporary 6-month rate reduction to 18.99%. Following up in March.'
  },
  {
    id: '4',
    action: 'Balance transfer to 0% intro card',
    status: 'pending',
    estimatedSavings: 610,
    scoreImpact: -5,
    notes: 'Researched cards. Planning to apply for Citi Simplicity next week.'
  },
  {
    id: '5',
    action: 'Freeze credit for security',
    status: 'failed',
    attemptedDate: '2024-01-12',
    estimatedSavings: 0,
    scoreImpact: 0,
    notes: 'Experian website was down. Need to try again.'
  }
];

const MOCK_TIMELINE = [
  {
    date: '2024-01-20',
    event: 'Started negotiating APR on Chase Sapphire',
    type: 'action-started'
  },
  {
    date: '2024-01-15',
    event: 'Completed autopay setup - avoiding late fees',
    type: 'action-completed',
    impact: '$280 annual savings'
  },
  {
    date: '2024-01-12',
    event: 'Credit freeze attempt failed - will retry',
    type: 'action-failed'
  },
  {
    date: '2024-01-08',
    event: 'Address dispute resolved - score +8 points',
    type: 'action-completed',
    impact: '+8 credit score points'
  },
  {
    date: '2024-01-05',
    event: 'Initial credit report analysis completed',
    type: 'analysis'
  }
];

export function HistoryScreen({ onNavigate, state, updateState }: HistoryScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in-progress':
        return <Clock className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredHistory = MOCK_HISTORY.filter(item => {
    if (selectedFilter === 'all') return true;
    return item.status === selectedFilter;
  });

  const totalSavings = MOCK_HISTORY
    .filter(item => item.status === 'completed')
    .reduce((sum, item) => sum + (item.actualSavings || 0), 0);

  const totalScoreImpact = MOCK_HISTORY
    .filter(item => item.status === 'completed')
    .reduce((sum, item) => sum + (item.actualScoreImpact || 0), 0);

  const handleExport = (format: 'pdf' | 'csv') => {
    // Mock export functionality
    const blob = new Blob([`Export data in ${format.toUpperCase()} format`], {
      type: format === 'pdf' ? 'application/pdf' : 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-action-history.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate('results')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Results
              </Button>
              <div>
                <h1 className="text-lg">Action History & Progress</h1>
                <p className="text-sm text-muted-foreground">
                  Track your completed actions and their outcomes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport('csv')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport('pdf')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-semibold text-green-600">
                    ${totalSavings}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Savings Realized</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-semibold text-blue-600">
                    +{totalScoreImpact}
                  </p>
                  <p className="text-sm text-muted-foreground">Credit Score Improvement</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-semibold">
                    {MOCK_HISTORY.filter(item => item.status === 'completed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Actions Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="actions" className="w-full">
          <TabsList>
            <TabsTrigger value="actions">Action Status</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          
          <TabsContent value="actions" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Action Status</CardTitle>
                  <div className="flex gap-2">
                    {['all', 'completed', 'in-progress', 'pending', 'failed'].map(filter => (
                      <Button
                        key={filter}
                        variant={selectedFilter === filter ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedFilter(filter)}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredHistory.map(item => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{item.action}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusIcon(item.status)}
                              <span className="ml-1 capitalize">
                                {item.status.replace('-', ' ')}
                              </span>
                            </Badge>
                            {item.completedDate && (
                              <span className="text-sm text-muted-foreground">
                                Completed {new Date(item.completedDate).toLocaleDateString()}
                              </span>
                            )}
                            {item.startedDate && !item.completedDate && (
                              <span className="text-sm text-muted-foreground">
                                Started {new Date(item.startedDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        </div>
                        
                        <div className="text-right ml-4">
                          {item.status === 'completed' && (
                            <div className="space-y-1">
                              {item.actualSavings > 0 && (
                                <p className="text-sm text-green-600 font-medium">
                                  ${item.actualSavings} saved
                                </p>
                              )}
                              {item.actualScoreImpact && item.actualScoreImpact !== 0 && (
                                <p className="text-sm text-blue-600 font-medium">
                                  +{item.actualScoreImpact} score pts
                                </p>
                              )}
                            </div>
                          )}
                          {item.status !== 'completed' && (
                            <div className="space-y-1">
                              {item.estimatedSavings > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Est. ${item.estimatedSavings}/yr
                                </p>
                              )}
                              {item.scoreImpact && item.scoreImpact !== 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Est. {item.scoreImpact > 0 ? '+' : ''}{item.scoreImpact} pts
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_TIMELINE.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          item.type === 'action-completed' ? 'bg-green-500' :
                          item.type === 'action-started' ? 'bg-blue-500' :
                          item.type === 'action-failed' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        {index < MOCK_TIMELINE.length - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{item.event}</p>
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                        </div>
                        {item.impact && (
                          <p className="text-sm text-green-600 mt-1">{item.impact}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}