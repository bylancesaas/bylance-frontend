import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-red-50 text-red-600',
        outline: 'text-foreground border-border',
        success: 'border-transparent bg-emerald-50 text-emerald-700',
        warning: 'border-transparent bg-amber-50 text-amber-700',
        info: 'border-transparent bg-sky-50 text-sky-700',
        navy: 'border-transparent bg-bylance-navy text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
