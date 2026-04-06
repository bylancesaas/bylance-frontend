import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import DestructiveModal from '@/components/DestructiveModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Building2, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [modalTarget, setModalTarget] = useState(null); // tenant object

  const load = () => {
    api.get('/tenants').then(res => setTenants(res.data.data || [])).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDeleteConfirm = async () => {
    if (!modalTarget) return;
    setDeletingId(modalTarget.id);
    try {
      await api.delete(`/tenants/${modalTarget.id}`, { data: { confirmName: modalTarget.name } });
      toast.success('Empresa excluída permanentemente');
      setModalTarget(null);
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao excluir empresa';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Empresas" description="Gerencie as empresas cadastradas">
        <Link to="/admin/tenants/new"><Button><Plus className="w-4 h-4" /> Nova Empresa</Button></Link>
      </PageHeader>

      <div className="bg-card border rounded-xl overflow-x-auto shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/admin/tenants/${t.id}/detail`}
                    className="hover:text-primary hover:underline underline-offset-2 transition-colors"
                  >
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                <TableCell>{t.businessType}</TableCell>
                <TableCell><Badge variant="secondary">{t.plan}</Badge></TableCell>
                <TableCell><Badge variant={t.active ? 'success' : 'destructive'}>{t.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                <TableCell>{t._count?.users || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/admin/tenants/${t.id}/detail`}>
                      <Button variant="ghost" size="icon" title="Ver detalhes">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </Link>
                    <Link to={`/admin/tenants/${t.id}`}>
                      <Button variant="ghost" size="icon" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir permanentemente"
                      disabled={deletingId === t.id}
                      onClick={() => setModalTarget(t)}
                    >
                      {deletingId === t.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {tenants.length === 0 && <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" description="Clique em 'Nova Empresa' para começar" colSpan={7} />}
          </TableBody>
        </Table>
      </div>

      <DestructiveModal
        open={!!modalTarget}
        onClose={() => setModalTarget(null)}
        onConfirm={handleDeleteConfirm}
        tenant={modalTarget}
        mode="delete"
        loading={!!deletingId}
      />
    </div>
  );
}
