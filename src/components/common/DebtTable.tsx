import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface Debt {
  id: string;
  issuer: string;
  balance: number;
  apr: number;
  limit: number | null;
  utilization: number | null;
  type: string;
}

interface DebtTableProps {
  debts: Debt[];
}

export function DebtTable({ debts }: DebtTableProps) {
  const getUtilizationColor = (utilization: number | null) => {
    if (!utilization) return 'text-muted-foreground';
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 70) return 'text-orange-600';
    if (utilization >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getAprColor = (apr: number, type: string) => {
    if (type === 'Credit Card') {
      if (apr >= 25) return 'text-red-600';
      if (apr >= 20) return 'text-orange-600';
      if (apr >= 15) return 'text-yellow-600';
      return 'text-green-600';
    }
    // For loans
    if (apr >= 10) return 'text-red-600';
    if (apr >= 7) return 'text-orange-600';
    if (apr >= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debts & Interest Rates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Mobile-first responsive design */}
          <div className="block md:hidden space-y-4">
            {debts.map(debt => (
              <Card key={debt.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{debt.issuer}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {debt.type}
                      </Badge>
                    </div>
                    <p className="text-right">
                      <span className="font-medium">${debt.balance.toLocaleString()}</span>
                      <br />
                      <span className={`text-sm ${getAprColor(debt.apr, debt.type)}`}>
                        {debt.apr}% APR
                      </span>
                    </p>
                  </div>
                  
                  {debt.utilization !== null && debt.limit && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Utilization</span>
                        <span className={getUtilizationColor(debt.utilization)}>
                          {debt.utilization}%
                        </span>
                      </div>
                      <Progress value={debt.utilization} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        ${debt.balance.toLocaleString()} of ${debt.limit.toLocaleString()} limit
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Issuer</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Balance</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">APR</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Limit</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map(debt => (
                    <tr key={debt.id} className="border-b last:border-b-0">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{debt.issuer}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {debt.type}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="font-medium">${debt.balance.toLocaleString()}</span>
                      </td>
                      <td className="py-3">
                        <span className={getAprColor(debt.apr, debt.type)}>
                          {debt.apr}%
                        </span>
                      </td>
                      <td className="py-3">
                        {debt.limit ? (
                          <span>${debt.limit.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="py-3">
                        {debt.utilization !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16">
                              <Progress value={debt.utilization} className="h-2" />
                            </div>
                            <span className={`text-sm ${getUtilizationColor(debt.utilization)}`}>
                              {debt.utilization}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}