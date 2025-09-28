import React, { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Menu, Settings, DollarSign, TrendingUp, AlertTriangle, Filter, ArrowUpRight } from 'lucide-react';
import { SummaryCard } from '../common/SummaryCard';
import { ActionCard } from '../common/ActionCard';
import { DebtTable } from '../common/DebtTable';
import type { Screen, AppState, CreditAction } from '../../App';
import type { AnalysisResponse, Account } from '@/types/credit';
import { currency, percent } from '@/lib/format';

interface ResultsScreenProps {
  onNavigate: (screen: Screen) => void;
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const MOCK_DEBTS = [
  {
    id: '1',
    issuer: 'Chase Sapphire',
    balance: 7328,
    apr: 27.99,
    limit: 15000,
    utilization: 49,
    type: 'Credit Card'
  },
  {
    id: '2',
    issuer: 'Capital One Venture',
    balance: 3240,
    apr: 24.49,
    limit: 8000,
    utilization: 41,
    type: 'Credit Card'
  },
  {
    id: '3',
    issuer: 'Wells Fargo Auto',
    balance: 18500,
    apr: 6.25,
    limit: null,
    utilization: null,
    type: 'Auto Loan'
  },
  {
    id: '4',
    issuer: 'Discover It',
    balance: 850,
    apr: 22.99,
    limit: 5000,
    utilization: 17,
    type: 'Credit Card'
  }
];

const MOCK_INQUIRIES = [
  { date: '2024-01-15', creditor: 'Chase Bank', type: 'Credit Card' },
  { date: '2023-11-08', creditor: 'Wells Fargo', type: 'Auto Loan' },
  { date: '2023-09-22', creditor: 'Capital One', type: 'Credit Card' }
];

export function ResultsScreen({ onNavigate, state, updateState }: ResultsScreenProps) {
  const [filterGoal, setFilterGoal] = useState<string>('all');
  const [filterEffort, setFilterEffort] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('savings');

  const analysis: AnalysisResponse | undefined = state.analysis;

  // Map server-provided actions (if analysis exists) to UI CreditAction shape
  const actionsForDisplay: CreditAction[] = useMemo(() => {
    if (analysis?.actions?.length) {
      return (analysis.actions as any[]).map((a: any) => ({
        id: String(a.id ?? a.title ?? Math.random().toString(36).slice(2)),
        name: a.title || 'Recommended action',
        category: 'analysis',
        description: a.rationale || '',
        estimatedSavings: Math.max(0, Math.round((a.estSavingsMonthly || 0) * 12)),
        timeToComplete: '10 min',
        effort: 'Medium',
        impact: String(a.impact || 'medium').toLowerCase() === 'high'
          ? 'High'
          : String(a.impact || 'medium').toLowerCase() === 'low'
          ? 'Low'
          : 'Medium',
        scoreImpact: 0,
        steps: Array.isArray(a.steps) ? a.steps : [],
        requiredInputs: [],
      }));
    }
    return state.actions;
  }, [analysis, state.actions]);

  const totalMonthlySavings = actionsForDisplay.reduce((sum, action) => sum + (action.estimatedSavings / 12), 0);
  const totalScoreImpact = actionsForDisplay.reduce((sum, action) => sum + (action.scoreImpact || 0), 0);
  const riskFlags = actionsForDisplay.filter(action => action.category === 'security' || action.impact === 'High').length;

  const filteredActions = actionsForDisplay
    .filter(action => {
      if (filterGoal !== 'all') {
        if (filterGoal === 'cash-flow' && action.estimatedSavings === 0) return false;
        if (filterGoal === 'credit-score' && (action.scoreImpact || 0) <= 0) return false;
        if (filterGoal === 'risk' && action.category !== 'security') return false;
      }
      if (filterEffort !== 'all' && action.effort !== filterEffort) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'savings') return b.estimatedSavings - a.estimatedSavings;
      if (sortBy === 'effort') {
        const effortOrder = { Low: 3, Medium: 2, High: 1 };
        return effortOrder[b.effort] - effortOrder[a.effort];
      }
      if (sortBy === 'impact') {
        const impactOrder = { High: 3, Medium: 2, Low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      }
      return 0;
    });

  const handleActionClick = (action: CreditAction) => {
    updateState({ selectedAction: action });
    onNavigate('action-detail');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Menu className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg">Credit Analysis Results</h1>
                <p className="text-sm text-muted-foreground">
                  {state.files.length} report{state.files.length !== 1 ? 's' : ''} analyzed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onNavigate('history')}
              >
                History
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate('settings')}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {analysis?.totals ? (
            <>
              <SummaryCard
                title="Overall Utilization"
                value={percent(analysis.totals.overallUtilization || 0, 0)}
                subtitle="Across revolving accounts"
                icon={TrendingUp}
                trend={(analysis.totals.overallUtilization || 0) > 0.3 ? 'down' : 'up'}
              />
              <SummaryCard
                title="Total Balances"
                value={currency(Math.round(analysis.totals.totalBalances || 0))}
                subtitle="Sum of balances"
                icon={DollarSign}
                trend="neutral"
              />
              <SummaryCard
                title="Total Limits"
                value={currency(Math.round(analysis.totals.totalLimits || 0))}
                subtitle="Sum of credit limits"
                icon={DollarSign}
                trend="neutral"
              />
            </>
          ) : (
            <>
              <SummaryCard
                title="Est. Monthly Cash Impact"
                value={`$${Math.round(totalMonthlySavings)}`}
                subtitle="From recommended actions"
                icon={DollarSign}
                trend="up"
              />
              <SummaryCard
                title="Est. Score Impact"
                value={`+${totalScoreImpact}`}
                subtitle="Points over 3-6 months"
                icon={TrendingUp}
                trend="up"
              />
              <SummaryCard
                title="Risk Flags"
                value={riskFlags.toString()}
                subtitle="High-priority security items"
                icon={AlertTriangle}
                trend={riskFlags > 2 ? 'down' : 'neutral'}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Best Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Next Best Actions</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={filterGoal} onValueChange={setFilterGoal}>
                      <SelectTrigger className="w-36">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Goals</SelectItem>
                        <SelectItem value="cash-flow">Cash Flow</SelectItem>
                        <SelectItem value="credit-score">Credit Score</SelectItem>
                        <SelectItem value="risk">Risk</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterEffort} onValueChange={setFilterEffort}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Effort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Effort</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">By Savings</SelectItem>
                        <SelectItem value="effort">By Effort</SelectItem>
                        <SelectItem value="impact">By Impact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredActions.map(action => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onClick={() => handleActionClick(action)}
                  />
                ))}
                {filteredActions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No actions match your current filters.</p>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setFilterGoal('all');
                        setFilterEffort('all');
                      }}
                      className="mt-2"
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Credit Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Credit Score</span>
                  <span className="font-medium">{state.creditScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Debt</span>
                  <span className="font-medium">${state.totalDebt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Payments</span>
                  <span className="font-medium">${state.monthlyPayments}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Inquiries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Inquiries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_INQUIRIES.map((inquiry, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{inquiry.creditor}</p>
                        <p className="text-xs text-muted-foreground">{inquiry.type}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(inquiry.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Tables */}
        <div className="mt-8">
          {analysis?.accounts ? (
            <Card>
              <CardHeader>
                <CardTitle>Revolving Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">Issuer</th>
                        <th className="py-2 pr-4">Balance</th>
                        <th className="py-2 pr-4">Limit</th>
                        <th className="py-2 pr-4">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.accounts.map((a: Account, idx: number) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2 pr-4">{a.issuer || 'Unknown'}</td>
                          <td className="py-2 pr-4">{currency(a.balance || 0)}</td>
                          <td className="py-2 pr-4">{currency(a.creditLimit || 0)}</td>
                          <td className="py-2 pr-4">{percent(a.perCardUtilization || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="debts" className="w-full">
              <TabsList>
                <TabsTrigger value="debts">Debts & Rates</TabsTrigger>
                <TabsTrigger value="inquiries">Inquiries & Negatives</TabsTrigger>
                <TabsTrigger value="loans">Other Loans</TabsTrigger>
              </TabsList>
              <TabsContent value="debts" className="mt-4">
                <DebtTable debts={MOCK_DEBTS} />
              </TabsContent>
              <TabsContent value="inquiries" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Credit Inquiries & Negative Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {MOCK_INQUIRIES.map((inquiry, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{inquiry.creditor}</p>
                            <p className="text-sm text-muted-foreground">{inquiry.type} inquiry</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{new Date(inquiry.date).toLocaleDateString()}</p>
                            <Badge variant="outline" className="text-xs">Hard Inquiry</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="loans" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Mortgage, Auto & Student Loans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {MOCK_DEBTS.filter(debt => debt.type !== 'Credit Card').map(debt => (
                        <div key={debt.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{debt.issuer}</p>
                            <p className="text-sm text-muted-foreground">{debt.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${debt.balance.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{debt.apr}% APR</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
