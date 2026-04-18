// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      let errorMessage = "Something went wrong.";
      let details = "";

      try {
        // Check if the error message is a JSON string from handleFirestoreError
        const parsedError = JSON.parse(error?.message || "");
        if (parsedError.error && parsedError.operationType) {
          errorMessage = `Database Error: ${parsedError.operationType.toUpperCase()} failed.`;
          details = parsedError.error;
        }
      } catch (e) {
        // Not a JSON error, use the standard error message
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-stone-900 p-8 rounded-3xl shadow-2xl border border-red-500/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900 dark:text-white">Application Error</h1>
                <p className="text-stone-500 dark:text-stone-400 text-sm">We ran into an unexpected problem.</p>
              </div>
            </div>
            
            <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl mb-6 border border-stone-200 dark:border-stone-700">
              <p className="text-stone-800 dark:text-stone-200 font-medium mb-1">{errorMessage}</p>
              {details && <p className="text-stone-500 dark:text-stone-400 text-xs font-mono break-all">{details}</p>}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-afl-navy text-white rounded-2xl font-bold hover:bg-afl-navy/90 transition-all shadow-lg shadow-afl-navy/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
