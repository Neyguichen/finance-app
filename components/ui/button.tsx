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
    default: 'btn btn-primary text-white',
    ghost: 'btn btn-ghost',
    outline: 'btn btn-outline',
  };
  const sizes = {
    default: '',
    sm: 'btn-sm',
    icon: 'btn-square btn-sm',
  };
  return (
    <button
      className={cn(variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
