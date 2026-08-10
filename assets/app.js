const clients = [
  { id: 1, initials:'EC', color:'gold', name:'ECOtoy SAS', nit:'901.458.220-3', owner:'Camila Estrada', accounts:2, last:'Hoy, 10:42', movements:'1.248', progress:87, pending:34, status:'client', statusText:'Requiere cliente' },
  { id: 2, initials:'GM', color:'blue', name:'Grupo Marea', nit:'900.774.190-1', owner:'Laura Méndez', accounts:3, last:'Ayer, 16:08', movements:'3.804', progress:74, pending:15, status:'review', statusText:'En revisión' },
  { id: 3, initials:'NI', color:'green', name:'Nova Ingeniería', nit:'901.092.663-8', owner:'Andrés Rojas', accounts:4, last:'Hoy, 08:17', movements:'5.612', progress:91, pending:8, status:'review', statusText:'En revisión' },
  { id: 4, initials:'FH', color:'purple', name:'Fundación Horizonte', nit:'830.441.786-5', owner:'Camila Estrada', accounts:1, last:'28 jul, 11:10', movements:'682', progress:28, pending:42, status:'late', statusText:'Sin cargar' },
  { id: 5, initials:'AL', color:'red', name:'Alimentos La Estación', nit:'900.218.119-0', owner:'Laura Méndez', accounts:2, last:'1 ago, 14:32', movements:'2.310', progress:100, pending:0, status:'ready', statusText:'Listo' },
  { id: 6, initials:'CA', color:'blue', name:'Constructora Alto SAS', nit:'901.334.552-7', owner:'Andrés Rojas', accounts:5, last:'31 jul, 09:41', movements:'4.126', progress:63, pending:21, status:'client', statusText:'Requiere cliente' },
  { id: 7, initials:'BC', color:'green', name:'Biocare Colombia', nit:'900.687.410-2', owner:'Camila Estrada', accounts:2, last:'Hoy, 11:56', movements:'1.994', progress:96, pending:3, status:'review', statusText:'En revisión' },
  { id: 8, initials:'SV', color:'purple', name:'Studio Vértice', nit:'901.812.045-6', owner:'Laura Méndez', accounts:1, last:'2 ago, 17:20', movements:'842', progress:100, pending:0, status:'ready', statusText:'Listo' }
];

const movements = [
  {id:1,date:'05/08/2026',bank:'Bancolombia',account:'01657',description:'TRANSFERENCIAS A NEQUI',reference:'Ref. 984220',value:-500000,match:'',confidence:'',support:false,status:'pending',statusText:'Sin identificar'},
  {id:2,date:'05/08/2026',bank:'Bancolombia',account:'01657',description:'CONSIGNACION CORRESPONSAL CB',reference:'Ref. 774102',value:474000,match:'Factura FV-1841',confidence:'98%',support:true,status:'matched',statusText:'Conciliado'},
  {id:3,date:'05/08/2026',bank:'Bancolombia',account:'01657',description:'PAGO LLAVE MARCOS GOM',reference:'Ref. 118490',value:-90000,match:'Gasto operativo',confidence:'82%',support:false,status:'support',statusText:'Falta soporte'},
  {id:4,date:'05/08/2026',bank:'Bancolombia',account:'01657',description:'TRANSFERENCIA CTA SUC VIRTUAL',reference:'Ref. 920018',value:1980000,match:'Factura FV-1836',confidence:'95%',support:true,status:'matched',statusText:'Conciliado'},
  {id:5,date:'05/08/2026',bank:'Bancolombia',account:'01657',description:'TRANSFERENCIAS A NEQUI',reference:'Ref. 783021',value:-70000,match:'Caja menor',confidence:'71%',support:false,status:'suggested',statusText:'Posible coincidencia'},
  {id:6,date:'04/08/2026',bank:'Davivienda',account:'4082',description:'PAGO PROV COORDINADORA ME',reference:'Ref. 661004',value:-377052,match:'Factura FC-991',confidence:'93%',support:true,status:'matched',statusText:'Conciliado'},
  {id:7,date:'04/08/2026',bank:'Bancolombia',account:'01657',description:'PAGO LLAVE GLORIA STE',reference:'Ref. 510403',value:-668000,match:'',confidence:'',support:false,status:'pending',statusText:'Sin identificar'},
  {id:8,date:'04/08/2026',bank:'Bancolombia',account:'01657',description:'PAGO LLAVE MARIA GUE',reference:'Ref. 774911',value:-321000,match:'Honorarios julio',confidence:'76%',support:false,status:'support',statusText:'Falta soporte'},
  {id:9,date:'04/08/2026',bank:'Davivienda',account:'4082',description:'TRANSFERENCIA CTA SUC VIRTUAL',reference:'Ref. 908882',value:216000,match:'Transferencia propia',confidence:'99%',support:true,status:'matched',statusText:'Conciliado'},
  {id:10,date:'04/08/2026',bank:'Bancolombia',account:'01657',description:'PAGO AUTOM TC MASTER PESOS',reference:'Ref. 616004',value:-52,match:'',confidence:'',support:false,status:'pending',statusText:'Sin identificar'},
  {id:11,date:'01/08/2026',bank:'Bancolombia',account:'01657',description:'ABONO INTERESES AHORROS',reference:'Ref. 061048',value:0.26,match:'Rendimiento financiero',confidence:'100%',support:true,status:'matched',statusText:'Conciliado'},
  {id:12,date:'01/08/2026',bank:'Bancolombia',account:'01657',description:'CXC IMPTO GOBIERNO 4X1000 MON',reference:'Ref. 774420',value:-1984.61,match:'Gasto bancario',confidence:'100%',support:true,status:'matched',statusText:'Conciliado'}
];

const pendingItems = [
  {id:1,type:'identify',company:'ECOtoy SAS',description:'TRANSFERENCIAS A NEQUI',amount:'− $500.000',date:'5 ago',age:'2 días',bank:'Bancolombia · 01657',message:'Necesitamos saber a quién corresponde esta transferencia y el motivo del pago.'},
  {id:2,type:'support',company:'Grupo Marea',description:'PAGO PROV DISTRIBUIDORA A',amount:'− $1.250.000',date:'4 ago',age:'4 días',bank:'Davivienda · 4082',message:'El movimiento está identificado, pero falta la factura o cuenta de cobro.'},
  {id:3,type:'identify',company:'Nova Ingeniería',description:'CONSIGNACIÓN EFECTIVO',amount:'+ $2.480.000',date:'4 ago',age:'Hoy',bank:'Bancolombia · 77102',message:'No encontramos un ingreso reportado por este valor.'},
  {id:4,type:'support',company:'ECOtoy SAS',description:'PAGO LLAVE MARCOS GOM',amount:'− $90.000',date:'5 ago',age:'2 días',bank:'Bancolombia · 01657',message:'Adjunta el soporte que respalda este gasto.'},
  {id:5,type:'identify',company:'Constructora Alto SAS',description:'TRANSFERENCIA CUENTA TERCERO',amount:'− $3.950.000',date:'2 ago',age:'5 días',bank:'Banco de Bogotá · 3391',message:'Confirma beneficiario, concepto y documento relacionado.'},
  {id:6,type:'answered',company:'Biocare Colombia',description:'PAGO PSE PROVEEDOR',amount:'− $682.410',date:'5 ago',age:'Respondido',bank:'Bancolombia · 1154',message:'El cliente respondió: compra de insumos médicos, factura BC-244.'}
];

const titles = {
  dashboard:'Resumen general', clients:'Clientes', uploads:'Cargas y documentos', reconciliation:'Conciliación bancaria', pending:'Pendientes del cliente', reports:'Reportes', clientPortal:'Portal ECOtoy SAS'
};

const $ = (selector, scope=document) => scope.querySelector(selector);
const $$ = (selector, scope=document) => [...scope.querySelectorAll(selector)];
const formatCOP = value => `${value < 0 ? '− ' : value > 0 ? '+ ' : ''}$${Math.abs(value).toLocaleString('es-CO', {minimumFractionDigits: Number.isInteger(value)?0:2, maximumFractionDigits:2})}`;

function renderClients() {
  const query = ($('#clientSearch')?.value || '').toLowerCase();
  const status = $('#clientStatusFilter')?.value || 'all';
  const filtered = clients.filter(c => (c.name.toLowerCase().includes(query) || c.nit.includes(query)) && (status === 'all' || c.status === status));
  const row = c => `<tr>
    <td><input type="checkbox" /></td>
    <td><div class="client-cell"><div class="company-avatar ${c.color}">${c.initials}</div><div><b>${c.name}</b><small>NIT ${c.nit}</small></div></div></td>
    <td>${c.owner}</td><td>${c.accounts}</td><td>${c.last}</td>
    <td><div class="mini-progress"><div class="progress-track"><i style="width:${c.progress}%"></i></div><span>${c.progress}%</span></div></td>
    <td><b>${c.pending}</b></td><td><span class="status-badge ${c.status}">${c.statusText}</span></td>
    <td><button class="row-button view-client" data-client="${c.id}">Ver detalle</button></td></tr>`;
  $('#clientsBody').innerHTML = filtered.map(row).join('') || `<tr><td colspan="9" style="text-align:center;padding:30px;color:#777">No encontramos clientes con esos filtros.</td></tr>`;
  $('#recentClientsBody').innerHTML = clients.slice(0,5).map(c => `<tr><td><div class="client-cell"><div class="company-avatar ${c.color}">${c.initials}</div><div><b>${c.name}</b><small>NIT ${c.nit}</small></div></div></td><td>${c.last}</td><td>${c.movements}</td><td><div class="mini-progress"><div class="progress-track"><i style="width:${c.progress}%"></i></div><span>${c.progress}%</span></div></td><td><b>${c.pending}</b></td><td><span class="status-badge ${c.status}">${c.statusText}</span></td><td><button class="row-button view-client" data-client="${c.id}">Abrir</button></td></tr>`).join('');
}

function renderMovements() {
  const q = ($('#movementSearch').value || '').toLowerCase();
  const status = $('#movementStatus').value;
  const bank = $('#movementBank').value;
  const filtered = movements.filter(m => `${m.description} ${m.reference} ${m.value}`.toLowerCase().includes(q) && (status==='all' || m.status===status) && (bank==='all' || m.bank===bank));
  $('#movementBody').innerHTML = filtered.map(m => `<tr data-id="${m.id}">
    <td><input type="checkbox" class="movement-check" /></td><td>${m.date}</td><td><b>${m.bank}</b><br><small>${m.account}</small></td>
    <td class="description-cell"><b>${m.description}</b><small>${m.reference}</small></td><td>${formatCOP(m.value)}</td>
    <td class="match-cell">${m.match ? `<span class="match-chip">${m.match} <strong>${m.confidence}</strong></span>` : '<span style="color:#999">Sin coincidencia</span>'}</td>
    <td><span class="support-icon ${m.support?'':'missing'}">${m.support?'✓':'▣'}</span></td>
    <td><span class="status-badge ${m.status}">${m.statusText}</span></td>
    <td><button class="row-button resolve-movement" data-id="${m.id}">${m.status==='matched'?'Revisar':'Resolver'}</button></td></tr>`).join('');
  bindMovementChecks();
}

function renderPending(filter='all') {
  const items = pendingItems.filter(p => filter==='all' || p.type===filter);
  $('#pendingList').innerHTML = items.map(p => `<button class="pending-item" data-pending="${p.id}"><span class="priority">${p.type==='support'?'▣':p.type==='answered'?'✓':'!'}</span><span><b>${p.company}</b><small>${p.description} · ${p.amount}</small></span><time>${p.age}</time></button>`).join('');
}

function renderClientQuestions() {
  const q = pendingItems.filter(x => x.company==='ECOtoy SAS').slice(0,3);
  $('#clientQuestionList').innerHTML = q.map(item => `<div class="client-question"><div class="question-top"><div><h4>${item.description}</h4><p>${item.bank} · ${item.date}</p></div><div class="question-value"><b>${item.amount}</b><small>${item.type==='support'?'Falta soporte':'Por identificar'}</small></div></div><div class="question-options"><button class="quick-answer" data-pending="${item.id}">Pago a proveedor</button><button class="quick-answer" data-pending="${item.id}">Transferencia propia</button><button class="quick-answer" data-pending="${item.id}">Otro concepto</button><button class="quick-answer" data-pending="${item.id}">＋ Adjuntar soporte</button></div></div>`).join('');
}

function navigate(view) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $(`#view-${view}`);
  if (target) target.classList.add('active');
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view===view));
  $('#pageTitle').textContent = titles[view] || 'In-Plementar Conecta';
  window.scrollTo({top:0,behavior:'smooth'});
  if (window.innerWidth <= 900) $('#sidebar').classList.remove('open');
}

function toast(message, icon='✓') {
  const el = document.createElement('div');
  el.className='toast'; el.innerHTML=`<i>${icon}</i><span>${message}</span>`;
  $('#toastContainer').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(8px)'; setTimeout(()=>el.remove(),250); }, 3200);
}

function openDrawer(clientId) {
  const c = clients.find(x=>x.id===Number(clientId)) || clients[0];
  $('#drawerClientName').textContent=c.name;
  $('.drawer-company .company-avatar').textContent=c.initials;
  $('.drawer-company .company-avatar').className=`company-avatar ${c.color}`;
  $('.drawer-company strong').textContent=`NIT ${c.nit}`;
  $('.drawer-company small').textContent=`Responsable: ${c.owner}`;
  $('.drawer-company .status-badge').textContent=c.statusText;
  $('.drawer-company .status-badge').className=`status-badge ${c.status}`;
  $('#clientDrawer').classList.add('open'); $('#drawerBackdrop').classList.add('open');
  $('#clientDrawer').setAttribute('aria-hidden','false');
}
function closeDrawer(){ $('#clientDrawer').classList.remove('open'); $('#drawerBackdrop').classList.remove('open'); $('#clientDrawer').setAttribute('aria-hidden','true'); }

function openMovementModal(id) {
  const m = movements.find(x=>x.id===Number(id)) || movements[0];
  $('#movementModal').dataset.id=m.id;
  $('#modalTitle').textContent=m.description.charAt(0)+m.description.slice(1).toLowerCase();
  $('#modalDate').textContent=m.date;
  $('#modalBank').textContent=`${m.bank} · ${m.account}`;
  $('#modalValue').textContent=formatCOP(m.value);
  $('#modalDescription').textContent=m.description;
  $('#movementModal').classList.add('open'); $('#modalBackdrop').classList.add('open');
}
function closeModal(){ $('#movementModal').classList.remove('open'); $('#modalBackdrop').classList.remove('open'); }

function bindMovementChecks(){
  $$('.movement-check').forEach(ch=>ch.addEventListener('change', updateBulkBar));
}
function updateBulkBar(){ const n=$$('.movement-check:checked').length; $('#selectedCount').textContent=n; $('#bulkBar').classList.toggle('hidden',n===0); }

function showPendingDetail(id){
  const p=pendingItems.find(x=>x.id===Number(id)); if(!p)return;
  $$('.pending-item').forEach(x=>x.classList.toggle('active',Number(x.dataset.pending)===p.id));
  $('#pendingDetail').innerHTML=`<div class="detail-header"><div><p class="panel-kicker">${p.company}</p><h3>${p.description}</h3><p>${p.message}</p></div><div class="detail-amount"><b>${p.amount}</b><small>${p.date}</small></div></div><div class="detail-body"><div class="detail-metadata"><div><span>Cuenta</span><b>${p.bank}</b></div><div><span>Tipo</span><b>${p.type==='support'?'Soporte faltante':p.type==='answered'?'Respuesta recibida':'Por identificar'}</b></div><div><span>Antigüedad</span><b>${p.age}</b></div></div><div class="conversation"><div class="conversation-title">Conversación con el cliente</div><div class="message"><div class="avatar">CE</div><div><p>${p.type==='answered'?'Este pago corresponde a compra de insumos. Adjunto la factura.':'Hola, necesitamos información adicional para poder conciliar este movimiento.'}</p><small>${p.type==='answered'?'Hoy, 11:24 a. m.':'Ayer, 4:12 p. m.'}</small></div></div></div><div class="detail-actions"><button class="secondary-button">Escribir mensaje</button><button class="secondary-button">Adjuntar soporte</button><button class="primary-button complete-pending">Marcar resuelto</button></div></div>`;
}

// Navigation
$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));
document.addEventListener('click', e=>{
  const go=e.target.closest('[data-go]'); if(go){ navigate(go.dataset.go); closeDrawer(); }
  const vc=e.target.closest('.view-client'); if(vc) openDrawer(vc.dataset.client);
  const rm=e.target.closest('.resolve-movement'); if(rm) openMovementModal(rm.dataset.id);
  const pi=e.target.closest('.pending-item'); if(pi) showPendingDetail(pi.dataset.pending);
  const qa=e.target.closest('.quick-answer'); if(qa) openMovementModal(qa.dataset.pending);
  const complete=e.target.closest('.complete-pending'); if(complete){ toast('Pendiente marcado como resuelto.'); complete.closest('.pending-detail').innerHTML='<div class="empty-detail"><div>✓</div><h3>Pendiente resuelto</h3><p>La información quedó lista para revisión contable.</p></div>'; }
});

$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#drawerClose').addEventListener('click',closeDrawer); $('#drawerBackdrop').addEventListener('click',closeDrawer);
$$('.modal-close').forEach(x=>x.addEventListener('click',closeModal)); $('#modalBackdrop').addEventListener('click',closeModal);

$('#roleSwitch').addEventListener('click',()=>{
  const clientMode=document.body.classList.toggle('client-mode');
  $('#roleLabel').textContent=clientMode?'Cliente: ECOtoy SAS':'Equipo In-Plementar';
  navigate(clientMode?'clientPortal':'dashboard');
  toast(clientMode?'Vista del cliente activada':'Vista del equipo activada','↔');
});

$('#clientSearch').addEventListener('input',renderClients); $('#clientStatusFilter').addEventListener('change',renderClients);
$$('.client-search').forEach(x=>x.addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  $$('#recentClientsBody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none');
}));
['movementSearch','movementStatus','movementBank'].forEach(id=>$('#'+id).addEventListener(id==='movementSearch'?'input':'change',renderMovements));
$('#selectAllMovements').addEventListener('change',e=>{ $$('.movement-check').forEach(c=>c.checked=e.target.checked); updateBulkBar(); });

$$('.pending-summary').forEach(btn=>btn.addEventListener('click',()=>{ $$('.pending-summary').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); renderPending(btn.dataset.pendingFilter); $('#pendingDetail').innerHTML='<div class="empty-detail"><div>↗</div><h3>Selecciona un pendiente</h3><p>Aquí aparecerá el movimiento, la conversación y los soportes relacionados.</p></div>'; }));

// Upload interaction
let selectedFiles=[];
const fileInput=$('#fileInput'), dropZone=$('#dropZone');
fileInput.addEventListener('change',e=>addFiles([...e.target.files]));
['dragenter','dragover'].forEach(evt=>dropZone.addEventListener(evt,e=>{e.preventDefault();dropZone.classList.add('dragging');}));
['dragleave','drop'].forEach(evt=>dropZone.addEventListener(evt,e=>{e.preventDefault();dropZone.classList.remove('dragging');}));
dropZone.addEventListener('drop',e=>addFiles([...e.dataTransfer.files]));
function addFiles(files){ selectedFiles=[...selectedFiles,...files]; renderFiles(); }
function renderFiles(){
  $('#fileList').innerHTML=selectedFiles.map((f,i)=>{const ext=(f.name.split('.').pop()||'FILE').toUpperCase(); const cls=ext==='PDF'?'pdf':['XLS','XLSX','CSV'].includes(ext)?'xls':'zip'; return `<div class="selected-file"><span class="file-type ${cls}">${ext.slice(0,4)}</span><div><b>${f.name}</b><small>${(f.size/1024/1024).toFixed(2)} MB · listo para procesar</small></div><button class="remove-file" data-index="${i}">×</button></div>`}).join('');
  $('#fileCount').textContent=selectedFiles.length?`${selectedFiles.length} archivo${selectedFiles.length>1?'s':''} seleccionado${selectedFiles.length>1?'s':''}`:'No hay archivos seleccionados';
  $('#processBtn').disabled=selectedFiles.length===0;
}
document.addEventListener('click',e=>{const rm=e.target.closest('.remove-file'); if(rm){selectedFiles.splice(Number(rm.dataset.index),1);renderFiles();}});
$('#processBtn').addEventListener('click',()=>{
  const btn=$('#processBtn'); btn.disabled=true; btn.textContent='Procesando 0%'; let p=0;
  const timer=setInterval(()=>{p+=10;btn.textContent=`Procesando ${p}%`;if(p>=100){clearInterval(timer);btn.textContent='Procesar archivos →';selectedFiles=[];renderFiles();toast('Archivos procesados. Se detectaron 1.248 movimientos y 187 excepciones.','✦');}},120);
});

$('#autoMatchBtn').addEventListener('click',()=>{const b=$('#autoMatchBtn');b.disabled=true;b.textContent='Analizando movimientos…';setTimeout(()=>{b.disabled=false;b.textContent='✦ Ejecutar conciliación';toast('Conciliación completada: 1.061 coincidencias encontradas.','✦');},1500);});
$('#sendReminderBtn').addEventListener('click',()=>toast('Se enviaron recordatorios a 12 clientes.','✉'));
$$('.download-demo').forEach(b=>b.addEventListener('click',()=>{b.textContent='Generando…';setTimeout(()=>{b.textContent='Descargar archivo ↓';toast('Reporte de demostración generado.','↓');},900);}));
$('#newClientBtn').addEventListener('click',()=>toast('En la siguiente versión, aquí se creará un cliente nuevo.','＋'));
$('#clientResolveBtn').addEventListener('click',()=>openMovementModal(1));
$('#saveMovementBtn').addEventListener('click',()=>{
  if(!$('#modalConcept').value){toast('Selecciona el concepto del movimiento.','!');return;}
  const id=Number($('#movementModal').dataset.id); const m=movements.find(x=>x.id===id); if(m){m.status='review';m.statusText='En revisión';m.match=$('#modalConcept').value;m.confidence='Cliente';}
  closeModal();renderMovements();toast('Respuesta guardada y enviada al equipo contable.');
});
$('#periodSelect').addEventListener('change',e=>toast(`Periodo cambiado a ${e.target.value}.`,'↻'));

document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeModal();$('#sidebar').classList.remove('open');}});

renderClients(); renderMovements(); renderPending(); renderClientQuestions();
