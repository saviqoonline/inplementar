/* ============================================================
   In-Plementar Conecta · Datos de demostración
   ------------------------------------------------------------
   Todo se genera de forma determinista (semilla fija) para que
   la demo se vea idéntica en cada equipo y en cada presentación.

   Regla de oro de esta demo: NINGÚN número está escrito a mano.
   Los KPIs, los badges del menú, los porcentajes de avance y los
   contadores por cliente se derivan de los movimientos generados,
   de modo que si el prospecto se pone a contar, todo cuadra.

   Datos ficticios: ninguna empresa, NIT o valor es real.
   ============================================================ */

/* Generador pseudoaleatorio con semilla — mulberry32 */
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OWNERS = ['Camila Estrada', 'Laura Méndez', 'Andrés Rojas', 'Valentina Ospina'];

/* ---------- Catálogo base de clientes ----------
   quality: qué tan ordenado es el cliente (0-1). Determina cuántos
   movimientos quedan conciliados solos y, por lo tanto, su avance. */
const CLIENT_SEED = [
  ['ECOtoy SAS',            '901.458.220-3', 'gold',   1248, 0.72, 'Hoy, 10:42'],
  ['Grupo Marea',           '900.774.190-1', 'blue',   3804, 0.63, 'Ayer, 16:08'],
  ['Nova Ingeniería',       '901.092.663-8', 'green',  5612, 0.86, 'Hoy, 08:17'],
  ['Fundación Horizonte',   '830.441.786-5', 'purple',  682, 0.08, '28 jul, 11:10'],
  ['Alimentos La Estación', '900.218.119-0', 'red',    2310, 0.97, '1 ago, 14:32'],
  ['Constructora Alto SAS', '901.334.552-7', 'blue',   4126, 0.52, '31 jul, 09:41'],
  ['Biocare Colombia',      '900.687.410-2', 'green',  1994, 0.93, 'Hoy, 11:56'],
  ['Studio Vértice',        '901.812.045-6', 'purple',  842, 0.98, '2 ago, 17:20'],
  ['Textiles Andinos',      '900.451.023-4', 'red',    1620, 0.78, 'Hoy, 09:14'],
  ['Logística Pacífico',    '901.220.771-9', 'blue',   2870, 0.68, 'Ayer, 12:35'],
  ['Clínica Sanar IPS',     '830.119.884-2', 'green',  4410, 0.81, 'Hoy, 07:52'],
  ['Café de Origen SAS',    '901.663.208-5', 'gold',    930, 0.90, '3 ago, 15:47'],
  ['Inversiones Roble',     '900.905.117-6', 'purple', 1180, 0.45, '30 jul, 10:22'],
  ['Distribuidora Sur',     '901.447.336-0', 'blue',   3320, 0.74, 'Ayer, 18:03'],
  ['Agro Valle Verde',      '900.338.902-8', 'green',  1460, 0.58, '2 ago, 08:41'],
  ['Tecnisoft Ltda.',       '830.775.441-3', 'gold',    770, 0.95, 'Hoy, 11:08'],
  ['Muebles Casa Nova',     '901.058.674-1', 'red',    1090, 0.66, '1 ago, 16:19'],
  ['Seguridad Centinela',   '900.612.290-7', 'blue',   2050, 0.83, 'Ayer, 09:57'],
  ['Editorial Palabra',     '901.739.855-4', 'purple',  610, 0.88, '3 ago, 13:26'],
  ['Transportes Ruta 8',    '900.184.507-2', 'gold',   3640, 0.49, '29 jul, 17:44'],
  ['Óptica Claridad',       '901.526.913-9', 'green',   540, 0.99, '1 ago, 10:05'],
  ['Hotel Media Luna',      '830.902.336-1', 'red',    2760, 0.71, 'Hoy, 08:38'],
  ['Ferretería El Yunque',  '900.740.128-5', 'blue',   1340, 0.62, '2 ago, 14:52'],
  ['Academia Vértex',       '901.881.402-7', 'purple',  880, 0.91, 'Ayer, 15:30']
];

/* Iniciales de la empresa ignorando el tipo societario:
   "ECOtoy SAS" → EC, no ES. */
const LEGAL_SUFFIX = /^(s\.?a\.?s\.?|ltda\.?|s\.?a\.?|e\.?u\.?|ips|sac|s\.?e\.?n\.?c\.?)$/i;

function companyInitials(name) {
  const words = name
    .replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ. ]/g, '')
    .split(' ').filter(w => w && !LEGAL_SUFFIX.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] || name).slice(0, 2).toUpperCase();
}

const CLIENTS = CLIENT_SEED.map(([name, nit, color, total, quality, last], i) => {
  const rnd = seeded(1000 + i);
  const initials = companyInitials(name);
  return {
    id: i + 1,
    name, nit, color, initials, quality, last,
    owner: OWNERS[i % OWNERS.length],
    accounts: 1 + Math.floor(rnd() * 5),
    movementsCount: total,
    /* progress, pending y status se calculan tras generar movimientos */
    progress: 0, pending: 0, matched: 0, status: 'review', statusText: 'En revisión'
  };
});

/* ---------- Cuentas bancarias ---------- */
const BANKS = [
  { name: 'Bancolombia',     account: '01657' },
  { name: 'Bancolombia',     account: '77102' },
  { name: 'Davivienda',      account: '4082' },
  { name: 'Banco de Bogotá', account: '3391' },
  { name: 'Nequi',           account: '9014' }
];

/* Descripciones tal como llegan en un extracto real: en mayúscula,
   truncadas y sin contexto. Ese es justamente el problema que resuelve. */
const OUT_DESCRIPTIONS = [
  ['TRANSFERENCIAS A NEQUI', ''],
  ['PAGO LLAVE MARCOS GOM', 'Gasto operativo'],
  ['PAGO LLAVE GLORIA STE', ''],
  ['PAGO LLAVE MARIA GUE', 'Honorarios del mes'],
  ['PAGO PROV COORDINADORA ME', 'Factura FC-991'],
  ['PAGO AUTOM TC MASTER PESOS', 'Tarjeta de crédito'],
  ['CXC IMPTO GOBIERNO 4X1000 MON', 'Gasto bancario'],
  ['PAGO PSE PROVEEDOR', 'Compra de insumos'],
  ['RETIRO CAJERO AUTOMATICO', ''],
  ['PAGO NOMINA ELECTRONICA', 'Nómina quincenal'],
  ['COMPRA DATAFONO ALMACEN', 'Papelería y aseo'],
  ['PAGO SERVICIOS PUBLICOS EPM', 'Servicios públicos'],
  ['TRANSFERENCIA CUENTA TERCERO', ''],
  ['CUOTA MANEJO TARJETA DEBITO', 'Gasto bancario'],
  ['PAGO ARRENDAMIENTO INMUEBLE', 'Arrendamiento'],
  ['PAGO SEGURIDAD SOCIAL PILA', 'Seguridad social'],
  ['COMPRA EN LINEA MERCADOPAGO', '']
];

const IN_DESCRIPTIONS = [
  ['CONSIGNACION CORRESPONSAL CB', 'Factura FV-1841'],
  ['TRANSFERENCIA CTA SUC VIRTUAL', 'Factura FV-1836'],
  ['ABONO INTERESES AHORROS', 'Rendimiento financiero'],
  ['CONSIGNACIÓN EFECTIVO', ''],
  ['RECAUDO PSE CLIENTE', 'Factura FV-1902'],
  ['TRANSFERENCIA DESDE NEQUI', ''],
  ['ABONO PASARELA DE PAGOS', 'Recaudo pasarela'],
  ['DEVOLUCION PROVEEDOR', 'Nota crédito NC-118'],
  ['CONSIGNACION CHEQUE LOCAL', 'Factura FV-1877'],
  ['REINTEGRO GASTOS VIAJE', '']
];

/* ---------- Generación de movimientos ---------- */
function buildMovements() {
  const list = [];
  let id = 1;

  CLIENTS.forEach(client => {
    const rnd = seeded(50 + client.id);
    const q = client.quality;

    for (let i = 0; i < client.movementsCount; i++) {
      const outgoing = rnd() > 0.42;
      const [description, defaultMatch] = outgoing
        ? OUT_DESCRIPTIONS[Math.floor(rnd() * OUT_DESCRIPTIONS.length)]
        : IN_DESCRIPTIONS[Math.floor(rnd() * IN_DESCRIPTIONS.length)];
      const bank = BANKS[Math.floor(rnd() * Math.min(client.accounts, BANKS.length))];

      /* Mezcla de valores pequeños, medianos y grandes */
      const magnitude = [1, 1, 1, 1, 8, 40][Math.floor(rnd() * 6)];
      let value = Math.round((4000 + rnd() * 260000) * magnitude / 100) * 100;
      if (outgoing) value = -value;

      /* Reparto de estados. El argumento de venta es justamente este:
         la enorme mayoría se concilia sola y solo un puñado llega a
         un humano. La calidad del cliente desplaza las fronteras. */
      const pMatched   = 0.72 + 0.26 * q;             // 0.74 … 0.98
      const pSuggested = pMatched + 0.05;
      const pSupport   = pSuggested + 0.02 + 0.06 * (1 - q);
      /* el resto queda sin identificar */

      const roll = rnd();
      let status, statusText, match, confidence, support;
      if (roll < pMatched) {
        status = 'matched'; statusText = 'Conciliado';
        match = defaultMatch || 'Movimiento identificado';
        confidence = `${88 + Math.floor(rnd() * 12)}%`; support = true;
      } else if (roll < pSuggested) {
        status = 'suggested'; statusText = 'Posible coincidencia';
        match = defaultMatch || 'Coincidencia parcial';
        confidence = `${62 + Math.floor(rnd() * 22)}%`; support = rnd() > 0.6;
      } else if (roll < pSupport) {
        status = 'support'; statusText = 'Falta soporte';
        match = defaultMatch || 'Movimiento identificado';
        confidence = `${74 + Math.floor(rnd() * 16)}%`; support = false;
      } else {
        status = 'pending'; statusText = 'Sin identificar';
        match = ''; confidence = ''; support = false;
      }

      const day = 1 + Math.floor(rnd() * 5);
      const hour = 6 + Math.floor(rnd() * 15);
      list.push({
        id: id++,
        clientId: client.id,
        date: `0${day}/08/2026`,
        day,
        time: `${String(hour).padStart(2, '0')}:${String(Math.floor(rnd() * 59)).padStart(2, '0')}`,
        bank: bank.name,
        account: bank.account,
        description,
        reference: `Ref. ${100000 + Math.floor(rnd() * 899999)}`,
        value,
        match, confidence, support,
        status, statusText
      });
    }
  });

  return list;
}

const MOVEMENTS = buildMovements();

/* ---------- Derivar métricas por cliente desde los movimientos ---------- */
(function computeClientMetrics() {
  const byClient = new Map(CLIENTS.map(c => [c.id, { matched: 0, pending: 0, total: 0 }]));
  MOVEMENTS.forEach(m => {
    const acc = byClient.get(m.clientId);
    acc.total++;
    if (m.status === 'matched') acc.matched++;
    if (m.status === 'pending' || m.status === 'support') acc.pending++;
  });
  CLIENTS.forEach(c => {
    const acc = byClient.get(c.id);
    c.matched = acc.matched;
    c.pending = acc.pending;
    c.progress = Math.round((acc.matched / acc.total) * 100);
    const s = c.progress >= 95 ? ['ready', 'Listo']
      : c.progress >= 85 ? ['review', 'En revisión']
      : c.progress >= 78 ? ['client', 'Requiere cliente']
      : ['late', 'Sin cargar'];
    c.status = s[0]; c.statusText = s[1];
  });
})();

/* ---------- Pendientes (bandeja de excepciones) ---------- */
const PENDING_MESSAGES = {
  identify: [
    'Necesitamos saber a quién corresponde esta transferencia y el motivo del pago.',
    'No encontramos un ingreso reportado por este valor.',
    'Confirma beneficiario, concepto y documento relacionado.',
    'Este movimiento no coincide con ninguna factura del periodo.'
  ],
  support: [
    'El movimiento está identificado, pero falta la factura o cuenta de cobro.',
    'Adjunta el soporte que respalda este gasto.',
    'Necesitamos el documento equivalente para poder deducir este pago.'
  ],
  answered: ['El cliente respondió y adjuntó el soporte. Listo para revisión contable.']
};

/* La bandeja muestra los casos priorizados, no los miles de registros:
   los más antiguos y de mayor valor de cada cliente. */
function buildPending() {
  const clientById = new Map(CLIENTS.map(c => [c.id, c]));
  const items = [];

  CLIENTS.forEach(c => {
    const candidates = MOVEMENTS
      .filter(m => m.clientId === c.id && (m.status === 'pending' || m.status === 'support'))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 6);

    candidates.forEach((m, i) => {
      const rnd = seeded(900 + m.id);
      const type = m.status === 'support' ? 'support' : 'identify';
      const days = Math.floor(rnd() * 8);
      items.push({
        id: m.id,
        movementId: m.id,
        clientId: m.clientId,
        type,
        company: clientById.get(m.clientId).name,
        description: m.description,
        amount: m.value,
        date: `${m.day} ago`,
        ageDays: days,
        age: days === 0 ? 'Hoy' : days === 1 ? '1 día' : `${days} días`,
        bank: `${m.bank} · ${m.account}`,
        message: PENDING_MESSAGES[type][i % PENDING_MESSAGES[type].length]
      });
    });
  });

  /* Una parte ya fue respondida por el cliente: muestra el ciclo completo */
  items.forEach((p, i) => {
    if (i % 9 === 0) {
      p.type = 'answered';
      p.age = 'Respondido';
      p.ageDays = 0;
      p.message = PENDING_MESSAGES.answered[0];
    }
  });

  return items.sort((a, b) => b.ageDays - a.ageDays || Math.abs(b.amount) - Math.abs(a.amount));
}

const PENDING = buildPending();

/* ---------- Series históricas ---------- */
const EFFICIENCY_SERIES = [
  { month: 'Mar', auto: 56, manual: 26, client: 18 },
  { month: 'Abr', auto: 61, manual: 25, client: 14 },
  { month: 'May', auto: 65, manual: 24, client: 11 },
  { month: 'Jun', auto: 71, manual: 21, client: 8 },
  { month: 'Jul', auto: 77, manual: 18, client: 5 },
  { month: 'Ago', auto: 82, manual: 14, client: 4 }
];

/* Horas de trabajo manual ahorradas — el argumento comercial */
const SAVINGS_SERIES = [
  { month: 'Mar', hours: 42 },  { month: 'Abr', hours: 61 },
  { month: 'May', hours: 88 },  { month: 'Jun', hours: 124 },
  { month: 'Jul', hours: 168 }, { month: 'Ago', hours: 214 }
];

window.DEMO = { CLIENTS, MOVEMENTS, PENDING, EFFICIENCY_SERIES, SAVINGS_SERIES, BANKS, OWNERS, companyInitials };
