import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Card = forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={twMerge(
            "rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200 hover:shadow-md",
            className
        )}
        {...props}
    />
));
Card.displayName = "Card";

const CardHeader = forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={twMerge("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={twMerge(
            "text-2xl font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
));
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={twMerge("flex items-center p-6 pt-0", className)}
        {...props}
    />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
