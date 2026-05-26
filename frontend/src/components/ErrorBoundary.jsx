import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-bg p-6 text-center">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-6">
                        <AlertTriangle className="h-12 w-12 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                        An unexpected error has occurred. Our team has been notified.
                        Please try refreshing the page.
                    </p>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Refresh Page
                        </Button>
                        <Button onClick={() => window.history.back()}>
                            Go Back
                        </Button>
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-10 p-4 bg-gray-100 dark:bg-gray-800 rounded text-left w-full max-w-2xl overflow-auto text-sm font-mono text-red-600">
                            {this.state.error?.toString()}
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
