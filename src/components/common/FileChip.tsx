import React from 'react';
import { Badge } from '../ui/badge';
import { X, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { CreditFile } from '../../App';

interface FileChipProps {
  file: CreditFile;
  onRemove?: () => void;
}

export function FileChip({ file, onRemove }: FileChipProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case 'uploaded':
        return <FileText className="w-4 h-4" />;
      case 'parsing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'parsed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'parsed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-destructive/10 border-destructive/20';
      case 'parsing':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusColor()}`}>
      {getStatusIcon()}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{file.name}</p>
          {file.bureau && (
            <Badge variant="secondary" className="text-xs">
              {file.bureau}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
          {file.status === 'parsing' && ' • Processing...'}
          {file.status === 'parsed' && ' • Ready'}
          {file.status === 'error' && ' • Error'}
        </p>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 hover:bg-background rounded transition-colors"
          aria-label="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}