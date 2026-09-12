'use client';

import { useRef, useState, useTransition } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  alt?: string;
  shape?: 'square' | 'circle' | 'banner';
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value, onChange, alt = 'Image', shape = 'square', maxSizeMB = 2,
  disabled, className,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  function upload(file: File) {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({ title: 'File too large', description: `Max ${maxSizeMB} MB.`, variant: 'error' });
      return;
    }
    startTransition(async () => {
      // Static export can't hit a real upload endpoint. Encode locally and
      // store the data URL on the parent component — works for avatars /
      // covers without a server.
      const reader = new FileReader();
      reader.onerror = () => {
        toast({ title: 'Upload failed', description: 'Could not read file.', variant: 'error' });
      };
      reader.onload = () => {
        const dataUrl = String(reader.result ?? '');
        if (!dataUrl) {
          toast({ title: 'Upload failed', description: 'Empty file.', variant: 'error' });
          return;
        }
        onChange(dataUrl);
        toast({ title: 'Uploaded', variant: 'success' });
      };
      reader.readAsDataURL(file);
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  }

  const shapeClass =
    shape === 'circle' ? 'rounded-full' : shape === 'banner' ? 'rounded-md' : 'rounded-md';

  return (
    <div className={cn('group relative', className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'relative overflow-hidden border border-dashed bg-muted/30 transition-colors',
          shapeClass,
          shape === 'circle' ? 'aspect-square w-32' : shape === 'banner' ? 'h-40 w-full' : 'aspect-square w-32',
          dragOver && 'border-foreground bg-foreground/5',
          disabled && 'opacity-50',
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Camera className="h-6 w-6" />
          </div>
        )}

        {pending ? (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : null}

        {!disabled ? (
          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-background"
            >
              {value ? 'Replace' : 'Upload'}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded-md bg-background/95 p-1 text-foreground shadow-sm hover:bg-background"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
