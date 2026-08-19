import { Hash, User } from 'lucide-react';
import { CPFInput, Input } from '../ui';

export function CardholderSameAsBuyer({
  same,
  onSameChange,
  titularNome,
  titularCpf,
  onNomeChange,
  onCpfChange,
  nomeError,
}: {
  same: boolean;
  onSameChange: (same: boolean) => void;
  titularNome: string;
  titularCpf: string;
  onNomeChange: (nome: string) => void;
  onCpfChange: (cpf: string, isValid: boolean) => void;
  nomeError?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          id="cardholder-same"
          checked={same}
          onChange={(e) => onSameChange(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-gray-300 text-brand focus:ring-brand"
        />
        <span className="text-sm text-gray-700 font-medium leading-relaxed">
          São os mesmos dados? O cartão está no nome de quem preencheu este
          formulário.
        </span>
      </label>
      <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
        Número, validade e CVV você informa na próxima tela (Mercado Pago). Nome
        e CPF do titular seguem esta escolha.
      </p>
      {!same ? (
        <div className="flex flex-col gap-4 pt-1">
          <Input
            label="Nome do titular do cartão"
            icon={<User size={18} />}
            placeholder="Como está impresso no cartão"
            value={titularNome}
            error={nomeError}
            isValid={titularNome.trim().length > 3 && !nomeError}
            onChange={(e) => onNomeChange(e.target.value)}
            autoComplete="cc-name"
          />
          <CPFInput
            label="CPF do titular do cartão"
            icon={<Hash size={18} />}
            value={titularCpf}
            onChange={onCpfChange}
            autoComplete="off"
          />
        </div>
      ) : null}
    </div>
  );
}
