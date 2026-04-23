import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'input input-bordered w-full bg-slate-800 border-slate-700',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
