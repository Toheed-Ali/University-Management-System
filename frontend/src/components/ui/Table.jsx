import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Table = forwardRef(({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-lg border border-gray-200 dark:border-dark-border shadow-sm">
        <table
            ref={ref}
            className={twMerge("w-full caption-bottom text-sm text-left", className)}
            {...props}
        />
    </div>
));
Table.displayName = "Table";

const TableHeader = forwardRef(({ className, ...props }, ref) => (
    <thead ref={ref} className={twMerge("[&_tr]:border-b bg-gray-50 dark:bg-gray-900/50", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef(({ className, ...props }, ref) => (
    <tbody
        ref={ref}
        className={twMerge("[&_tr:last-child]:border-0", className)}
        {...props}
    />
));
TableBody.displayName = "TableBody";

const TableRow = forwardRef(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={twMerge(
            "border-b border-gray-200 dark:border-dark-border transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50 data-[state=selected]:bg-gray-100",
            className
        )}
        {...props}
    />
));
TableRow.displayName = "TableRow";

const TableHead = forwardRef(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={twMerge(
            "h-10 px-4 text-left align-middle font-medium text-gray-500 dark:text-gray-400 [&:has([role=checkbox])]:pr-0",
            className
        )}
        {...props}
    />
));
TableHead.displayName = "TableHead";

const TableCell = forwardRef(({ className, ...props }, ref) => (
    <td
        ref={ref}
        className={twMerge("p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-900 dark:text-gray-300", className)}
        {...props}
    />
));
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
