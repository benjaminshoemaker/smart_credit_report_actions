import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ArrowLeft, Shield, Trash2, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { Screen, AppState } from '../../App';

interface SettingsScreenProps {
  onNavigate: (screen: Screen) => void;
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

export function SettingsScreen({ onNavigate, state, updateState }: SettingsScreenProps) {
  const [localProcessing, setLocalProcessing] = useState(true);
  const [dataRetention, setDataRetention] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [privacyPolicy, setPrivacyPolicy] = useState(`
PRIVACY POLICY (Placeholder)

Last updated: [Date]

This Privacy Policy describes how Next Best Action ("we," "our," or "us") collects, uses, and protects your information when you use our service.

INFORMATION WE COLLECT
• Credit report data you upload
• Account information and analysis results
• Usage data and preferences

HOW WE USE YOUR INFORMATION
• To analyze your credit report and generate recommendations
• To provide personalized financial guidance
• To improve our service

DATA PROTECTION
• All data is encrypted in transit and at rest
• We do not sell your personal information
• You can request deletion of your data at any time

CONTACT US
For questions about this Privacy Policy, contact us at privacy@nextbestaction.com
  `.trim());

  const [termsOfService, setTermsOfService] = useState(`
TERMS OF SERVICE (Placeholder)

Last updated: [Date]

Welcome to Next Best Action. By using our service, you agree to these terms.

SERVICE DESCRIPTION
Next Best Action analyzes credit reports and provides financial recommendations. This service is for informational purposes only and does not constitute financial advice.

USER RESPONSIBILITIES
• Provide accurate information
• Maintain the security of your account
• Use the service lawfully

DISCLAIMERS
• Recommendations are estimates based on general principles
• Actual results may vary
• We are not responsible for actions taken based on our recommendations

LIMITATION OF LIABILITY
Our liability is limited to the amount you paid for the service.

CONTACT US
For questions about these Terms, contact us at legal@nextbestaction.com
  `.trim());

  const [disclosures, setDisclosures] = useState(`
FINANCIAL DISCLOSURES (Placeholder)

GENERAL DISCLAIMER
The recommendations provided by Next Best Action are for informational purposes only and should not be considered as financial, legal, or professional advice. Always consult with qualified professionals before making financial decisions.

ACCURACY OF INFORMATION
While we strive to provide accurate recommendations, we cannot guarantee specific results. Credit scores, interest rates, and financial outcomes may vary based on numerous factors.

AFFILIATE RELATIONSHIPS
We may receive compensation from financial institutions when you are approved for products through our recommendations. This does not affect our analysis or recommendations.

REGULATORY COMPLIANCE
Next Best Action is not a registered investment advisor, credit repair organization, or financial institution. We provide educational content and analysis tools only.

LIMITATION OF LIABILITY
Your use of our service is at your own risk. We are not liable for any financial losses or damages resulting from the use of our recommendations.

Last updated: [Date]
  `.trim());

  const handleDataRetentionToggle = (enabled: boolean) => {
    setDataRetention(enabled);
    toast.info(enabled ? 'Data retention enabled' : 'Data will be deleted after session');
  };

  const handleLocalProcessingToggle = (enabled: boolean) => {
    setLocalProcessing(enabled);
    toast.info(enabled ? 'Processing will happen locally' : 'Processing will use cloud services');
  };

  const handleDeleteData = () => {
    if (deleteConfirmText.toLowerCase() === 'delete my data') {
      // Reset app state
      updateState({
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
      
      toast.success('All data has been deleted');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      onNavigate('landing');
    } else {
      toast.error('Please type "delete my data" to confirm');
    }
  };

  const handleExportData = () => {
    const exportData = {
      files: state.files.map(f => ({ name: f.name, size: f.size, bureau: f.bureau })),
      actions: state.actions,
      completedActions: state.completedActions,
      creditScore: state.creditScore,
      totalDebt: state.totalDebt,
      monthlyPayments: state.monthlyPayments,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'next-best-action-data.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully');
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
              <h1 className="text-lg">Settings & Privacy</h1>
              <p className="text-sm text-muted-foreground">
                Manage your data and privacy preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Data Processing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Data Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Local Processing Only</p>
                <p className="text-sm text-muted-foreground">
                  Process credit reports on your device instead of our servers
                </p>
              </div>
              <Switch 
                checked={localProcessing}
                onCheckedChange={handleLocalProcessingToggle}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Data Retention</p>
                <p className="text-sm text-muted-foreground">
                  Keep your analysis results for future reference
                </p>
              </div>
              <Switch 
                checked={dataRetention}
                onCheckedChange={handleDataRetentionToggle}
              />
            </div>

            {!dataRetention && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  With data retention disabled, your analysis will be deleted when you close the app.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-muted-foreground">
                  Download a copy of your analysis and recommendations
                </p>
              </div>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete All Data</p>
                <p className="text-sm text-muted-foreground">
                  Permanently remove all your data from our systems
                </p>
              </div>
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Delete All Data
                    </DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. All your credit analysis, recommendations, 
                      and history will be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="confirm-delete" className="block text-sm font-medium mb-2">
                        Type "delete my data" to confirm:
                      </label>
                      <input
                        id="confirm-delete"
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        placeholder="delete my data"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={handleDeleteData}
                        className="flex-1"
                        disabled={deleteConfirmText.toLowerCase() !== 'delete my data'}
                      >
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Legal Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Editable placeholder content - replace with actual privacy policy
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Editable placeholder content - replace with actual terms of service
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={termsOfService}
              onChange={(e) => setTermsOfService(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Disclosures</CardTitle>
            <p className="text-sm text-muted-foreground">
              Editable placeholder content - replace with actual disclosures
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={disclosures}
              onChange={(e) => setDisclosures(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />
          </CardContent>
        </Card>

        {/* Account Information */}
        {state.isAuthenticated && (
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{state.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Type:</span>
                <span>Authenticated User</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reports Analyzed:</span>
                <span>{state.files.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actions Completed:</span>
                <span>{state.completedActions.length}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}