import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Srishti UI ErrorBoundary:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0B0D12] text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold">Something interrupted Srishti</h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {this.state.message}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 transition whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                Try recovering view
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
