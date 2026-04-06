import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
));
const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('bg-muted/50 [&_tr]:border-b', className)} {...props} />
));
const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn('border-b transition-colors hover:bg-primary/[0.04]', className)} {...props} />
));
const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th ref={ref} className={cn('h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground/75', className)} {...props} />
));
const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('px-4 py-3.5 align-middle', className)} {...props} />
));

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
