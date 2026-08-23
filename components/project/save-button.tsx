'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { toggleSaveProjectAction } from '@/app/(app)/saved/actions';

interface SaveButtonProps {
  projectId: string;
  initialSaved: boolean;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  showLabel?: boolean;
}

export function SaveButton({
  projectId, initialSaved, size = 'sm', variant = 'outline', className, showLabel = true,
}: SaveButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleSaveProjectAction(projectId);
      if (!res.ok) {
        setSaved(!next);
        toast({ title: 'Could not save', description: res.error, variant: 'error' });
        return;
      }
      toast({
        title: next ? 'Saved' : 'Removed from saved',
        description: next ? 'Find it in your Saved list.' : undefined,
        variant: 'success',
      });
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      loading={pending}
      size={size}
      variant={variant}
      className={cn('gap-1.5', className)}
      aria-pressed={saved}
      aria-label={saved ? 'Unsave project' : 'Save project'}
    >
      {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      {showLabel ? (saved ? 'Saved' : 'Save') : null}
    </Button>
  );
}
