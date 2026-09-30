import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'input input-bordered w-full rounded-xl border-slate-700/80 bg-slate-950/70 text-slate-100 placeholder:text-slate-600',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
