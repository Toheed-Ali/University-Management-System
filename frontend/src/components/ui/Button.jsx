import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

const Button = forwardRef(({
    className,
    variant = 'primary',
    size = 'default',
    isLoading = false,
    disabled,
    children,
    ...props
}, ref) => {

    const variants = {
        primary: 'bg-primary hover:bg-primary-hover text-white shadow-sm',
        secondary: 'bg-white dark:bg-dark-card text-gray-900 dark:text-white border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800',
        danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
        ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
        link: 'text-primary underline-offset-4 hover:underline'
    };

    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10 p-2'
    };

    return (
        <button
            ref={ref}
            disabled={disabled || isLoading}
            className={twMerge(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
});

Button.displayName = "Button";

export { Button };
