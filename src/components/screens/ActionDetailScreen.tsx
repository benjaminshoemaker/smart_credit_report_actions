import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ArrowLeft, DollarSign, Clock, Zap, CheckCircle, Calendar, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { Screen, AppState } from '../../App';

interface ActionDetailScreenProps {
  onNavigate: (screen: Screen) => void;
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

export function ActionDetailScreen({ onNavigate, state, updateState }: ActionDetailScreenProps) {
  const [checkedInputs, setCheckedInputs] = useState<string[]>([]);
  const [showPoaModal, setShowPoaModal] = useState(false);

  const action = state.selectedAction;

  if (!action) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No action selected</p>
          <Button onClick={() => onNavigate('results')}>
            Back to Results
          </Button>
        </div>
      </div>
    );
  }

  const handleInputCheck = (input: string, checked: boolean) => {
    if (checked) {
      setCheckedInputs(prev => [...prev, input]);
    } else {
      setCheckedInputs(prev => prev.filter(i => i !== input));
    }
  };

  const allInputsChecked = action.requiredInputs.length === checkedInputs.length;

  const handleMarkDone = () => {
    updateState({
      completedActions: [...state.completedActions, action.id]
    });
    toast.success(`${action.name} marked as complete!`);
    onNavigate('results');
  };

  const handleSchedule = () => {
    toast.info('Reminder set for this action');
    onNavigate('results');
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatSavings = (savings: number) => {
    if (savings === 0) return 'Security/Credit benefit';
    return `$${savings.toLocaleString()}/year`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
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
              <h1 className="text-lg">{action.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${getImpactColor(action.impact)}`}>
                  {action.impact} impact
                </Badge>
                <Badge variant="outline" className={`text-xs ${getEffortColor(action.effort)}`}>
                  {action.effort} effort
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem & Solution */}
            <Card>
              <CardHeader>
                <CardTitle>What's the Problem?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {action.description}
                </p>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Our Recommendation</h4>
                  <p className="text-blue-800 text-sm">
                    {action.category === 'credit-cards' && 'Focus on reducing high-interest debt to improve your cash flow and credit utilization.'}
                    {action.category === 'loans' && 'Refinancing at a lower rate can significantly reduce your monthly payments and total interest paid.'}
                    {action.category === 'credit-report' && 'Cleaning up your credit report can help improve your score and prevent future issues.'}
                    {action.category === 'security' && 'Protecting your credit from unauthorized access is crucial for maintaining good credit health.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {action.steps.map((step, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-sm pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>

                {action.category === 'credit-cards' && action.name.includes('Balance transfer') && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-800 font-medium">Important Note</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Balance transfers may temporarily lower your credit score. Consider the timing if you're planning other credit applications.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Required Inputs */}
            <Card>
              <CardHeader>
                <CardTitle>What You'll Need</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {action.requiredInputs.map((input, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Checkbox
                        id={`input-${index}`}
                        checked={checkedInputs.includes(input)}
                        onCheckedChange={(checked) => handleInputCheck(input, !!checked)}
                      />
                      <label htmlFor={`input-${index}`} className="text-sm cursor-pointer">
                        {input}
                      </label>
                    </div>
                  ))}
                </div>
                
                {!allInputsChecked && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Check off items as you gather them to enable the "Do it now" option.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Impact Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expected Outcome</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-600">
                      {formatSavings(action.estimatedSavings)}
                    </p>
                    <p className="text-xs text-muted-foreground">Estimated savings</p>
                  </div>
                </div>
                
                {action.scoreImpact && action.scoreImpact !== 0 && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-600">
                        {action.scoreImpact > 0 ? '+' : ''}{action.scoreImpact} points
                      </p>
                      <p className="text-xs text-muted-foreground">Credit score impact</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{action.timeToComplete}</p>
                    <p className="text-xs text-muted-foreground">Time to complete</p>
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <p>
                    <strong>Assumptions:</strong> Based on current market rates and your credit profile. 
                    Actual results may vary.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Take Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog open={showPoaModal} onOpenChange={setShowPoaModal}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      disabled={!allInputsChecked}
                    >
                      Do It Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Limited Power of Attorney</DialogTitle>
                      <DialogDescription>
                        To help you complete this action, we may need to act on your behalf with financial institutions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm">
                          <strong>Placeholder consent text:</strong> I authorize Next Best Action to contact my creditors 
                          and act on my behalf to negotiate rates, request account changes, and other actions related to 
                          improving my financial situation. This authorization is limited to the specific action I have selected.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowPoaModal(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowPoaModal(false);
                            toast.success('Action initiated! We\'ll handle this for you.');
                            onNavigate('results');
                          }}
                          className="flex-1"
                        >
                          I Agree
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleSchedule}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Reminder
                </Button>

                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={handleMarkDone}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Done
                </Button>
              </CardContent>
            </Card>

            {/* Resources */}
            {action.category === 'credit-cards' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Helpful Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a 
                    href="#" 
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Credit card rate negotiation tips
                  </a>
                  <a 
                    href="#" 
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Balance transfer calculator
                  </a>
                  <a 
                    href="#" 
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Consumer protection rights
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}