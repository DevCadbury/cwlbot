'use client';
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'input-field',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          aria-label={label}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500" role="alert">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
