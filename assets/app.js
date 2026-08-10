/* ============================================================
   In-Plementar Conecta · Lógica de la demo
   Construido por Saviqo Online
   ------------------------------------------------------------
   Sin dependencias, sin build, sin servidor. Se abre con doble
   clic sobre index.html.
   ============================================================ */

/* Encapsulado para no chocar con las constantes globales de data.js */
(function () {
'use strict';

const { CLIENTS, MOVEMENTS, PENDING, EFFICIENCY_SERIES, SAVINGS_SERIES,
        companyInitials } = window.DEMO;

/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */
const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

const nf = new Intl.NumberFormat('es-CO');
const formatNumber = n => nf.format(n);

const formatCOP = value => {
  const sign = value < 0 ? '− ' : value > 0 ? '+ ' : '';
  const decimals = Number.isInteger(value) ? 0 : 2;
  return `${sign}$${Math.abs(value).toLocaleString('es-CO', {
    minimumFractionDigits: decimals, maximumFractionDigits: 2
  })}`;
};

const escapeHtml = str => String(str).replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function debounce(fn, wait = 180) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

/* Descarga real de un archivo generado en el navegador */
function downloadFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* CSV con BOM y punto y coma: Excel en español lo abre en columnas */
function toCSV(headers, rows) {
  const cell = v => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [headers, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
}

/* ------------------------------------------------------------
   Estado y persistencia
   ------------------------------------------------------------ */
const STORAGE_KEY = 'inplementar-conecta-demo-v1';

const state = {
  view: 'dashboard',
  clientId: 1,
  page: 1,
  pageSize: 12,
  pendingFilter: 'all',
  selectedPending: null,
  selectedMovements: new Set(),
  clientMode: false,
  theme: 'light',
  /* cambios hechos durante la demo — se conservan al recargar */
  overrides: {},
  resolvedPending: [],
  extraClients: []
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.overrides = saved.overrides || {};
    state.resolvedPending = saved.resolvedPending || [];
    state.extraClients = saved.extraClients || [];
    state.theme = saved.theme || 'light';
  } catch { /* almacenamiento no disponible: la demo funciona igual */ }
}

let resetting = false;

const saveState = debounce(() => {
  if (resetting) return;          // no reescribir lo que se acaba de borrar
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      overrides: state.overrides,
      resolvedPending: state.resolvedPending,
      extraClients: state.extraClients,
      theme: state.theme
    }));
  } catch { /* modo privado o cuota llena: no es crítico */ }
}, 300);

function applyOverrides() {
  const byId = new Map(MOVEMENTS.map(m => [m.id, m]));
  Object.entries(state.overrides).forEach(([id, patch]) => {
    const m = byId.get(Number(id));
    if (m) Object.assign(m, patch);
  });
  state.extraClients.forEach(c => {
    if (!CLIENTS.some(x => x.id === c.id)) CLIENTS.push(c);
  });
}

/* ------------------------------------------------------------
   Métricas derivadas
   ------------------------------------------------------------ */
function metrics() {
  let matched = 0, pending = 0, support = 0, suggested = 0, review = 0;
  MOVEMENTS.forEach(m => {
    if (m.status === 'matched') matched++;
    else if (m.status === 'pending') pending++;
    else if (m.status === 'support') support++;
    else if (m.status === 'suggested') suggested++;
    else if (m.status === 'review') review++;
  });
  const total = MOVEMENTS.length;
  const openPending = PENDING.filter(p => !state.resolvedPending.includes(p.id));
  return {
    total, matched, pending, support, suggested, review,
    clients: CLIENTS.length,
    reviewedPct: Math.round(((matched + review + suggested) / total) * 100),
    progressPct: Math.round(CLIENTS.reduce((s, c) => s + c.progress, 0) / CLIENTS.length),
    /* Embudo del periodo: cada etapa es un subconjunto de la anterior */
    uploaded: CLIENTS.filter(c => c.movementsCount > 0).length,
    processed: CLIENTS.filter(c => c.status !== 'late').length,
    reconciling: CLIENTS.filter(c => c.progress >= 88).length,
    closed: CLIENTS.filter(c => c.progress >= 95).length,
    openPending: openPending.length,
    identify: openPending.filter(p => p.type === 'identify').length,
    missingSupport: openPending.filter(p => p.type === 'support').length,
    answered: openPending.filter(p => p.type === 'answered').length,
    aged: openPending.filter(p => p.ageDays >= 5).length
  };
}

const currentClient = () => CLIENTS.find(c => c.id === state.clientId) || CLIENTS[0];

/* Recalcula avance y estado de un cliente tras resolver movimientos.
   Se llama al terminar una acción, no por cada movimiento. */
function recomputeClient(clientId) {
  const c = CLIENTS.find(x => x.id === Number(clientId));
  if (!c) return;
  let matched = 0, pending = 0, total = 0;
  MOVEMENTS.forEach(m => {
    if (m.clientId !== c.id) return;
    total++;
    if (m.status === 'matched' || m.status === 'review') matched++;
    if (m.status === 'pending' || m.status === 'support') pending++;
  });
  if (!total) return;
  c.matched = matched;
  c.pending = pending;
  c.progress = Math.round((matched / total) * 100);
  const s = c.progress >= 95 ? ['ready', 'Listo']
    : c.progress >= 85 ? ['review', 'En revisión']
    : c.progress >= 78 ? ['client', 'Requiere cliente']
    : ['late', 'Sin cargar'];
  c.status = s[0]; c.statusText = s[1];
}

/* Conteo real de excepciones de un cliente, sobre todos sus movimientos */
function clientPendingCounts(clientId) {
  let identify = 0, support = 0;
  MOVEMENTS.forEach(m => {
    if (m.clientId !== clientId) return;
    if (m.status === 'pending') identify++;
    else if (m.status === 'support') support++;
  });
  return { identify, support, total: identify + support };
}

/* ------------------------------------------------------------
   Notificaciones (toast)
   ------------------------------------------------------------ */
function toast(message, icon = '✓') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<i aria-hidden="true">${escapeHtml(icon)}</i><span>${escapeHtml(message)}</span>`;
  $('#toastContainer').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 250);
  }, 3400);
}

/* ------------------------------------------------------------
   Dashboard
   ------------------------------------------------------------ */
function renderDashboard() {
  const m = metrics();

  const set = (id, value) => { const el = $('#' + id); if (el) el.textContent = value; };
  set('kpiClients', formatNumber(m.clients));
  set('kpiMovements', formatNumber(m.total));
  set('kpiReviewed', `${m.reviewedPct}%`);
  set('kpiUnidentified', formatNumber(m.pending));
  set('kpiAged', formatNumber(m.aged));
  set('kpiSupports', formatNumber(m.support));
  set('kpiProgress', `${m.progressPct}%`);
  set('heroTotal', formatNumber(m.total));
  set('heroPending', formatNumber(m.pending));
  set('heroSupports', formatNumber(m.support));
  set('sidebarClients', formatNumber(m.clients));
  set('sidebarUploads', formatNumber(m.clients - m.closed));
  set('sidebarRecon', formatNumber(m.pending));
  set('sidebarPending', formatNumber(m.openPending));
  set('sidebarNote', `${m.uploaded} de ${m.clients} clientes ya cargaron información.`);
  set('taskCount', `${Math.min(m.openPending, 8)} tareas`);

  /* Etapas del periodo */
  const stages = [
    ['Carga recibida', m.uploaded],
    ['Información procesada', m.processed],
    ['Conciliación', m.reconciling],
    ['Cierre contable', m.closed]
  ];
  $('#stageList').innerHTML = stages.map(([label, count], i) => {
    const pct = Math.round((count / m.clients) * 100);
    const dot = i < 2 ? 'complete' : i === 2 ? 'current' : '';
    return `<div class="stage-row">
      <div class="stage-label"><span class="stage-dot ${dot}"></span><b>${label}</b><small>${count} / ${m.clients} clientes</small></div>
      <div class="progress-track"><i style="width:${pct}%"></i></div><strong>${pct}%</strong></div>`;
  }).join('');

  /* Lo más urgente: los pendientes más viejos, agrupados por cliente */
  const open = PENDING.filter(p => !state.resolvedPending.includes(p.id));
  const seen = new Set();
  const urgent = open.filter(p => {
    if (seen.has(p.clientId)) return false;
    seen.add(p.clientId); return true;
  }).slice(0, 4);

  $('#actionList').innerHTML = urgent.map(p => {
    /* El detalle usa el conteo real del cliente, no el de la bandeja priorizada */
    const real = clientPendingCounts(p.clientId);
    const tone = p.ageDays >= 5 ? 'red' : p.ageDays >= 2 ? 'amber' : 'blue';
    const icon = p.type === 'support' ? '▣' : p.type === 'answered' ? '✓' : '!';
    const detail = p.type === 'support'
      ? `${formatNumber(real.support)} soportes faltantes`
      : p.type === 'answered'
        ? `${open.filter(x => x.clientId === p.clientId && x.type === 'answered').length} respuestas por revisar`
        : `${formatNumber(real.identify)} movimientos sin identificar`;
    return `<button class="action-item" data-go="pending" data-focus-client="${p.clientId}">
      <span class="action-icon ${tone}">${icon}</span>
      <span><b>${escapeHtml(p.company)}</b><small>${detail}</small></span>
      <time>${p.age}</time></button>`;
  }).join('') || '<div class="empty-inline">Todo al día. No hay tareas urgentes.</div>';

  renderRecentClients();
  renderSavingsChart();
}

function renderRecentClients(query = '') {
  const q = query.toLowerCase();
  const rows = CLIENTS
    .filter(c => !q || c.name.toLowerCase().includes(q) || c.nit.includes(q))
    .slice(0, 6);
  $('#recentClientsBody').innerHTML = rows.map(c => `<tr>
    <td>${clientCell(c)}</td>
    <td>${escapeHtml(c.last)}</td>
    <td>${formatNumber(c.movementsCount)}</td>
    <td>${progressCell(c.progress)}</td>
    <td><b>${formatNumber(c.pending)}</b></td>
    <td><span class="status-badge ${c.status}">${c.statusText}</span></td>
    <td><button class="row-button view-client" data-client="${c.id}">Abrir</button></td>
  </tr>`).join('') || emptyRow(7, 'No encontramos clientes con ese nombre o NIT.');
}

const clientCell = c => `<div class="client-cell">
  <div class="company-avatar ${c.color}">${c.initials}</div>
  <div><b>${escapeHtml(c.name)}</b><small>NIT ${c.nit}</small></div></div>`;

const progressCell = p => `<div class="mini-progress">
  <div class="progress-track"><i style="width:${p}%"></i></div><span>${p}%</span></div>`;

const emptyRow = (cols, text) =>
  `<tr class="empty-row"><td colspan="${cols}">${escapeHtml(text)}</td></tr>`;

/* ------------------------------------------------------------
   Clientes
   ------------------------------------------------------------ */
function filteredClients() {
  const q = ($('#clientSearch')?.value || '').toLowerCase().trim();
  const status = $('#clientStatusFilter')?.value || 'all';
  const owner = $('#clientOwnerFilter')?.value || 'all';
  return CLIENTS.filter(c =>
    (!q || c.name.toLowerCase().includes(q) || c.nit.includes(q)) &&
    (status === 'all' || c.status === status) &&
    (owner === 'all' || c.owner === owner));
}

function renderClients() {
  const rows = filteredClients();
  $('#clientsBody').innerHTML = rows.map(c => `<tr>
    <td><input type="checkbox" class="client-check" aria-label="Seleccionar ${escapeHtml(c.name)}" /></td>
    <td>${clientCell(c)}</td>
    <td>${escapeHtml(c.owner)}</td>
    <td>${c.accounts}</td>
    <td>${escapeHtml(c.last)}</td>
    <td>${progressCell(c.progress)}</td>
    <td><b>${formatNumber(c.pending)}</b></td>
    <td><span class="status-badge ${c.status}">${c.statusText}</span></td>
    <td><button class="row-button view-client" data-client="${c.id}">Ver detalle</button></td>
  </tr>`).join('') || emptyRow(9, 'No encontramos clientes con esos filtros.');
  $('#clientCount').textContent = `${rows.length} de ${CLIENTS.length} clientes`;
}

/* ------------------------------------------------------------
   Conciliación
   ------------------------------------------------------------ */
function filteredMovements() {
  const q = ($('#movementSearch')?.value || '').toLowerCase().trim();
  const status = $('#movementStatus')?.value || 'all';
  const bank = $('#movementBank')?.value || 'all';
  return MOVEMENTS.filter(m =>
    m.clientId === state.clientId &&
    (status === 'all' || m.status === status) &&
    (bank === 'all' || m.bank === bank) &&
    (!q || `${m.description} ${m.reference} ${m.match} ${m.value}`.toLowerCase().includes(q)))
    .sort((a, b) => b.day - a.day || a.id - b.id);
}

function renderReconciliation() {
  const c = currentClient();
  const all = MOVEMENTS.filter(m => m.clientId === c.id);
  const matched = all.filter(m => m.status === 'matched').length;
  const pending = all.filter(m => m.status === 'pending' || m.status === 'support').length;
  /* Lo relevante en una conciliación no es el saldo, sino cuánto dinero
     sigue sin explicación. Baja a medida que se resuelven pendientes. */
  const unexplained = all
    .filter(m => m.status === 'pending' || m.status === 'support')
    .reduce((s, m) => s + Math.abs(m.value), 0);

  $('#reconAvatar').className = `company-avatar ${c.color}`;
  $('#reconAvatar').textContent = c.initials;
  $('#reconClientName').textContent = c.name;
  $('#reconClientMeta').textContent = `NIT ${c.nit} · Agosto 2026`;
  $('#reconTotal').textContent = formatNumber(all.length);
  $('#reconMatched').textContent = formatNumber(matched);
  $('#reconPending').textContent = formatNumber(pending);
  $('#reconBalance').textContent = `$${Math.round(unexplained).toLocaleString('es-CO')}`;

  const rows = filteredMovements();
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  if (state.page > pages) state.page = pages;
  const start = (state.page - 1) * state.pageSize;
  const slice = rows.slice(start, start + state.pageSize);

  $('#movementBody').innerHTML = slice.map(m => `<tr data-id="${m.id}">
    <td><input type="checkbox" class="movement-check" data-id="${m.id}" ${state.selectedMovements.has(m.id) ? 'checked' : ''} aria-label="Seleccionar movimiento" /></td>
    <td>${m.date}<small class="cell-sub">${m.time}</small></td>
    <td><b>${m.bank}</b><small class="cell-sub">${m.account}</small></td>
    <td class="description-cell"><b>${escapeHtml(m.description)}</b><small>${m.reference}</small></td>
    <td class="align-right ${m.value < 0 ? 'negative' : 'positive'}">${formatCOP(m.value)}</td>
    <td class="match-cell">${m.match
      ? `<span class="match-chip">${escapeHtml(m.match)} <strong>${m.confidence}</strong></span>`
      : '<span class="no-match">Sin coincidencia</span>'}</td>
    <td><span class="support-icon ${m.support ? '' : 'missing'}" title="${m.support ? 'Soporte adjunto' : 'Sin soporte'}">${m.support ? '✓' : '▣'}</span></td>
    <td><span class="status-badge ${m.status}">${m.statusText}</span></td>
    <td><button class="row-button resolve-movement" data-id="${m.id}">${m.status === 'matched' ? 'Revisar' : 'Resolver'}</button></td>
  </tr>`).join('') || emptyRow(9, 'Ningún movimiento coincide con los filtros aplicados.');

  renderPagination(rows.length, pages);
  updateBulkBar();
}

function renderPagination(totalRows, pages) {
  const start = totalRows === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, totalRows);
  $('#paginationInfo').textContent =
    `Mostrando ${formatNumber(start)}–${formatNumber(end)} de ${formatNumber(totalRows)} movimientos`;

  /* Ventana de páginas con elipsis */
  const numbers = [];
  const push = n => { if (!numbers.includes(n) && n >= 1 && n <= pages) numbers.push(n); };
  push(1);
  for (let n = state.page - 1; n <= state.page + 1; n++) push(n);
  push(pages);
  numbers.sort((a, b) => a - b);

  let html = `<button data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="Página anterior">←</button>`;
  let prev = 0;
  numbers.forEach(n => {
    if (prev && n - prev > 1) html += '<button disabled class="ellipsis">…</button>';
    html += `<button data-page="${n}" class="${n === state.page ? 'active' : ''}">${n}</button>`;
    prev = n;
  });
  html += `<button data-page="${state.page + 1}" ${state.page >= pages ? 'disabled' : ''} aria-label="Página siguiente">→</button>`;
  $('#paginationControls').innerHTML = html;
}

function updateBulkBar() {
  const n = state.selectedMovements.size;
  $('#selectedCount').textContent = n;
  $('#bulkBar').classList.toggle('hidden', n === 0);
  const visible = filteredMovements().slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
  const all = visible.length > 0 && visible.every(m => state.selectedMovements.has(m.id));
  $('#selectAllMovements').checked = all;
}

function bulkApply(action) {
  const ids = [...state.selectedMovements];
  if (!ids.length) return;
  ids.forEach(id => {
    const m = MOVEMENTS.find(x => x.id === id);
    if (!m) return;
    if (action === 'match') {
      patchMovement(m, { status: 'matched', statusText: 'Conciliado', support: true,
        match: m.match || 'Conciliado manualmente', confidence: m.confidence || 'Manual' });
    } else if (action === 'request') {
      patchMovement(m, { status: 'support', statusText: 'Falta soporte' });
    }
  });
  const count = ids.length;
  state.selectedMovements.clear();
  recomputeClient(state.clientId);
  renderReconciliation();
  renderClients();
  renderDashboard();
  toast(action === 'match'
    ? `${count} movimientos marcados como conciliados.`
    : `Se solicitó información al cliente por ${count} movimientos.`, action === 'match' ? '✓' : '✉');
}

function patchMovement(m, patch) {
  Object.assign(m, patch);
  state.overrides[m.id] = { ...(state.overrides[m.id] || {}), ...patch };
  saveState();
}

/* ------------------------------------------------------------
   Pendientes
   ------------------------------------------------------------ */
function openPendingItems() {
  return PENDING.filter(p => !state.resolvedPending.includes(p.id));
}

function renderPendingSummary() {
  const m = metrics();
  const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
  set('pendAll', formatNumber(m.openPending));
  set('pendIdentify', formatNumber(m.identify));
  set('pendSupport', formatNumber(m.missingSupport));
  set('pendAnswered', formatNumber(m.answered));
  const clientsWith = new Set(openPendingItems().map(p => p.clientId)).size;
  set('pendAllClients', `${clientsWith} clientes`);
}

function renderPending() {
  const q = ($('#pendingSearch')?.value || '').toLowerCase().trim();
  const items = openPendingItems().filter(p =>
    (state.pendingFilter === 'all' || p.type === state.pendingFilter) &&
    (!q || p.company.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));

  $('#pendingList').innerHTML = items.slice(0, 60).map(p => `
    <button class="pending-item ${state.selectedPending === p.id ? 'active' : ''}" data-pending="${p.id}">
      <span class="priority ${p.type}">${p.type === 'support' ? '▣' : p.type === 'answered' ? '✓' : '!'}</span>
      <span><b>${escapeHtml(p.company)}</b><small>${escapeHtml(p.description)} · ${formatCOP(p.amount)}</small></span>
      <time>${p.age}</time></button>`).join('') ||
    '<div class="empty-inline">No hay pendientes con ese filtro. Buen síntoma.</div>';

  renderPendingSummary();
}

function showPendingDetail(id) {
  const p = PENDING.find(x => x.id === Number(id));
  if (!p) return;
  state.selectedPending = p.id;
  $$('.pending-item').forEach(x => x.classList.toggle('active', Number(x.dataset.pending) === p.id));

  const typeLabel = p.type === 'support' ? 'Soporte faltante'
    : p.type === 'answered' ? 'Respuesta recibida' : 'Por identificar';

  $('#pendingDetail').innerHTML = `
    <div class="detail-header">
      <div><p class="panel-kicker">${escapeHtml(p.company)}</p>
        <h3>${escapeHtml(p.description)}</h3><p>${escapeHtml(p.message)}</p></div>
      <div class="detail-amount"><b>${formatCOP(p.amount)}</b><small>${p.date}</small></div>
    </div>
    <div class="detail-body">
      <div class="detail-metadata">
        <div><span>Cuenta</span><b>${escapeHtml(p.bank)}</b></div>
        <div><span>Tipo</span><b>${typeLabel}</b></div>
        <div><span>Antigüedad</span><b>${p.age}</b></div>
      </div>
      <div class="conversation">
        <div class="conversation-title">Conversación con el cliente</div>
        <div class="message">
          <div class="avatar">CE</div>
          <div><p>Hola, necesitamos información adicional para poder conciliar este movimiento.</p>
            <small>Ayer, 4:12 p. m.</small></div>
        </div>
        ${p.type === 'answered' ? `<div class="message client">
          <div class="avatar alt">${escapeHtml(p.company.slice(0, 2).toUpperCase())}</div>
          <div><p>Corresponde a compra de insumos. Adjunto la factura.</p>
            <small>Hoy, 11:24 a. m.</small></div></div>` : ''}
      </div>
      <div class="detail-actions">
        <button class="secondary-button" data-detail-action="message">Escribir mensaje</button>
        <button class="secondary-button" data-detail-action="support">Adjuntar soporte</button>
        <button class="primary-button complete-pending" data-pending="${p.id}">Marcar resuelto</button>
      </div>
    </div>`;
}

function resolvePending(id) {
  const pid = Number(id);
  if (!state.resolvedPending.includes(pid)) state.resolvedPending.push(pid);
  const m = MOVEMENTS.find(x => x.id === pid);
  if (m) patchMovement(m, { status: 'matched', statusText: 'Conciliado', support: true,
    match: m.match || 'Resuelto con el cliente', confidence: m.confidence || 'Cliente' });
  saveState();
  if (m) recomputeClient(m.clientId);
  state.selectedPending = null;
  renderPending();
  renderClients();
  renderDashboard();
  $('#pendingDetail').innerHTML = emptyDetail('✓', 'Pendiente resuelto',
    'La información quedó lista para revisión contable.');
  toast('Pendiente marcado como resuelto.');
}

const emptyDetail = (icon, title, text) =>
  `<div class="empty-detail"><div>${icon}</div><h3>${title}</h3><p>${text}</p></div>`;

/* ------------------------------------------------------------
   Portal del cliente
   ------------------------------------------------------------ */
function renderClientPortal() {
  const c = currentClient();
  const mine = openPendingItems().filter(p => p.clientId === c.id);
  const identify = mine.filter(p => p.type === 'identify');
  const supports = mine.filter(p => p.type === 'support');

  $('#clientGreeting').textContent = `Hola, equipo ${c.name.split(' ')[0]} 👋`;
  $('#clientIntro').textContent = mine.length
    ? `Esta semana tienen ${mine.length} tarea${mine.length > 1 ? 's' : ''} pendiente${mine.length > 1 ? 's' : ''}. Resolverlas toma aproximadamente ${Math.max(3, mine.length * 2)} minutos.`
    : 'No tienen tareas pendientes. La información del periodo está completa.';
  $('#clientRing').textContent = `${c.progress}%`;
  $('#clientRing').parentElement.style.setProperty('--value', c.progress);
  $('#clientPeriodState').textContent =
    c.progress >= 97 ? 'Información completa' : c.progress >= 70 ? 'Información casi lista' : 'Falta información';
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  $('#clientTaskIdentify').textContent = identify.length
    ? `${plural(identify.length, 'transacción necesita', 'transacciones necesitan')} contexto.`
    : 'No hay movimientos por identificar.';
  $('#clientTaskSupport').textContent = supports.length
    ? `${plural(supports.length, 'documento aún no ha', 'documentos aún no han')} sido adjuntado${supports.length === 1 ? '' : 's'}.`
    : 'No hay soportes pendientes.';
  $('#clientPendingCount').textContent =
    `${mine.length} ${mine.length === 1 ? 'pendiente' : 'pendientes'}`;

  $('#clientQuestionList').innerHTML = mine.slice(0, 4).map(item => `
    <div class="client-question">
      <div class="question-top">
        <div><h4>${escapeHtml(item.description)}</h4><p>${escapeHtml(item.bank)} · ${item.date}</p></div>
        <div class="question-value"><b>${formatCOP(item.amount)}</b>
          <small>${item.type === 'support' ? 'Falta soporte' : 'Por identificar'}</small></div>
      </div>
      <div class="question-options">
        <button class="quick-answer" data-pending="${item.id}" data-answer="Pago a proveedor">Pago a proveedor</button>
        <button class="quick-answer" data-pending="${item.id}" data-answer="Transferencia entre cuentas propias">Transferencia propia</button>
        <button class="quick-answer" data-pending="${item.id}">Otro concepto</button>
        <button class="quick-answer" data-pending="${item.id}">＋ Adjuntar soporte</button>
      </div>
    </div>`).join('') ||
    '<div class="empty-inline">No hay movimientos por resolver. Todo en orden.</div>';
}

/* ------------------------------------------------------------
   Gráficas SVG
   ------------------------------------------------------------ */
function renderEfficiencyChart() {
  const host = $('#efficiencyChart');
  if (!host) return;
  const W = 640, H = 260, pad = { t: 16, r: 12, b: 30, l: 38 };
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const bw = innerW / EFFICIENCY_SERIES.length;

  const gridlines = [0, 25, 50, 75, 100].map(v => {
    const y = pad.t + innerH - (v / 100) * innerH;
    return `<line class="grid" x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}"></line>
      <text class="axis" x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${v}%</text>`;
  }).join('');

  const bars = EFFICIENCY_SERIES.map((d, i) => {
    const x = pad.l + i * bw + bw * 0.24;
    const w = bw * 0.52;
    let y = pad.t + innerH;
    const seg = [['auto', d.auto], ['manual', d.manual], ['client', d.client]].map(([key, val]) => {
      const h = (val / 100) * innerH;
      y -= h;
      return `<rect class="seg ${key}" x="${x}" y="${y}" width="${w}" height="${h}" rx="3">
        <title>${d.month} · ${key === 'auto' ? 'Conciliación automática' : key === 'manual' ? 'Revisión manual' : 'Pendientes del cliente'}: ${val}%</title></rect>`;
    }).join('');
    return seg + `<text class="axis" x="${x + w / 2}" y="${H - 10}" text-anchor="middle">${d.month}</text>`;
  }).join('');

  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
    aria-label="Evolución de la conciliación automática de marzo a agosto: sube de 56% a 82%.">
    ${gridlines}${bars}</svg>`;
}

function renderSavingsChart() {
  const host = $('#savingsChart');
  if (!host) return;
  const W = 320, H = 110, pad = 8;
  const max = Math.max(...SAVINGS_SERIES.map(d => d.hours));
  const step = (W - pad * 2) / (SAVINGS_SERIES.length - 1);
  const pts = SAVINGS_SERIES.map((d, i) => [
    pad + i * step,
    H - pad - (d.hours / max) * (H - pad * 2)
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts.at(-1)[0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;

  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
    aria-label="Horas de trabajo manual ahorradas por mes: de 42 en marzo a ${max} en agosto.">
    <defs><linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--gold)" stop-opacity=".28"/>
      <stop offset="100%" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#savingsFill)"></path>
    <path d="${line}" fill="none" stroke="var(--gold)" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round"></path>
    ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 4.5 : 2.5}"
      fill="var(--gold)"><title>${SAVINGS_SERIES[i].month}: ${SAVINGS_SERIES[i].hours} horas</title></circle>`).join('')}
  </svg>`;
  const last = SAVINGS_SERIES.at(-1).hours;
  const el = $('#savingsValue');
  if (el) el.textContent = `${last} h`;
}

/* ------------------------------------------------------------
   Exportaciones reales
   ------------------------------------------------------------ */
const stamp = () => new Date().toISOString().slice(0, 10);

const EXPORTS = {
  reconciliation() {
    const c = currentClient();
    const rows = MOVEMENTS.filter(m => m.clientId === c.id).map(m => [
      m.date, m.bank, m.account, m.description, m.reference,
      m.value.toString().replace('.', ','), m.match, m.confidence,
      m.support ? 'Sí' : 'No', m.statusText
    ]);
    return {
      name: `conciliacion-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp()}.csv`,
      content: toCSV(['Fecha', 'Banco', 'Cuenta', 'Descripción bancaria', 'Referencia',
        'Valor', 'Coincidencia', 'Confianza', 'Soporte', 'Estado'], rows),
      note: `${rows.length} movimientos de ${c.name}`
    };
  },
  supports() {
    const rows = openPendingItems().filter(p => p.type === 'support').map(p => {
      const c = CLIENTS.find(x => x.id === p.clientId);
      return [p.company, c?.owner || '', p.date, p.bank, p.description,
        p.amount.toString().replace('.', ','), p.age];
    });
    return {
      name: `soportes-pendientes-${stamp()}.csv`,
      content: toCSV(['Cliente', 'Responsable', 'Fecha', 'Cuenta', 'Descripción',
        'Valor', 'Antigüedad'], rows),
      note: `${rows.length} soportes pendientes`
    };
  },
  clients() {
    const rows = CLIENTS.map(c => [c.name, c.nit, c.owner, c.accounts, c.last,
      c.movementsCount, `${c.progress}%`, c.pending, c.statusText]);
    return {
      name: `seguimiento-clientes-${stamp()}.csv`,
      content: toCSV(['Cliente', 'NIT', 'Responsable', 'Cuentas', 'Última carga',
        'Movimientos', 'Avance', 'Pendientes', 'Estado'], rows),
      note: `${rows.length} clientes`
    };
  },
  accounting() {
    /* Formato plano homologado, listo para importar */
    const c = currentClient();
    const rows = MOVEMENTS.filter(m => m.clientId === c.id && m.status === 'matched').map(m => [
      m.date, c.nit, m.value < 0 ? '5' : '4', m.description.slice(0, 40),
      m.value < 0 ? Math.abs(m.value).toString().replace('.', ',') : '',
      m.value > 0 ? m.value.toString().replace('.', ',') : '',
      m.reference, m.match
    ]);
    return {
      name: `exportacion-contable-${c.nit.replace(/\./g, '')}-${stamp()}.csv`,
      content: toCSV(['Fecha', 'NIT', 'Clase', 'Detalle', 'Débito', 'Crédito',
        'Documento', 'Concepto'], rows),
      note: `${rows.length} asientos homologados de ${c.name}`
    };
  }
};

function runExport(key, button) {
  const original = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'Generando…'; }
  setTimeout(() => {
    const result = EXPORTS[key]();
    downloadFile(result.name, result.content);
    if (button) { button.disabled = false; button.textContent = original; }
    toast(`Archivo descargado: ${result.note}.`, '↓');
  }, 600);
}

/* ------------------------------------------------------------
   Panel lateral de cliente (drawer)
   ------------------------------------------------------------ */
function openDrawer(clientId) {
  const c = CLIENTS.find(x => x.id === Number(clientId)) || CLIENTS[0];
  const { identify, support: supports } = clientPendingCounts(c.id);

  $('#drawerClientName').textContent = c.name;
  $('#drawerAvatar').textContent = c.initials;
  $('#drawerAvatar').className = `company-avatar ${c.color}`;
  $('#drawerNit').textContent = `NIT ${c.nit}`;
  $('#drawerOwner').textContent = `Responsable: ${c.owner}`;
  $('#drawerBadge').textContent = c.statusText;
  $('#drawerBadge').className = `status-badge ${c.status}`;
  $('#drawerProgressValue').textContent = `${c.progress}%`;
  $('#drawerProgressBar').style.width = `${c.progress}%`;
  $('#drawerMovements').textContent = formatNumber(c.movementsCount);
  $('#drawerPending').textContent = formatNumber(identify);
  $('#drawerSupports').textContent = formatNumber(supports);
  $('#drawerChecklist').innerHTML = `
    <div class="check-row done"><i>✓</i><span><b>Extractos bancarios</b><small>${c.accounts} cuentas · procesadas</small></span></div>
    <div class="check-row done"><i>✓</i><span><b>Ingresos y egresos</b><small>${formatNumber(c.movementsCount)} registros · procesados</small></span></div>
    <div class="check-row ${identify ? 'current' : 'done'}"><i>${identify ? '!' : '✓'}</i><span><b>Resolver movimientos</b><small>${identify} pendientes de respuesta</small></span>${identify ? '<button data-go="pending">Abrir</button>' : ''}</div>
    <div class="check-row ${supports ? '' : 'done'}"><i>${supports ? '▣' : '✓'}</i><span><b>Adjuntar soportes</b><small>${supports} documentos faltantes</small></span>${supports ? '<button data-go="pending">Abrir</button>' : ''}</div>`;

  state.drawerClientId = c.id;
  $('#clientDrawer').classList.add('open');
  $('#drawerBackdrop').classList.add('open');
  $('#clientDrawer').setAttribute('aria-hidden', 'false');
  $('#drawerClose').focus();
}

function closeDrawer() {
  $('#clientDrawer').classList.remove('open');
  $('#drawerBackdrop').classList.remove('open');
  $('#clientDrawer').setAttribute('aria-hidden', 'true');
}

/* ------------------------------------------------------------
   Modal de resolución de movimiento
   ------------------------------------------------------------ */
let lastFocused = null;

function openMovementModal(id, presetAnswer) {
  const m = MOVEMENTS.find(x => x.id === Number(id)) || MOVEMENTS[0];
  lastFocused = document.activeElement;
  $('#movementModal').dataset.id = m.id;
  $('#modalTitle').textContent = m.description.charAt(0) + m.description.slice(1).toLowerCase();
  $('#modalDate').textContent = `${m.date} · ${m.time}`;
  $('#modalBank').textContent = `${m.bank} · ${m.account}`;
  $('#modalValue').textContent = formatCOP(m.value);
  $('#modalValue').className = m.value < 0 ? 'negative' : 'positive';
  $('#modalDescription').textContent = m.description;
  $('#modalConcept').value = presetAnswer || '';
  $('#modalThird').value = '';
  $('#modalInvoice').value = '';
  $('#modalNote').value = '';

  /* Sugerencia del motor: lo que hace útil la herramienta */
  const hint = $('#modalSuggestion');
  if (m.match) {
    hint.hidden = false;
    hint.innerHTML = `<i>✦</i><div><b>Sugerencia del sistema</b>
      <small>Coincide con <b>${escapeHtml(m.match)}</b> (${m.confidence} de confianza).</small></div>
      <button type="button" class="text-button" id="acceptSuggestion">Aceptar</button>`;
  } else {
    hint.hidden = false;
    hint.innerHTML = `<i>?</i><div><b>Sin coincidencia automática</b>
      <small>No encontramos factura ni soporte para este valor.</small></div>`;
  }

  $('#movementModal').classList.add('open');
  $('#modalBackdrop').classList.add('open');
  $('#modalConcept').focus();
}

function closeModal() {
  $('#movementModal').classList.remove('open');
  $('#modalBackdrop').classList.remove('open');
  if (lastFocused) lastFocused.focus();
}

function saveMovementAnswer() {
  const concept = $('#modalConcept').value;
  if (!concept) { toast('Selecciona el concepto del movimiento.', '!'); $('#modalConcept').focus(); return; }
  const id = Number($('#movementModal').dataset.id);
  const m = MOVEMENTS.find(x => x.id === id);
  if (m) {
    patchMovement(m, {
      status: 'review', statusText: 'En revisión',
      match: concept, confidence: 'Cliente', support: true
    });
    if (!state.resolvedPending.includes(id)) state.resolvedPending.push(id);
    saveState();
  }
  closeModal();
  if (m) recomputeClient(m.clientId);
  renderReconciliation();
  renderPending();
  renderClients();
  renderDashboard();
  renderClientPortal();
  toast('Respuesta guardada y enviada al equipo contable.');
}

/* ------------------------------------------------------------
   Modal de nuevo cliente
   ------------------------------------------------------------ */
function openClientModal() {
  lastFocused = document.activeElement;
  $('#newClientForm').reset();
  $('#clientModal').classList.add('open');
  $('#modalBackdrop').classList.add('open');
  $('#newClientName').focus();
}

function closeClientModal() {
  $('#clientModal').classList.remove('open');
  $('#modalBackdrop').classList.remove('open');
  if (lastFocused) lastFocused.focus();
}

function createClient(event) {
  event.preventDefault();
  const name = $('#newClientName').value.trim();
  const nit = $('#newClientNit').value.trim();
  if (!name || !nit) { toast('Nombre y NIT son obligatorios.', '!'); return; }

  const initials = companyInitials(name);
  const client = {
    id: Math.max(...CLIENTS.map(c => c.id)) + 1,
    name, nit, initials,
    color: ['gold', 'blue', 'green', 'purple', 'red'][CLIENTS.length % 5],
    owner: $('#newClientOwner').value,
    accounts: Number($('#newClientAccounts').value) || 1,
    last: 'Sin cargas',
    movementsCount: 0, matched: 0, pending: 0, progress: 0,
    status: 'late', statusText: 'Sin cargar', quality: 0.5
  };
  CLIENTS.push(client);
  state.extraClients.push(client);
  saveState();
  closeClientModal();
  renderClients();
  renderDashboard();
  refreshClientSelectors();
  toast(`${name} fue creado. Ya puede recibir cargas.`, '＋');
}

/* ------------------------------------------------------------
   Selectores de cliente
   ------------------------------------------------------------ */
function refreshClientSelectors() {
  const options = CLIENTS.map(c =>
    `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  ['#reconClientSelect', '#uploadClient', '#reportClientSelect'].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = options;
    el.value = state.clientId;
  });
  const owners = ['<option value="all">Todos los responsables</option>']
    .concat([...new Set(CLIENTS.map(c => c.owner))].map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`));
  const of = $('#clientOwnerFilter');
  if (of) { const v = of.value; of.innerHTML = owners.join(''); of.value = v || 'all'; }
}

function setClient(id) {
  state.clientId = Number(id);
  state.page = 1;
  state.selectedMovements.clear();
  refreshClientSelectors();
  renderReconciliation();
  renderClientPortal();
}

/* ------------------------------------------------------------
   Notificaciones
   ------------------------------------------------------------ */
function renderNotifications() {
  const open = openPendingItems();
  const items = [
    { icon: '⇧', title: 'Nueva carga recibida', text: `${CLIENTS[0].name} · Movimientos agosto.xlsx`, time: 'hace 18 min' },
    { icon: '✦', title: 'Conciliación automática terminada', text: `${formatNumber(metrics().matched)} coincidencias encontradas`, time: 'hace 1 h' },
    { icon: '!', title: `${formatNumber(open.filter(p => p.ageDays >= 5).length)} pendientes con más de 5 días`, text: 'Requieren seguimiento del responsable', time: 'hoy' },
    { icon: '✉', title: 'Respuesta del cliente', text: `${open.find(p => p.type === 'answered')?.company || 'Un cliente'} respondió un movimiento`, time: 'hoy, 11:24' }
  ];
  $('#notifList').innerHTML = items.map(n => `
    <div class="notif-item"><i>${n.icon}</i>
      <div><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.text)}</small></div>
      <time>${n.time}</time></div>`).join('');
}

function toggleNotifications(force) {
  const panel = $('#notifPanel');
  const open = force ?? !panel.classList.contains('open');
  panel.classList.toggle('open', open);
  $('#notifButton').setAttribute('aria-expanded', String(open));
  if (open) renderNotifications();
}

/* ------------------------------------------------------------
   Tema claro / oscuro
   ------------------------------------------------------------ */
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  $('#themeToggle').setAttribute('aria-label',
    theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  $('#themeToggle').textContent = theme === 'dark' ? '☀' : '☾';
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f1113' : '#121417');
  saveState();
}

/* ------------------------------------------------------------
   Navegación
   ------------------------------------------------------------ */
const titles = {
  dashboard: 'Resumen general',
  clients: 'Clientes',
  uploads: 'Cargas y documentos',
  reconciliation: 'Conciliación bancaria',
  pending: 'Pendientes del cliente',
  reports: 'Reportes',
  clientPortal: 'Portal del cliente'
};

function navigate(view) {
  state.view = view;
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view-${view}`)?.classList.add('active');
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  $('#pageTitle').textContent = view === 'clientPortal'
    ? `Portal ${currentClient().name}` : (titles[view] || 'In-Plementar Conecta');
  $('.content').scrollTo?.({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.innerWidth <= 900) $('#sidebar').classList.remove('open');
  if (view === 'reports') renderEfficiencyChart();
  if (view === 'reconciliation') renderReconciliation();
  if (view === 'clientPortal') renderClientPortal();
}

/* ------------------------------------------------------------
   Paleta de comandos (Ctrl/⌘ + K)
   ------------------------------------------------------------ */
function paletteCommands() {
  const nav = Object.entries(titles).map(([view, label]) => ({
    label: `Ir a ${label}`, hint: 'Navegación', run: () => navigate(view)
  }));
  const clients = CLIENTS.map(c => ({
    label: c.name, hint: 'Abrir cliente', run: () => { setClient(c.id); navigate('reconciliation'); }
  }));
  const actions = [
    { label: 'Ejecutar conciliación automática', hint: 'Acción', run: () => { navigate('reconciliation'); runAutoMatch(); } },
    { label: 'Descargar conciliación en CSV', hint: 'Exportar', run: () => runExport('reconciliation') },
    { label: 'Descargar seguimiento de clientes', hint: 'Exportar', run: () => runExport('clients') },
    { label: 'Cambiar modo claro / oscuro', hint: 'Preferencias', run: () => applyTheme(state.theme === 'dark' ? 'light' : 'dark') },
    { label: 'Reiniciar la demostración', hint: 'Preferencias', run: resetDemo }
  ];
  return [...actions, ...nav, ...clients];
}

function openPalette() {
  $('#palette').classList.add('open');
  $('#paletteInput').value = '';
  renderPalette();
  $('#paletteInput').focus();
}
function closePalette() { $('#palette').classList.remove('open'); }

function renderPalette() {
  const q = $('#paletteInput').value.toLowerCase().trim();
  const list = paletteCommands()
    .filter(c => !q || c.label.toLowerCase().includes(q))
    .slice(0, 8);
  $('#paletteList').innerHTML = list.map((c, i) => `
    <button class="palette-item ${i === 0 ? 'active' : ''}" data-index="${i}">
      <span>${escapeHtml(c.label)}</span><small>${c.hint}</small></button>`).join('') ||
    '<div class="empty-inline">Sin resultados.</div>';
  $('#palette').dataset.results = JSON.stringify(list.map(c => c.label));
}

function runPaletteIndex(index) {
  const q = $('#paletteInput').value.toLowerCase().trim();
  const list = paletteCommands().filter(c => !q || c.label.toLowerCase().includes(q)).slice(0, 8);
  const cmd = list[index];
  if (cmd) { closePalette(); cmd.run(); }
}

/* ------------------------------------------------------------
   Acciones simuladas
   ------------------------------------------------------------ */
function runAutoMatch() {
  const b = $('#autoMatchBtn');
  b.disabled = true;
  b.textContent = 'Analizando movimientos…';
  const candidates = MOVEMENTS.filter(m => m.clientId === state.clientId && m.status === 'suggested');
  setTimeout(() => {
    candidates.forEach(m => patchMovement(m, {
      status: 'matched', statusText: 'Conciliado', support: true,
      confidence: `${90 + Math.floor(Math.random() * 9)}%`
    }));
    b.disabled = false;
    b.textContent = '✦ Ejecutar conciliación';
    recomputeClient(state.clientId);
    renderReconciliation();
    renderClients();
    renderDashboard();
    toast(`Conciliación completada: ${formatNumber(candidates.length)} coincidencias confirmadas.`, '✦');
  }, 1400);
}

function resetDemo() {
  if (!confirm('¿Reiniciar la demostración? Se borrarán los cambios hechos durante la presentación.')) return;
  resetting = true;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin almacenamiento */ }
  location.reload();
}

/* ------------------------------------------------------------
   Carga de archivos
   ------------------------------------------------------------ */
let selectedFiles = [];

const FILE_KIND = ext =>
  ['XLSX', 'XLS', 'CSV'].includes(ext) ? { cls: 'xls', kind: 'Movimientos contables' }
  : ext === 'PDF' ? { cls: 'pdf', kind: 'Extracto bancario' }
  : ['JPG', 'JPEG', 'PNG'].includes(ext) ? { cls: 'img', kind: 'Soporte' }
  : { cls: 'zip', kind: 'Paquete de soportes' };

function addFiles(files) {
  const valid = files.filter(f => f.size <= 25 * 1024 * 1024);
  if (valid.length < files.length) toast('Algunos archivos superan los 25 MB y fueron omitidos.', '!');
  selectedFiles = [...selectedFiles, ...valid];
  renderFiles();
}

function renderFiles() {
  $('#fileList').innerHTML = selectedFiles.map((f, i) => {
    const ext = (f.name.split('.').pop() || 'FILE').toUpperCase();
    const { cls, kind } = FILE_KIND(ext);
    return `<div class="selected-file">
      <span class="file-type ${cls}">${ext.slice(0, 4)}</span>
      <div><b>${escapeHtml(f.name)}</b>
        <small>${(f.size / 1024 / 1024).toFixed(2)} MB · detectado como ${kind}</small></div>
      <button class="remove-file" data-index="${i}" aria-label="Quitar archivo">×</button></div>`;
  }).join('');
  $('#fileCount').textContent = selectedFiles.length
    ? `${selectedFiles.length} archivo${selectedFiles.length > 1 ? 's' : ''} seleccionado${selectedFiles.length > 1 ? 's' : ''}`
    : 'No hay archivos seleccionados';
  $('#processBtn').disabled = selectedFiles.length === 0;
}

function processFiles() {
  const btn = $('#processBtn');
  const bar = $('#processProgress');
  btn.disabled = true;
  bar.hidden = false;
  const steps = [
    'Leyendo archivos…', 'Reconociendo banco y periodo…', 'Homologando columnas…',
    'Cruzando con ingresos y egresos…', 'Generando excepciones…'
  ];
  let p = 0;
  const timer = setInterval(() => {
    p += 4;
    $('#processBarFill').style.width = `${p}%`;
    $('#processLabel').textContent = steps[Math.min(Math.floor(p / 21), steps.length - 1)];
    btn.textContent = `Procesando ${p}%`;
    if (p >= 100) {
      clearInterval(timer);
      const c = currentClient();
      const found = MOVEMENTS.filter(m => m.clientId === c.id).length;
      const exceptions = MOVEMENTS.filter(m => m.clientId === c.id && (m.status === 'pending' || m.status === 'support')).length;
      setTimeout(() => {
        bar.hidden = true;
        $('#processBarFill').style.width = '0%';
        btn.textContent = 'Procesar archivos →';
        selectedFiles = [];
        renderFiles();
        toast(`Procesado: ${formatNumber(found)} movimientos y ${formatNumber(exceptions)} excepciones.`, '✦');
      }, 400);
    }
  }, 60);
}

/* ------------------------------------------------------------
   Splash de bienvenida
   ------------------------------------------------------------ */
function initSplash() {
  const splash = $('#splash');
  if (!splash) return;
  const m = metrics();
  $('#splashClients').textContent = formatNumber(m.clients);
  $('#splashMovements').textContent = formatNumber(m.total);
  const dismiss = () => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500);
  };
  $('#splashStart').addEventListener('click', dismiss);
  splash.addEventListener('click', e => { if (e.target === splash) dismiss(); });
  setTimeout(() => $('#splashStart')?.focus(), 300);
}

/* ------------------------------------------------------------
   Eventos
   ------------------------------------------------------------ */
function bindEvents() {
  /* Navegación principal */
  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));

  /* Delegación global */
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) {
      if (go.dataset.focusClient) setClient(go.dataset.focusClient);
      navigate(go.dataset.go); closeDrawer(); return;
    }
    const vc = e.target.closest('.view-client');
    if (vc) { openDrawer(vc.dataset.client); return; }

    const rm = e.target.closest('.resolve-movement');
    if (rm) { openMovementModal(rm.dataset.id); return; }

    const pi = e.target.closest('.pending-item');
    if (pi) { showPendingDetail(pi.dataset.pending); return; }

    const qa = e.target.closest('.quick-answer');
    if (qa) { openMovementModal(qa.dataset.pending, qa.dataset.answer); return; }

    const cp = e.target.closest('.complete-pending');
    if (cp) { resolvePending(cp.dataset.pending); return; }

    const page = e.target.closest('#paginationControls button[data-page]');
    if (page && !page.disabled) {
      state.page = Number(page.dataset.page);
      renderReconciliation();
      $('.recon-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const bulk = e.target.closest('[data-bulk]');
    if (bulk) { bulkApply(bulk.dataset.bulk); return; }

    const exp = e.target.closest('[data-export]');
    if (exp) { runExport(exp.dataset.export, exp); return; }

    const rf = e.target.closest('.remove-file');
    if (rf) { selectedFiles.splice(Number(rf.dataset.index), 1); renderFiles(); return; }

    const pal = e.target.closest('.palette-item');
    if (pal) { runPaletteIndex(Number(pal.dataset.index)); return; }

    const accept = e.target.closest('#acceptSuggestion');
    if (accept) {
      const m = MOVEMENTS.find(x => x.id === Number($('#movementModal').dataset.id));
      $('#modalConcept').value = 'Pago a proveedor';
      $('#modalThird').value = m?.match || '';
      toast('Sugerencia aplicada. Revisa y guarda.', '✦');
      return;
    }

    const da = e.target.closest('[data-detail-action]');
    if (da) {
      toast(da.dataset.detailAction === 'message'
        ? 'Mensaje enviado al cliente.' : 'Solicitud de soporte enviada.', '✉');
      return;
    }

    /* Cerrar notificaciones al hacer clic afuera */
    if (!e.target.closest('#notifPanel') && !e.target.closest('#notifButton')) {
      toggleNotifications(false);
    }
  });

  /* Sidebar y paneles */
  $('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerBackdrop').addEventListener('click', closeDrawer);
  $$('.modal-close').forEach(x => x.addEventListener('click', () => { closeModal(); closeClientModal(); }));
  $('#modalBackdrop').addEventListener('click', () => { closeModal(); closeClientModal(); });
  $('#notifButton').addEventListener('click', e => { e.stopPropagation(); toggleNotifications(); });
  $('#themeToggle').addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));
  $('#resetDemo').addEventListener('click', resetDemo);

  /* Cambio de rol equipo / cliente */
  $('#roleSwitch').addEventListener('click', () => {
    state.clientMode = document.body.classList.toggle('client-mode');
    $('#roleLabel').textContent = state.clientMode
      ? `Cliente: ${currentClient().name}` : 'Equipo In-Plementar';
    navigate(state.clientMode ? 'clientPortal' : 'dashboard');
    toast(state.clientMode ? 'Vista del cliente activada' : 'Vista del equipo activada', '↔');
  });

  /* Filtros de clientes */
  $('#clientSearch').addEventListener('input', debounce(renderClients));
  $('#clientStatusFilter').addEventListener('change', renderClients);
  $('#clientOwnerFilter').addEventListener('change', renderClients);
  $('#newClientBtn').addEventListener('click', openClientModal);
  $('#newClientForm').addEventListener('submit', createClient);
  $('.client-search').addEventListener('input', debounce(e => renderRecentClients(e.target.value)));

  /* Filtros de conciliación */
  ['movementSearch', 'movementStatus', 'movementBank'].forEach(id => {
    const el = $('#' + id);
    const handler = () => { state.page = 1; renderReconciliation(); };
    el.addEventListener(id === 'movementSearch' ? 'input' : 'change',
      id === 'movementSearch' ? debounce(handler) : handler);
  });
  $('#reconClientSelect').addEventListener('change', e => setClient(e.target.value));
  $('#uploadClient').addEventListener('change', e => setClient(e.target.value));
  $('#reportClientSelect').addEventListener('change', e => setClient(e.target.value));
  $('#autoMatchBtn').addEventListener('click', runAutoMatch);

  $('#selectAllMovements').addEventListener('change', e => {
    const visible = filteredMovements().slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    visible.forEach(m => e.target.checked
      ? state.selectedMovements.add(m.id) : state.selectedMovements.delete(m.id));
    renderReconciliation();
  });

  $('#movementBody').addEventListener('change', e => {
    const check = e.target.closest('.movement-check');
    if (!check) return;
    const id = Number(check.dataset.id);
    check.checked ? state.selectedMovements.add(id) : state.selectedMovements.delete(id);
    updateBulkBar();
  });

  /* Pendientes */
  $$('.pending-summary').forEach(btn => btn.addEventListener('click', () => {
    $$('.pending-summary').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    state.pendingFilter = btn.dataset.pendingFilter;
    state.selectedPending = null;
    renderPending();
    $('#pendingDetail').innerHTML = emptyDetail('↗', 'Selecciona un pendiente',
      'Aquí aparecerá el movimiento, la conversación y los soportes relacionados.');
  }));
  $('#pendingSearch').addEventListener('input', debounce(renderPending));
  $('#sendReminderBtn').addEventListener('click', () => {
    const clientsWith = new Set(openPendingItems().map(p => p.clientId)).size;
    toast(`Se enviaron recordatorios a ${clientsWith} clientes.`, '✉');
  });

  /* Cargas */
  const dropZone = $('#dropZone');
  $('#fileInput').addEventListener('change', e => addFiles([...e.target.files]));
  ['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, e => {
    e.preventDefault(); dropZone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, e => {
    e.preventDefault(); dropZone.classList.remove('dragging');
  }));
  dropZone.addEventListener('drop', e => addFiles([...e.dataTransfer.files]));
  $('#processBtn').addEventListener('click', processFiles);

  /* Modales */
  $('#saveMovementBtn').addEventListener('click', saveMovementAnswer);
  $('#periodSelect').addEventListener('change', e => toast(`Periodo cambiado a ${e.target.value}.`, '↻'));
  $('#clientResolveBtn').addEventListener('click', () => {
    const first = openPendingItems().find(p => p.clientId === state.clientId);
    if (first) openMovementModal(first.id);
    else toast('No hay movimientos por resolver.', '✓');
  });

  /* Paleta de comandos */
  $('#paletteInput').addEventListener('input', renderPalette);
  $('#paletteInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); runPaletteIndex(0); }
  });
  $('#palette').addEventListener('click', e => { if (e.target.id === 'palette') closePalette(); });
  $('#paletteTrigger').addEventListener('click', openPalette);

  /* Teclado */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); openPalette(); return;
    }
    if (e.key === 'Escape') {
      closeDrawer(); closeModal(); closeClientModal(); closePalette();
      toggleNotifications(false);
      $('#sidebar').classList.remove('open');
    }
  });
}

/* ------------------------------------------------------------
   Arranque
   ------------------------------------------------------------ */
function init() {
  loadState();
  applyOverrides();
  [...new Set(Object.keys(state.overrides).map(id =>
    MOVEMENTS.find(m => m.id === Number(id))?.clientId).filter(Boolean))]
    .forEach(recomputeClient);
  applyTheme(state.theme);
  refreshClientSelectors();
  bindEvents();
  initSplash();

  renderDashboard();
  renderClients();
  renderReconciliation();
  renderPending();
  renderClientPortal();
  renderEfficiencyChart();

  $('#pendingDetail').innerHTML = emptyDetail('↗', 'Selecciona un pendiente',
    'Aquí aparecerá el movimiento, la conversación y los soportes relacionados.');
}

init();

})();
