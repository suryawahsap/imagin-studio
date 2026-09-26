// ErrorBoundary — extracted dari imagin_studio.tsx line 8908–8939.
// Catches rendering errors in Studio App and shows fallback UI.

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: any, reset: () => void) => React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const errorMessage =
        typeof this.state.error === "string"
          ? this.state.error
          : typeof this.state.error?.message === "string"
          ? this.state.error.message
          : "Unknown error";
      return (
        <div className="min-h-full flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-structural)] shadow-xl space-y-4">
            <h1 className="text-base font-bold text-[var(--accent-error)]">Something went wrong</h1>
            <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed bg-[var(--bg-void)] p-3 rounded-lg border border-[var(--border-structural)] break-all">{errorMessage}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-5 py-2.5 bg-[var(--accent-indigo-solid)] text-white text-xs font-bold rounded-xl hover:brightness-110 shadow transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
