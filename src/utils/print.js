const fmt = (v) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; font-size: 13px; color: #111827; background: #fff; }
  @page { size: A4; margin: 18mm 16mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  .page { padding: 0; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #111827; margin-bottom: 24px; }
  .company-info { display: flex; align-items: center; gap: 14px; }
  .company-logo { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; }
  .company-logo-placeholder { width: 56px; height: 56px; border-radius: 8px; background: #1e40af; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 800; }
  .company-name { font-size: 20px; font-weight: 800; color: #111827; }
  .company-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 22px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px; }
  .doc-title p { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .doc-badge { display: inline-block; margin-top: 6px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 600; }

  /* Sections */
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; }
  .info-grid.cols3 { grid-template-columns: repeat(3, 1fr); }
  .info-item label { font-size: 10px; color: #9ca3af; display: block; margin-bottom: 2px; font-weight: 500; }
  .info-item span { font-size: 13px; color: #111827; font-weight: 500; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f9fafb; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
  thead th.right { text-align: right; }
  tbody td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
  tbody td.right { text-align: right; font-weight: 600; }
  tbody tr:last-child td { border-bottom: none; }

  /* Total */
  .total-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
  .total-box .label { font-size: 13px; color: #0369a1; font-weight: 600; }
  .total-box .value { font-size: 22px; font-weight: 800; color: #0369a1; }

  /* Warranty specific */
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .status-active { background: #dcfce7; color: #15803d; }
  .status-expired { background: #fee2e2; color: #dc2626; }
  .status-claimed { background: #fef9c3; color: #a16207; }

  .guarantee-box { border: 1.5px dashed #d1d5db; border-radius: 10px; padding: 18px 20px; margin-top: 20px; background: #f9fafb; }
  .guarantee-box h3 { font-size: 11px; font-weight: 700; color: #374151; margin-bottom: 10px; }

  /* Signature area */
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .sig-line { border-top: 1px solid #9ca3af; padding-top: 8px; text-align: center; font-size: 11px; color: #6b7280; }

  /* Description box */
  .desc-box { background: #f9fafb; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #374151; line-height: 1.6; border: 1px solid #f3f4f6; }

  /* Divider */
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 18px 0; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 10px; color: #9ca3af; }
`;

function openPrint(html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Permita pop-ups para imprimir.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseStyles}</style></head><body><div class="page">${html}</div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`);
  win.document.close();
}

function logoHtml(tenant) {
  if (tenant?.logo) {
    const url = window.location.origin + tenant.logo;
    return `<img src="${url}" class="company-logo" alt="logo" />`;
  }
  const initial = (tenant?.name || 'B').charAt(0).toUpperCase();
  return `<div class="company-logo-placeholder">${initial}</div>`;
}

const statusMap = { active: 'Ativa', expired: 'Expirada', claimed: 'Utilizada' };
const statusClass = { active: 'status-active', expired: 'status-expired', claimed: 'status-claimed' };
const osStatusMap = { pending: 'Pendente', in_progress: 'Em Andamento', completed: 'Concluída', cancelled: 'Cancelada' };

export function printServiceOrder(order, tenant) {
  const client = order.client || {};
  const vehicle = order.vehicle;
  const services = order.services || [];
  const items = order.items || [];

  const autoTypes = ['auto', 'oficina'];
  const vehicleLabel = autoTypes.includes(tenant?.businessType) ? 'Veículo' : 'Referência';

  const servicesTotal = services.reduce((s, x) => s + (x.total || 0), 0);
  const itemsTotal = items.reduce((s, x) => s + (x.total || 0), 0);
  const total = order.total || servicesTotal + itemsTotal;

  const servicesRows = services.map(s => `
    <tr>
      <td>${s.service?.name || '—'}</td>
      <td class="right">${s.quantity}</td>
      <td class="right">${fmt(s.unitPrice)}</td>
      <td class="right">${fmt(s.total)}</td>
    </tr>`).join('');

  const itemsRows = items.map(i => `
    <tr>
      <td>${i.item?.name || '—'}</td>
      <td class="right">${i.quantity}</td>
      <td class="right">${fmt(i.unitPrice)}</td>
      <td class="right">${fmt(i.total)}</td>
    </tr>`).join('');

  const vehicleSection = vehicle ? `
    <div class="section">
      <div class="section-title">${vehicleLabel}</div>
      <div class="info-grid cols3">
        <div class="info-item"><label>Identificação / Placa</label><span>${vehicle.plate || '—'}</span></div>
        <div class="info-item"><label>Marca / Modelo</label><span>${[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}</span></div>
        <div class="info-item"><label>Ano / Cor</label><span>${[vehicle.year, vehicle.color].filter(Boolean).join(' / ') || '—'}</span></div>
      </div>
    </div>
    <hr>` : '';

  const servicesSection = services.length > 0 ? `
    <div class="section">
      <div class="section-title">Serviços realizados</div>
      <table>
        <thead><tr><th>Serviço</th><th class="right">Qtd</th><th class="right">Preço unit.</th><th class="right">Total</th></tr></thead>
        <tbody>${servicesRows}</tbody>
      </table>
    </div>` : '';

  const itemsSection = items.length > 0 ? `
    <div class="section">
      <div class="section-title">Peças / Produtos utilizados</div>
      <table>
        <thead><tr><th>Produto</th><th class="right">Qtd</th><th class="right">Preço unit.</th><th class="right">Total</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>` : '';

  const descSection = order.description ? `
    <div class="section">
      <div class="section-title">Descrição / Problema relatado</div>
      <div class="desc-box">${order.description}</div>
    </div>` : '';

  const notesSection = order.notes ? `
    <div class="section">
      <div class="section-title">Observações internas</div>
      <div class="desc-box">${order.notes}</div>
    </div>` : '';

  const html = `
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        ${logoHtml(tenant)}
        <div>
          <div class="company-name">${tenant?.name || 'Empresa'}</div>
          <div class="company-sub">Ordem de Serviço</div>
        </div>
      </div>
      <div class="doc-title">
        <h1>ORDEM DE SERVIÇO</h1>
        <p>Emitida em ${fmtDate(order.createdAt)}</p>
        <div class="doc-badge">Nº ${order.id?.slice(0, 8).toUpperCase()}</div>
      </div>
    </div>

    <!-- Status -->
    <div class="section">
      <div class="info-grid cols3">
        <div class="info-item"><label>Status</label><span>${osStatusMap[order.status] || order.status}</span></div>
        <div class="info-item"><label>Data de abertura</label><span>${fmtDate(order.createdAt)}</span></div>
        <div class="info-item"><label>Total</label><span style="font-size:16px;font-weight:800;color:#0369a1">${fmt(total)}</span></div>
      </div>
    </div>
    <hr>

    <!-- Client -->
    <div class="section">
      <div class="section-title">Cliente</div>
      <div class="info-grid">
        <div class="info-item"><label>Nome</label><span>${client.name || '—'}</span></div>
        <div class="info-item"><label>Documento (CPF/CNPJ)</label><span>${client.document || '—'}</span></div>
        <div class="info-item"><label>Telefone</label><span>${client.phone || '—'}</span></div>
        <div class="info-item"><label>E-mail</label><span>${client.email || '—'}</span></div>
        ${client.address ? `<div class="info-item" style="grid-column:span 2"><label>Endereço</label><span>${client.address}</span></div>` : ''}
      </div>
    </div>
    <hr>

    ${vehicleSection}

    ${descSection}
    ${notesSection}

    ${servicesSection}
    ${itemsSection}

    <!-- Total -->
    ${(services.length > 0 || items.length > 0) ? `
    <div class="total-box">
      <span class="label">Total geral da OS</span>
      <span class="value">${fmt(total)}</span>
    </div>` : ''}

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-line">Assinatura do cliente</div>
      <div class="sig-line">Responsável técnico — ${tenant?.name || ''}</div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Documento gerado por Bylance • ${tenant?.name || ''}</p>
      <p>OS Nº ${order.id?.slice(0, 8).toUpperCase()} • ${fmtDate(order.createdAt)}</p>
    </div>
  `;

  openPrint(html);
}

export function printWarranty(warranty, tenant) {
  const client = warranty.client || {};
  const status = warranty.status || 'active';

  const html = `
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        ${logoHtml(tenant)}
        <div>
          <div class="company-name">${tenant?.name || 'Empresa'}</div>
          <div class="company-sub">Certificado de Garantia</div>
        </div>
      </div>
      <div class="doc-title">
        <h1>CERTIFICADO DE GARANTIA</h1>
        <p>Emitido em ${fmtDate(warranty.createdAt || new Date())}</p>
        <div class="doc-badge">Nº ${warranty.id?.slice(0, 8).toUpperCase()}</div>
      </div>
    </div>

    <!-- Status & period -->
    <div class="section">
      <div class="info-grid cols3">
        <div class="info-item"><label>Status</label><span><span class="status-badge ${statusClass[status] || ''}">${statusMap[status] || status}</span></span></div>
        <div class="info-item"><label>Data de início</label><span>${fmtDate(warranty.startDate)}</span></div>
        <div class="info-item"><label>Data de vencimento</label><span>${fmtDate(warranty.endDate)}</span></div>
      </div>
    </div>
    <hr>

    <!-- Client -->
    <div class="section">
      <div class="section-title">Cliente beneficiário</div>
      <div class="info-grid">
        <div class="info-item"><label>Nome</label><span>${client.name || '—'}</span></div>
        <div class="info-item"><label>Documento (CPF/CNPJ)</label><span>${client.document || '—'}</span></div>
        <div class="info-item"><label>Telefone</label><span>${client.phone || '—'}</span></div>
        <div class="info-item"><label>E-mail</label><span>${client.email || '—'}</span></div>
        ${client.address ? `<div class="info-item" style="grid-column:span 2"><label>Endereço</label><span>${client.address}</span></div>` : ''}
      </div>
    </div>
    <hr>

    ${warranty.serviceOrder ? `
    <div class="section">
      <div class="section-title">Ordem de serviço vinculada</div>
      <div class="info-item"><label>OS Nº</label><span>${warranty.serviceOrder.id?.slice(0, 8).toUpperCase()}</span></div>
      ${warranty.serviceOrder.description ? `<div class="info-item" style="margin-top:6px"><label>Descrição da OS</label><span>${warranty.serviceOrder.description}</span></div>` : ''}
    </div>
    <hr>` : ''}

    <!-- Guarantee box -->
    <div class="guarantee-box">
      <h3>📋 Termos da Garantia</h3>
      ${warranty.description
        ? `<p style="font-size:13px;color:#374151;line-height:1.7">${warranty.description}</p>`
        : `<p style="font-size:13px;color:#9ca3af;font-style:italic">Nenhuma descrição detalhada foi registrada para esta garantia.</p>`
      }
      <p style="margin-top:14px;font-size:11px;color:#6b7280">
        Este certificado é válido de <strong>${fmtDate(warranty.startDate)}</strong> até <strong>${fmtDate(warranty.endDate)}</strong>.
        Em caso de dúvidas, entre em contato com <strong>${tenant?.name || 'a empresa'}</strong>.
      </p>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-line">Assinatura do cliente — ${client.name || ''}</div>
      <div class="sig-line">Responsável — ${tenant?.name || ''}</div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Documento gerado por Bylance • ${tenant?.name || ''}</p>
      <p>Garantia Nº ${warranty.id?.slice(0, 8).toUpperCase()} • Válida até ${fmtDate(warranty.endDate)}</p>
    </div>
  `;

  openPrint(html);
}
