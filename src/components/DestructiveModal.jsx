import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, Power, Trash2, Loader2, Users, FileText, Settings2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DestructiveModal
 *
 * Props:
 *   open        boolean
 *   onClose     () => void
 *   onConfirm   (mode: 'deactivate' | 'delete') => Promise<void>
 *   tenant      { id, name, active, _count: { users, clients, serviceOrders } }
 *   mode        'deactivate' | 'delete'
 *   loading     boolean
 */
export default function DestructiveModal({ open, onClose, onConfirm, tenant, mode, loading }) {
  const [confirmName, setConfirmName] = useState('');
  const inputRef = useRef(null);

  // Reset confirmation field when re-opened
  useEffect(() => {
    if (open) {
      setConfirmName('');
      if (mode === 'delete') setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, mode]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !tenant) return null;

  const isDelete = mode === 'delete';
  const canConfirm = !isDelete || confirmName.trim() === tenant.name.trim();
  const users = tenant._count?.users ?? 0;
  const clients = tenant._count?.clients ?? 0;
  const orders = tenant._count?.serviceOrders ?? 0;

  const impacts = isDelete
    ? [
        { icon: Users,    text: `${users} usuário${users !== 1 ? 's' : ''} perderão acesso imediatamente` },
        { icon: FileText, text: `${orders} ordem${orders !== 1 ? 's' : ''} de serviço ${orders !== 1 ? 'serão desvinculadas' : 'será desvinculada'}` },
        { icon: Settings2,text: `Todas as configurações, módulos e integrações serão removidos` },
        { icon: History,  text: `Contratos, histórico e trilha de auditoria serão arquivados` },
      ]
    : [
        { icon: Users,    text: `${users} usuário${users !== 1 ? 's' : ''} perderão acesso ao sistema` },
        { icon: FileText, text: `Dados preservados — histórico e contratos mantidos` },
        { icon: Settings2,text: `Empresa pode ser reativada a qualquer momento` },
      ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="destructive-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl border animate-in zoom-in-95 fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4
              ${isDelete ? 'bg-red-100' : 'bg-amber-100'}`}>
              {isDelete
                ? <Trash2 className="w-6 h-6 text-red-600" />
                : <Power className="w-6 h-6 text-amber-600" />}
            </div>
            <h2 id="destructive-modal-title" className="text-base font-bold text-foreground">
              {isDelete ? 'Excluir empresa permanentemente' : `${tenant.active ? 'Desativar' : 'Reativar'} empresa`}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isDelete
                ? 'Esta ação não pode ser desfeita. A empresa será permanentemente excluída da plataforma.'
                : tenant.active
                  ? 'A empresa será suspensa. Os dados são preservados e o acesso pode ser restaurado.'
                  : 'A empresa será reativada e os usuários poderão acessar o sistema novamente.'}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 space-y-4">
            {/* Company badge */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-muted/40">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: tenant.primaryColor || '#6366f1' }}
              >
                {tenant.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{tenant.name}</p>
                {tenant.slug && <p className="text-xs text-muted-foreground">/{tenant.slug}</p>}
              </div>
            </div>

            {/* Impact list */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isDelete ? 'Impactos desta ação' : 'O que acontece'}
              </p>
              <ul className="space-y-1.5">
                {impacts.map(({ icon: IconC, text }, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <IconC className={`w-4 h-4 mt-0.5 shrink-0 ${isDelete ? 'text-red-500' : 'text-amber-500'}`} />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Confirmation input for hard delete */}
            {isDelete && (
              <div className="space-y-1.5">
                <label htmlFor="confirm-name" className="text-xs font-semibold text-foreground">
                  Para confirmar, digite o nome exato da empresa:
                </label>
                <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded select-all">
                  {tenant.name}
                </p>
                <input
                  id="confirm-name"
                  ref={inputRef}
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  placeholder="Digite o nome exato..."
                  autoComplete="off"
                  className={`w-full text-sm px-3 py-2 rounded-lg border bg-background outline-none transition-colors
                    focus:ring-2 focus:ring-red-500/20 focus:border-red-400
                    ${confirmName && !canConfirm ? 'border-red-300 bg-red-50/30' : 'border-input'}`}
                />
                {confirmName && !canConfirm && (
                  <p className="text-xs text-red-500">O nome não corresponde.</p>
                )}
              </div>
            )}

            {/* Audit notice */}
            <p className="text-xs text-muted-foreground pb-1">
              Esta ação será registrada na trilha de auditoria com seu nome e a data/hora atual.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant={isDelete ? 'destructive' : tenant.active ? 'warning' : 'default'}
              disabled={!canConfirm || loading}
              onClick={() => onConfirm(mode)}
              className={!isDelete && tenant.active
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : ''}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                : isDelete
                  ? <><Trash2 className="w-4 h-4" /> Excluir empresa</>
                  : tenant.active
                    ? <><Power className="w-4 h-4" /> Desativar empresa</>
                    : <><Power className="w-4 h-4" /> Reativar empresa</>}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
