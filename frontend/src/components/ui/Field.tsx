import { useId } from 'react';

export const inputClass =
  'h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted transition-colors duration-150 hover:border-muted focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary/30 focus-visible:outline-offset-0 disabled:bg-sunken aria-[invalid=true]:border-danger';

interface FieldProps {
  label: string;
  error?: string | null;
  hint?: string;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
}

/** Label + control + inline message, wired together for screen readers. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const message = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': message ? msgId : undefined,
      })}
      {message && (
        <p id={msgId} className={`text-[13px] ${error ? 'text-danger-ink' : 'text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
