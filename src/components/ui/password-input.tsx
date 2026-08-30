import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from './utils';

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  buttonClassName?: string;
  iconClassName?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      containerClassName,
      buttonClassName,
      iconClassName,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className={cn('relative', containerClassName)}>
        <input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-12', className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          tabIndex={0}
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/20 active:scale-95 touch-manipulation cursor-pointer flex items-center justify-center',
            buttonClassName
          )}
        >
          {showPassword ? (
            <EyeOff className={cn('w-5 h-5', iconClassName)} />
          ) : (
            <Eye className={cn('w-5 h-5', iconClassName)} />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
