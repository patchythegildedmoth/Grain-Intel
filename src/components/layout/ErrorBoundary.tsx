import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Module error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
            {this.props.fallbackMessage ?? 'Something went wrong in this module'}
          </h3>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {this.state.error?.message}
          </p>
          <button
            className="mt-3 px-4 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
