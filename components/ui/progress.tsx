import { cn } from '@/lib/utils';

export function Progress({
  value = 0,
  className,
}: {
  value?: number;
  className?: string;
}) {
  return (
    <progress
      className={cn('progress progress-primary w-full', className)}
      value={value}
      max={100}
    />
  );
}
