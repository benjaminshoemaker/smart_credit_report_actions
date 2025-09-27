import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { ArrowLeft, Upload, FileText, X, AlertCircle } from 'lucide-react';
import { FileChip } from '../common/FileChip';
import type { Screen, AppState, CreditFile } from '../../App';

interface UploadScreenProps {
  onNavigate: (screen: Screen) => void;
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

export function UploadScreen({ onNavigate, state, updateState }: UploadScreenProps) {
  const [dragActive, setDragActive] = useState(false);
  const [consents, setConsents] = useState({
    parseReport: false,
    analyzeAccounts: false,
    generateRecommendations: false,
  });

  const allConsentsChecked = Object.values(consents).every(Boolean);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const newFiles: CreditFile[] = files.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      name: file.name,
      size: file.size,
      type: file.type,
      bureau: detectBureau(file.name),
      status: 'uploaded' as const,
    }));

    updateState({ files: [...state.files, ...newFiles] });
  };

  const detectBureau = (filename: string): string | undefined => {
    const name = filename.toLowerCase();
    if (name.includes('experian')) return 'Experian';
    if (name.includes('equifax')) return 'Equifax';
    if (name.includes('transunion')) return 'TransUnion';
    return undefined;
  };

  const removeFile = (fileId: string) => {
    updateState({
      files: state.files.filter(file => file.id !== fileId)
    });
  };

  const handleContinue = () => {
    if (state.files.length > 0 && allConsentsChecked) {
      onNavigate('parsing');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNavigate('landing')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl mb-1">Upload Your Credit Report</h1>
            <p className="text-muted-foreground">
              We'll analyze your report and create personalized recommendations
            </p>
          </div>
        </div>

        {/* Consent Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="parse"
                checked={consents.parseReport}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, parseReport: !!checked }))
                }
              />
              <div className="space-y-1">
                <label htmlFor="parse" className="text-sm cursor-pointer">
                  Parse and extract data from my credit report
                </label>
                <p className="text-xs text-muted-foreground">
                  We'll read your report to identify accounts, balances, and payment history
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="analyze"
                checked={consents.analyzeAccounts}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, analyzeAccounts: !!checked }))
                }
              />
              <div className="space-y-1">
                <label htmlFor="analyze" className="text-sm cursor-pointer">
                  Analyze my accounts and financial situation
                </label>
                <p className="text-xs text-muted-foreground">
                  Calculate utilization, identify high-rate debt, and spot credit issues
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="recommend"
                checked={consents.generateRecommendations}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, generateRecommendations: !!checked }))
                }
              />
              <div className="space-y-1">
                <label htmlFor="recommend" className="text-sm cursor-pointer">
                  Generate personalized recommendations
                </label>
                <p className="text-xs text-muted-foreground">
                  Create action items tailored to your credit profile and financial goals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="mb-2">
                Drop your credit report files here, or{' '}
                <label className="text-primary cursor-pointer underline">
                  browse
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.html,.htm"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-muted-foreground">
                PDF or HTML files, up to 25 MB each
              </p>
            </div>

            {/* File List */}
            {state.files.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-medium">Uploaded Files</h4>
                {state.files.map(file => (
                  <FileChip
                    key={file.id}
                    file={file}
                    onRemove={() => removeFile(file.id)}
                  />
                ))}
              </div>
            )}

            {/* Error States */}
            {state.files.some(f => f.status === 'error') && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm text-destructive font-medium">
                    Some files couldn't be processed
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    Please check that your files are valid credit reports and try again.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={state.files.length === 0 || !allConsentsChecked}
            size="lg"
          >
            Continue to Analysis
          </Button>
        </div>
      </div>
    </div>
  );
}