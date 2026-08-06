import React from 'react';
import { Input } from './Input';
import { maskPhone, validatePhone } from '../../lib/validation';
import { digitsOnly } from '../../lib/utils';

interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  error?: string;
  icon?: React.ReactNode;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
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
    const masked = maskPhone(rawValue);

    let currentError: string | undefined;
    let currentValid = false;

    if (validatePhone(rawValue)) {
      currentValid = true;
    } else if (rawValue.length > 0) {
      currentError = 'Informe um telefone celular válido com DDD.';
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
      placeholder="(00) 0 0000-0000"
      maxLength={16}
      inputMode="numeric"
      autoComplete="tel"
    />
  );
};
