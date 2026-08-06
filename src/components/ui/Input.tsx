import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isValid?: boolean;
  icon?: React.ReactNode;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, isValid, icon, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="space-y-1.5 w-full min-w-0">
        {label && (
          <label htmlFor={inputId} className="label-micro ml-1 block">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={cn(
              'w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4',
              'text-sm text-gray-900 placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white focus:border-brand',
              'transition-all disabled:opacity-60 disabled:cursor-not-allowed',
              icon && 'pl-11',
              isValid && !error && 'border-green-200 focus:border-green-500 focus:ring-green-500/10',
              error && 'border-red-200 focus:border-red-500 focus:ring-red-500/10',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-[11px] text-red-500 font-semibold ml-1">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={hintId} className="text-[11px] text-gray-400 font-medium ml-1">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
