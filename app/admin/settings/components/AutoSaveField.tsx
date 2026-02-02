'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';

interface AutoSaveFieldProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'textarea' | 'password' | 'email' | 'url' | 'select';
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  options?: { value: string; label: string }[]; // For select
  validate?: (value: string) => string | null;
  description?: string; // Helper text
}

export function AutoSaveField({
  label,
  value,
  onSave,
  type = 'text',
  placeholder,
  className = '',
  required = false,
  disabled = false,
  rows = 3,
  options = [],
  validate,
  description
}: AutoSaveFieldProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  
  const lastSavedValueRef = useRef(value || '');
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Initialize or update from external changes (only if not editing)
    if (!isInitializedRef.current || (status === 'idle' && value !== undefined && value !== null && value !== lastSavedValueRef.current)) {
       const newValue = value || '';
       if (newValue !== localValue) {
         setLocalValue(newValue);
         lastSavedValueRef.current = newValue;
       }
       isInitializedRef.current = true;
    }
  }, [value, status]);

  const handleBlur = async () => {
    const trimmedValue = localValue.trim();
    
    if (trimmedValue === lastSavedValueRef.current) {
      return;
    }

    if (validate) {
      const validationError = validate(trimmedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError(null);

    setStatus('saving');
    try {
      await onSave(trimmedValue);
      lastSavedValueRef.current = trimmedValue;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setLocalValue(e.target.value);
    if (status === 'error') setStatus('idle');
    if (error) setError(null);
  };

  // Render input based on type
  const renderInput = () => {
    const commonClasses = `w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm
      ${error ? 'border-red-500 focus:border-red-500' : 'border-input hover:border-primary/50 focus:border-primary'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `;

    if (type === 'textarea') {
      return (
        <textarea
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || status === 'saving'}
          placeholder={placeholder}
          rows={rows}
          className={`${commonClasses} resize-none`}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || status === 'saving'}
          className={commonClasses}
        >
          <option value="">{placeholder || '请选择'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className="relative">
        <input
          type={inputType}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || status === 'saving'}
          placeholder={placeholder}
          className={`${commonClasses} ${type === 'password' ? 'pr-10' : ''}`}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        <div className="h-4 flex items-center">
          {status === 'saving' && <Loader2 className="w-3 h-3 animate-spin text-muted" />}
          {status === 'saved' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
          {status === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
        </div>
      </div>
      
      {renderInput()}
      
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && description && <p className="text-[10px] text-muted">{description}</p>}
    </div>
  );
}
