import { User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { staffInitials } from '../../lib/presence';

type Person = {
  name?: string;
  avatar?: string;
};

export function StaffAvatar({
  person,
  size = 40,
  online,
  className,
  ringClassName = 'ring-white',
}: {
  person: Person;
  size?: number;
  online?: boolean;
  className?: string;
  ringClassName?: string;
}) {
  const name = person.name?.trim() || 'Admin';
  const photo = person.avatar?.trim();

  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          className={cn(
            'h-full w-full rounded-full object-cover bg-brand-muted',
            online ? `ring-2 ${ringClassName}` : ''
          )}
        />
      ) : (
        <span
          className={cn(
            'h-full w-full rounded-full bg-brand-muted text-brand flex items-center justify-center font-black',
            online ? `ring-2 ${ringClassName}` : ''
          )}
          style={{ fontSize: Math.max(10, size * 0.32) }}
          aria-hidden="true"
        >
          {staffInitials(name) || <User size={size * 0.45} />}
        </span>
      )}
      {online ? (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-white"
          style={{ width: Math.max(8, size * 0.22), height: Math.max(8, size * 0.22) }}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
