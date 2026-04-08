import { useRef, useState } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── ConfirmModal ──────────────────────────────────────────────────────────────
// Standalone modal — rendered wherever the caller places it.
//
// Props:
//   open         boolean
//   title        string           — headline, e.g. "Excluir cliente"
//   description  string           — supporting text
//   item         string?          — highlighted name / identifier of the affected record
//   confirmLabel string           — primary button text, e.g. "Excluir"
//   cancelLabel  string?          — defaults to "Cancelar"
//   variant      'destructive' | 'warning' | 'default'
//   loading      boolean?
//   onConfirm    () => void
//   onCancel     () => void
// ─────────────────────────────────────────────────────────────────────────────
const ICON_CONFIG = {
  destructive: {
    wrapper: 'bg-red-100',
    icon: 'text-red-600',
    Icon: Trash2,
    btn: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/40',
  },
  warning: {
    wrapper: 'bg-amber-100',
    icon: 'text-amber-600',
    Icon: AlertTriangle,
    btn: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400/40',
  },
  default: {
    wrapper: 'bg-primary/10',
    icon: 'text-primary',
    Icon: Info,
    btn: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40',
  },
};

export function ConfirmModal({
  open,
  title,
  description,
  item,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'destructive',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  const cfg = ICON_CONFIG[variant] || ICON_CONFIG.destructive;
  const { Icon } = cfg;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={loading ? undefined : onCancel}
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="fixed inset-0 z-[71] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto bg-card rounded-2xl border border-border shadow-overlay p-6 flex flex-col gap-5 animate-scale-in">
          {/* Icon + close */}
          <div className="flex items-start justify-between gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.wrapper}`}>
              <Icon className={`w-6 h-6 ${cfg.icon}`} />
            </div>
            <button
              onClick={loading ? undefined : onCancel}
              disabled={loading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0 -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <h2 id="confirm-title" className="text-base font-bold text-foreground leading-snug">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            )}
          </div>

          {/* Highlighted item name */}
          {item && (
            <div className="rounded-lg border border-border bg-muted/50 px-4 py-2.5">
              <p className="text-xs text-muted-foreground leading-none mb-1">Registro afetado</p>
              <p className="text-sm font-semibold text-foreground truncate">{item}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 sm:flex-none sm:min-w-[100px]"
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 sm:flex-none sm:min-w-[140px] text-sm font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 transition-all ${cfg.btn}`}
            >
              {loading
                ? <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Aguarde...
                  </span>
                : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── useConfirm ────────────────────────────────────────────────────────────────
// Promise-based hook — returns [modalElement, showConfirm]
//
// Usage:
//   const [confirmModal, confirm] = useConfirm();
//
//   const ok = await confirm({
//     title: 'Excluir cliente',
//     description: 'Esta ação não pode ser desfeita.',
//     item: client.name,
//     confirmLabel: 'Excluir cliente',
//     variant: 'destructive',
//   });
//   if (!ok) return;
//   // proceed...
//
//   return <>{confirmModal} ... </>;
// ─────────────────────────────────────────────────────────────────────────────
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = (options) =>
    new Promise((resolve) => {
      setState(options);
      resolveRef.current = resolve;
    });

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setState(null);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setState(null);
  };

  const modal = state ? (
    <ConfirmModal
      open
      {...state}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return [modal, confirm];
}
