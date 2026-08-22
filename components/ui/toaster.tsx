'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = React.createContext<{
  toast: (opts: { title?: string; description?: string; variant?: 'default' | 'success' | 'error' }) => void;
} | null>(null);

type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
};

export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const toast = React.useCallback<NonNullable<React.ComponentProps<typeof ToastContext.Provider>['value']>['toast']>(
    (opts) => {
      const id = Math.random().toString(36).slice(2);
      setItems((s) => [...s, { id, ...opts }]);
    },
    [],
  );
  const dismiss = (id: string) => setItems((s) => s.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => !open && dismiss(t.id)}
            duration={5000}
            className={cn(
              'pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full',
              t.variant === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
              t.variant === 'success' && 'border-ship/40 bg-ship/10 text-ship',
              (!t.variant || t.variant === 'default') && 'border-border bg-card text-foreground',
            )}
          >
            <div className="flex-1">
              {t.title ? <ToastPrimitive.Title className="text-sm font-semibold">{t.title}</ToastPrimitive.Title> : null}
              {t.description ? (
                <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close className="opacity-70 transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {
        // No-op if Toaster isn't mounted
      },
    };
  }
  return ctx;
}
