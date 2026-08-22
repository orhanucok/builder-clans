'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline:
          'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
        ship: 'bg-ship text-white hover:bg-ship/90 shadow-sm',
        trial: 'bg-trial text-white hover:bg-trial/90 shadow-sm',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));
    const loadingEl = loading ? (
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    ) : null;

    if (asChild) {
      // The single-child contract from Radix Slot is too strict for our
      // ergonomic patterns (icon + text inside a <Link/>). We clone the
      // first child to inherit its tag/component, merge classes and the
      // disabled state, and render the loading spinner alongside it.
      const child = React.Children.toArray(children)[0] as
        | React.ReactElement<Record<string, unknown>>
        | undefined;
      if (!child) {
        return (
          <button
            ref={ref}
            className={classes}
            disabled={disabled || loading}
            {...props}
          >
            {loadingEl}
            {children}
          </button>
        );
      }
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={classes}
          {...(disabled || loading ? { 'aria-disabled': true } : {})}
          {...props}
        >
          {child}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loadingEl}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

