import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '../lib/api';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

export function ConfirmDialog({ open, onClose, title, body, confirmLabel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <p className="text-sm text-ink-2">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={run} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
