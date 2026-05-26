import { twMerge } from "tailwind-merge";

const Badge = ({ children, variant = "default", className }) => {

    const variants = {
        default: "bg-primary/10 text-primary border-primary/20",
        success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
        warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
        danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        outline: "text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700",
        secondary: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-transparent",
    };

    return (
        <span className={twMerge(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
};

export { Badge };
