import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Don't show breadcrumbs on dashboard root or public pages
    if (pathnames.length === 0 || ['login', ''].includes(pathnames[0])) {
        return null;
    }

    return (
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Link to="/" className="flex items-center hover:text-primary transition-colors">
                <Home className="h-4 w-4" />
            </Link>

            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;

                // Format the label: capitalize and remove hyphens
                const label = value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                return (
                    <div key={to} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-1" />
                        {isLast ? (
                            <span className="font-medium text-gray-900 dark:text-white" aria-current="page">
                                {label}
                            </span>
                        ) : (
                            <Link to={to} className="hover:text-primary transition-colors">
                                {label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};

export default Breadcrumbs;
