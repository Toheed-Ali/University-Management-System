import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Input = forwardRef(({ className, type, error, ...props }, ref) => {
    return (
        <div className="w-full">
            <input
                type={type}
                className={twMerge(
                    "flex h-10 w-full rounded-md border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100",
                    error && "border-red-500 focus-visible:ring-red-500",
                    className
                )}
                ref={ref}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
});

Input.displayName = "Input";

export { Input };
