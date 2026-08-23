import { cn } from '@/lib/utils';

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Kbd({ children, className, ...rest }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-semibold text-muted-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
