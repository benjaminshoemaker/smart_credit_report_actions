import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronRight, DollarSign, Clock, Zap } from 'lucide-react';
import type { CreditAction } from '../../App';

interface ActionCardProps {
  action: CreditAction;
  onClick: () => void;
  showButton?: boolean;
}

export function ActionCard({ action, onClick, showButton = true }: ActionCardProps) {
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
    if (savings === 0) return 'No direct savings';
    if (savings >= 1000) return `$${(savings / 1000).toFixed(1)}k/yr`;
    return `$${savings}/yr`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium truncate">{action.name}</h3>
              <div className="flex gap-1 flex-shrink-0">
                <Badge variant="outline" className={`text-xs ${getImpactColor(action.impact)}`}>
                  {action.impact} impact
                </Badge>
                <Badge variant="outline" className={`text-xs ${getEffortColor(action.effort)}`}>
                  {action.effort} effort
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {action.description}
            </p>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-600">
                  {formatSavings(action.estimatedSavings)}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{action.timeToComplete}</span>
              </div>
              
              {action.scoreImpact && action.scoreImpact !== 0 && (
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600">
                    {action.scoreImpact > 0 ? '+' : ''}{action.scoreImpact} pts
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {showButton && (
            <Button variant="ghost" size="sm" className="ml-2 flex-shrink-0">
              View Steps
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}