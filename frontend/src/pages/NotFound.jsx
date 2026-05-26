import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FileQuestion } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-bg p-6 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-6">
                <FileQuestion className="h-12 w-12 text-gray-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Page Not Found</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <Link to="/">
                <Button>Go Home</Button>
            </Link>
        </div>
    );
};

export default NotFound;
