import React from 'react';
import { Input } from './Input';
import { maskCPF, validateCPF } from '../../lib/validation';
import { digitsOnly } from '../../lib/utils';

interface CPFInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  error?: string;
  icon?: React.ReactNode;
}

export const CPFInput: React.FC<CPFInputProps> = ({
  label,
  value,
  onChange,
  error,
  icon,
  ...props
}) => {
  const [internalError, setInternalError] = React.useState<string | undefined>();
  const [isValid, setIsValid] = React.useState(false);

  React.useEffect(() => {
    if (error !== undefined) setInternalError(error);
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = digitsOnly(e.target.value, 11);
    const masked = maskCPF(rawValue);

    let currentError: string | undefined;
    let currentValid = false;

    if (rawValue.length === 11) {
      if (validateCPF(rawValue)) {
        currentValid = true;
      } else {
        currentError = 'CPF inválido. Verifique os números informados.';
      }
    } else if (rawValue.length > 0) {
      currentError = 'CPF incompleto.';
    }

    setInternalError(currentError);
    setIsValid(currentValid);
    onChange(masked, currentValid);
  };

  return (
    <Input
      {...props}
      label={label}
      value={value}
      onChange={handleChange}
      error={internalError || error}
      isValid={isValid && !internalError && !error}
      icon={icon}
      placeholder="000.000.000-00"
      maxLength={14}
      inputMode="numeric"
      autoComplete="off"
    />
  );
};
