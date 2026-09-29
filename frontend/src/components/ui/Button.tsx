import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary text-white shadow-card hover:bg-primary-hover disabled:hover:bg-primary',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-sunken disabled:hover:bg-surface',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  danger: 'bg-danger text-white shadow-card hover:bg-danger-hover disabled:hover:bg-danger',
} as const;

const sizes = {
  md: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-[13px]',
  icon: 'h-8 w-8',
} as const;

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: Props) {
  const off = disabled || loading;
  return (
    <motion.button
      type={type}
      disabled={off}
      // Press feedback: the UI confirms it heard the click.
      whileTap={off ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <motion.span
          aria-hidden
          className="grid"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="size-4" />
        </motion.span>
      )}
      {children}
    </motion.button>
  );
}
