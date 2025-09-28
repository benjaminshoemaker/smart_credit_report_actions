export type ImpactLevel = 'high' | 'medium' | 'low';

export interface Account {
  issuer: string;
  balance: number;
  creditLimit: number;
  perCardUtilization: number; // 0..1
}

export interface Totals {
  overallUtilization: number; // 0..1
  totalBalances: number;
  totalLimits: number;
}

export interface AnalysisAction {
  id: string;
  title: string;
  rationale: string;
  impact: ImpactLevel;
  estSavingsMonthly: number;
  steps: string[];
}

export interface AnalysisResponse {
  accounts: Account[];
  totals: Totals;
  actions: AnalysisAction[];
}

declare global {
  interface Window {
    __nbaFile?: File;
  }
}

export {};

