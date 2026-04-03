import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    api.get('/tenants').then(res => setTenants(res.data.data || [])).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Remover empresa "${name}"? Isso apagará todos os dados!`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/tenants/${id}`);
      toast.success('Empresa removida');
      load();
    } catch { toast.error('Erro ao remover'); } finally { setDeletingId(null); }
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
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                <TableCell>{t.businessType}</TableCell>
                <TableCell><Badge variant="secondary">{t.plan}</Badge></TableCell>
                <TableCell><Badge variant={t.active ? 'success' : 'destructive'}>{t.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                <TableCell>{t._count?.users || 0}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Link to={`/admin/tenants/${t.id}`}><Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button></Link>
                  <Button variant="ghost" size="icon" disabled={deletingId === t.id} onClick={() => handleDelete(t.id, t.name)}>{deletingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}</Button>
                </TableCell>
              </TableRow>
            ))}
            {tenants.length === 0 && <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" description="Clique em 'Nova Empresa' para começar" colSpan={7} />}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
