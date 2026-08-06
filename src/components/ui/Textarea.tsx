import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;

    return (
      <div className="space-y-1.5 w-full min-w-0">
        {label && (
          <label htmlFor={textareaId} className="label-micro ml-1 block">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4',
            'text-sm text-gray-900 placeholder:text-gray-400 min-h-[120px] resize-y',
            'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white focus:border-brand',
            'transition-all disabled:opacity-60',
            error && 'border-red-200 focus:border-red-500 focus:ring-red-500/10',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-[11px] text-red-500 font-semibold ml-1">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="text-[11px] text-gray-400 font-medium ml-1">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
