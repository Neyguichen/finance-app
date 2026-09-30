import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  children: React.ReactNode;
  asChild?: boolean;
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonProps) {
  const variants = {
    default: 'btn border-0 bg-indigo-500 text-white shadow-sm hover:bg-indigo-400',
    ghost: 'btn btn-ghost text-slate-300 hover:bg-slate-800/70 hover:text-white',
    outline: 'btn border border-slate-700/80 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80',
  };
  const sizes = {
    default: '',
    sm: 'btn-sm',
    icon: 'btn-square btn-sm',
  };
  return (
    <button
      className={cn(
        'rounded-xl font-medium normal-case transition duration-200 disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
