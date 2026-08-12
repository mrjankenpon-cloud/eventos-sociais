import React, { useId, useMemo, useState } from 'react';
import { Input } from './Input';
import {
  PHONE_COUNTRIES,
  formatPhoneWithDial,
  maskPhone,
  validateNationalPhone,
  type PhoneCountryOption,
} from '../../lib/validation';
import { digitsOnly, cn } from '../../lib/utils';

interface PhoneInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'
  > {
  label?: string;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  error?: string;
  icon?: React.ReactNode;
}

function parseStoredPhone(value: string): {
  country: PhoneCountryOption;
  dial: string;
  national: string;
} {
  const digits = value.replace(/\D/g, '');
  const br = PHONE_COUNTRIES.find((c) => c.code === 'BR')!;

  if (!digits) {
    return { country: br, dial: br.dial, national: '' };
  }

  // +55… ou 55 + 10/11 dígitos nacionais
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return {
      country: br,
      dial: '55',
      national: digits.slice(2),
    };
  }

  // Valor legado só com DDD+número BR
  if (digits.length === 10 || digits.length === 11) {
    return { country: br, dial: '55', national: digits };
  }

  for (const c of PHONE_COUNTRIES) {
    if (c.code === 'BR' || c.code === 'OTHER' || !c.dial) continue;
    if (digits.startsWith(c.dial) && digits.length > c.dial.length) {
      return {
        country: c,
        dial: c.dial,
        national: digits.slice(c.dial.length),
      };
    }
  }

  return {
    country: PHONE_COUNTRIES.find((c) => c.code === 'OTHER')!,
    dial: '',
    national: digits,
  };
}

/**
 * Telefone com DDI (Brasil padrão).
 * BR: fixo (DDD+8) ou celular (DDD+9). Outros países: DDI + número nacional flexível.
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = 'Telefone',
  value,
  onChange,
  error,
  icon,
  ...props
}) => {
  const parsed = useMemo(() => parseStoredPhone(value), [value]);
  const [countryCode, setCountryCode] = useState(parsed.country.code);
  const [customDial, setCustomDial] = useState(
    parsed.country.code === 'OTHER' ? parsed.dial : ''
  );
  const [national, setNational] = useState(parsed.national);
  const [internalError, setInternalError] = useState<string | undefined>();
  const [isValid, setIsValid] = useState(() =>
    validateNationalPhone(parsed.national, parsed.country)
  );
  const selectId = useId();
  const dialId = useId();

  React.useEffect(() => {
    if (error !== undefined) setInternalError(error);
  }, [error]);

  const country =
    PHONE_COUNTRIES.find((c) => c.code === countryCode) || PHONE_COUNTRIES[0];
  const dial = country.code === 'OTHER' ? customDial : country.dial;

  const emit = (
    nextCountry: PhoneCountryOption,
    nextDial: string,
    nextNational: string
  ) => {
    const valid =
      Boolean(nextDial.replace(/\D/g, '')) &&
      validateNationalPhone(nextNational, nextCountry);
    let err: string | undefined;
    if (nextNational.length > 0 && !valid) {
      if (nextCountry.code === 'BR') {
        err = 'Informe DDD + telefone (8 dígitos fixo ou 9 celular).';
      } else if (!nextDial.replace(/\D/g, '')) {
        err = 'Informe o código do país (DDI).';
      } else {
        err = `Informe um telefone válido (${nextCountry.minNational}–${nextCountry.maxNational} dígitos).`;
      }
    }
    setInternalError(err);
    setIsValid(valid);
    const formatted = formatPhoneWithDial(
      nextDial,
      nextNational,
      nextCountry.code
    );
    onChange(formatted, valid);
  };

  const handleCountryChange = (code: string) => {
    const next =
      PHONE_COUNTRIES.find((c) => c.code === code) || PHONE_COUNTRIES[0];
    setCountryCode(code);
    const nextDial = next.code === 'OTHER' ? customDial : next.dial;
    const nextNational = digitsOnly(national, next.maxNational);
    setNational(nextNational);
    emit(next, nextDial, nextNational);
  };

  const handleNationalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = digitsOnly(e.target.value, country.maxNational);
    setNational(raw);
    emit(country, dial, raw);
  };

  const handleCustomDialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = digitsOnly(e.target.value, 4);
    setCustomDial(d);
    emit(country, d, national);
  };

  const displayNational =
    country.code === 'BR' ? maskPhone(national) : national;
  const placeholder =
    country.code === 'BR' ? '(11) 3456-7890 ou (11) 98765-4321' : 'Código de área + número';

  return (
    <div className="space-y-1.5 w-full min-w-0">
      {label ? (
        <label htmlFor={selectId} className="label-micro ml-1 block">
          {label}
        </label>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="sm:w-[11.5rem] shrink-0">
          <select
            id={selectId}
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            disabled={props.disabled}
            className={cn(
              'w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-3',
              'text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/20',
              'focus:bg-white focus:border-brand transition-all disabled:opacity-60'
            )}
            aria-label="País / DDI"
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.dial ? `${c.name} (+${c.dial})` : c.name}
              </option>
            ))}
          </select>
        </div>

        {country.code === 'OTHER' ? (
          <div className="sm:w-24 shrink-0">
            <input
              id={dialId}
              value={customDial}
              onChange={handleCustomDialChange}
              placeholder="DDI"
              inputMode="numeric"
              disabled={props.disabled}
              aria-label="Código do país (DDI)"
              className={cn(
                'w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-3',
                'text-sm text-gray-900 placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white focus:border-brand'
              )}
            />
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <Input
            {...props}
            label={undefined}
            value={displayNational}
            onChange={handleNationalChange}
            error={internalError || error}
            isValid={isValid && !internalError && !error}
            icon={icon}
            placeholder={placeholder}
            maxLength={country.code === 'BR' ? 16 : country.maxNational + 2}
            inputMode="numeric"
            autoComplete="tel-national"
            hint={
              country.code === 'BR'
                ? 'Fixo: DDD + 8 dígitos · Celular: DDD + 9 dígitos'
                : 'Inclua o código de área e o número (sem o DDI)'
            }
          />
        </div>
      </div>
    </div>
  );
};
