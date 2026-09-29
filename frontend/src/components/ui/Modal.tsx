import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

/** Radix supplies focus trap, Escape, aria roles; framer-motion supplies the enter/exit. */
export function Modal({ open, onClose, title, description, children, width = 'max-w-lg' }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-ink/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 grid place-items-end overflow-y-auto p-0 sm:place-items-center sm:p-6">
              <Dialog.Content asChild forceMount>
                <motion.div
                  className={`pointer-events-auto w-full ${width} rounded-t-2xl bg-surface shadow-pop outline-none sm:rounded-2xl`}
                  // Modals stay centred, so they scale from the middle, never from 0.
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                  transition={{ duration: 0.2, ease }}
                >
                  <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
                    <div>
                      <Dialog.Title className="text-lg font-semibold tracking-tight">
                        {title}
                      </Dialog.Title>
                      <Dialog.Description
                        className={description ? 'mt-0.5 text-sm text-ink-2' : 'sr-only'}
                      >
                        {description ?? title}
                      </Dialog.Description>
                    </div>
                    <Dialog.Close
                      aria-label="Close"
                      className="-mr-2 grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
                    >
                      <X className="size-4" />
                    </Dialog.Close>
                  </div>
                  <div className="px-6 py-5">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
