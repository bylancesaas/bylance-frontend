import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/api/client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X, LayoutDashboard, Users, Package, FileText, Shield, DollarSign, LogOut } from 'lucide-react';

function isLightColor(hex) {
  if (!hex) return false;
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

const PREVIEW_NAV = [
  { label: 'Home', icon: LayoutDashboard },
  { label: 'Clientes', icon: Users },
  { label: 'Estoque', icon: Package },
  { label: 'Ordens de Serviço', icon: FileText },
  { label: 'Garantias', icon: Shield },
  { label: 'Financeiro', icon: DollarSign },
];

function BrandingPreview({ form, logoPreview }) {
  const light = isLightColor(form.primaryColor);
  const fgRgb = light ? '30,41,59' : '248,250,252';
  const fg = (a) => `rgba(${fgRgb},${a})`;
  const secondaryLight = isLightColor(form.secondaryColor);
  const btnFg = secondaryLight ? '#1e293b' : '#ffffff';

  return (
    <div className="bg-card border rounded-xl p-6 space-y-4 shadow-card">
      <div>
        <h3 className="font-semibold text-base">Preview do Sistema</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Como o cliente verá o sistema com as cores selecionadas</p>
      </div>

      {/* Browser chrome */}
      <div className="border rounded-xl overflow-hidden shadow-elevated" style={{ height: '320px' }}>
        {/* Browser top bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border-b">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="flex-1 mx-2 bg-white rounded border text-[9px] text-gray-400 px-2 py-0.5 text-center truncate">
            app.bylance.io/{form.slug || 'sua-empresa'}
          </div>
        </div>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-40 flex-shrink-0 flex flex-col h-full border-r" style={{ backgroundColor: form.primaryColor, borderColor: fg(0.1) }}>
            {/* Logo */}
            <div className="flex items-center gap-2 px-3 py-3 border-b" style={{ borderColor: fg(0.1) }}>
              {logoPreview ? (
                <img src={logoPreview} alt="" className="h-6 w-6 rounded flex-shrink-0 object-contain" style={{ backgroundColor: form.iconBgColor || '#fff' }} />
              ) : (
                <div className="h-6 w-6 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: fg(0.18), color: fg(1) }}>
                  {form.name?.[0]?.toUpperCase() || 'B'}
                </div>
              )}
              <span className="text-[11px] font-bold truncate" style={{ color: fg(1) }}>
                {form.name || 'Empresa'}
              </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-1.5 px-1.5 space-y-0.5">
              {PREVIEW_NAV.map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                  style={{
                    backgroundColor: i === 0 ? fg(0.15) : 'transparent',
                    color: i === 0 ? fg(1) : fg(0.5),
                    fontSize: '10px',
                  }}
                >
                  <item.icon style={{ width: 11, height: 11, flexShrink: 0 }} />
                  {item.label}
                </div>
              ))}
            </nav>

            {/* User */}
            <div className="px-3 py-2.5 border-t flex items-center gap-2" style={{ borderColor: fg(0.1) }}>
              <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: fg(0.15), color: fg(1) }}>
                J
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-medium truncate" style={{ color: fg(1) }}>João Silva</div>
                <div className="text-[8px]" style={{ color: fg(0.45) }}>Diretor</div>
              </div>
              <LogOut style={{ width: 10, height: 10, color: fg(0.4) }} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-white">
              <div className="text-[11px] font-semibold text-gray-700">Bom dia, João 👋</div>
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-hidden">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2">
                {[['OS em aberto', '12'], ['Clientes', '48'], ['Faturamento', 'R$3.2k'], ['Garantias', '5']].map(([label, val]) => (
                  <div key={label} className="bg-white border rounded-lg p-2">
                    <div className="text-[8px] text-gray-400 mb-0.5">{label}</div>
                    <div className="text-xs font-bold" style={{ color: form.secondaryColor }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {['+ Nova OS', '+ Novo Cliente', 'Ver Financeiro'].map(lbl => (
                  <div key={lbl} className="text-[8px] font-semibold px-2 py-1 rounded" style={{ backgroundColor: form.secondaryColor, color: btnFg }}>
                    {lbl}
                  </div>
                ))}
              </div>
              {/* Table mockup */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-2 py-1.5 border-b text-[9px] font-semibold text-gray-600">Ordens de Serviço recentes</div>
                {['OS #001 — João Santos', 'OS #002 — Maria Lima', 'OS #003 — Paulo Costa'].map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 border-b last:border-0">
                    <span className="text-[8px] text-gray-600">{row}</span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${form.secondaryColor}18`, color: form.secondaryColor }}>
                      {['Em andamento', 'Concluído', 'Aguardando'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ALL_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clients', label: 'Clientes' },
  { key: 'items', label: 'Peças & Itens' },
  { key: 'services', label: 'Serviços' },
  { key: 'serviceOrders', label: 'Ordens de Serviço' },
  { key: 'warranties', label: 'Garantias' },
  { key: 'financial', label: 'Financeiro' },
  { key: 'userManagement', label: 'Gestão de Usuários' },
];

export default function TenantForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '', slug: '', businessType: '', plan: 'basic',
    primaryColor: '#1e40af', secondaryColor: '#3b82f6', iconBgColor: '#ffffff',
    active: true, logo: '',
  });
  const [modules, setModules] = useState(ALL_MODULES.map(m => ({ module: m.key, active: true })));
  const [directorEmail, setDirectorEmail] = useState('');
  const [directorPassword, setDirectorPassword] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      api.get(`/tenants/${id}`).then(res => {
        const t = res.data.data;
        setForm({
          name: t.name, slug: t.slug, businessType: t.businessType, plan: t.plan,
          primaryColor: t.primaryColor, secondaryColor: t.secondaryColor, iconBgColor: t.iconBgColor || '#ffffff',
          active: t.active, logo: t.logo || '',
        });
        if (t.logo) setLogoPreview(t.logo);
        if (t.modules?.length) {
          setModules(ALL_MODULES.map(m => ({
            module: m.key,
            active: t.modules.some(tm => tm.module === m.key && tm.active),
          })));
        }
      }).catch(() => toast.error('Erro ao carregar'));
    }
  }, [id, isEditing]);

  const uploadLogo = async (tenantId) => {
    if (!logoFile) return;
    const formData = new FormData();
    formData.append('logo', logoFile);
    await api.post(`/tenants/${tenantId}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      // Don't send logo in JSON — it's uploaded separately
      delete payload.logo;

      if (isEditing) {
        await api.put(`/tenants/${id}`, payload);
        await api.put(`/tenants/${id}/modules`, { modules });
        await uploadLogo(id);
        toast.success('Empresa atualizada!');
      } else {
        const res = await api.post('/tenants', payload);
        const tenantId = res.data.data.id;
        await api.put(`/tenants/${tenantId}/modules`, { modules });
        await uploadLogo(tenantId);
        if (directorEmail && directorPassword && directorName) {
          await api.post('/auth/register', {
            name: directorName, email: directorEmail, password: directorPassword,
            role: 'director', tenantId,
          });
        }
        toast.success('Empresa criada!');
      }
      navigate('/admin/tenants');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const toggleModule = (key) => setModules(m => m.map(mod => mod.module === key ? { ...mod, active: !mod.active } : mod));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title={isEditing ? 'Editar Empresa' : 'Nova Empresa'} description={isEditing ? 'Atualize os dados' : 'Cadastre uma nova empresa no sistema'} />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-card border rounded-xl p-6 space-y-5 shadow-card">
          <h3 className="font-semibold text-base">Dados da Empresa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => onChange('name', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Slug (URL)</Label><Input value={form.slug} onChange={e => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required /></div>
            <div className="space-y-2"><Label>Tipo de Negócio</Label><Input value={form.businessType} onChange={e => onChange('businessType', e.target.value)} placeholder="ex: refrigeracao, mecanica" /></div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.plan} onChange={e => onChange('plan', e.target.value)}>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Cor Primária</Label><Input type="color" value={form.primaryColor} onChange={e => onChange('primaryColor', e.target.value)} /></div>
            <div className="space-y-2"><Label>Cor Secundária</Label><Input type="color" value={form.secondaryColor} onChange={e => onChange('secondaryColor', e.target.value)} /></div>
            <div className="space-y-2"><Label>Cor de Fundo do Ícone</Label><Input type="color" value={form.iconBgColor} onChange={e => onChange('iconBgColor', e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Logo (PNG, JPG, WEBP — máx. 2MB)</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-20 w-20 rounded-lg object-contain border bg-white p-1"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                </div>
              )}
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {logoPreview ? 'Trocar imagem' : 'Selecionar imagem'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <input type="checkbox" checked={form.active} onChange={e => onChange('active', e.target.checked)} className="w-4 h-4 rounded border-input accent-primary" />
            <Label className="cursor-pointer">Empresa Ativa</Label>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 space-y-5 shadow-card">
          <h3 className="font-semibold text-base">Módulos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_MODULES.map(m => {
              const mod = modules.find(mod => mod.module === m.key);
              return (
                <label key={m.key} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted/50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={mod?.active || false} onChange={() => toggleModule(m.key)} className="w-4 h-4 rounded border-input accent-primary" />
                  <span className="text-sm">{m.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {!isEditing && (
          <div className="bg-card border rounded-xl p-6 space-y-5 shadow-card">
            <h3 className="font-semibold text-base">Usuário Diretor (opcional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={directorName} onChange={e => setDirectorName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={directorEmail} onChange={e => setDirectorEmail(e.target.value)} /></div>
              <div className="col-span-1 sm:col-span-2 space-y-2"><Label>Senha</Label><Input type="password" value={directorPassword} onChange={e => setDirectorPassword(e.target.value)} /></div>
            </div>
          </div>
        )}

        <BrandingPreview form={form} logoPreview={logoPreview} />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Salvando...
              </span>
            ) : (isEditing ? 'Salvar' : 'Criar Empresa')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/tenants')}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
