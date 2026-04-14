// ═══════════════════════════════════════════════════
//  AgroSeed — Sistema de Curado de Semillas
//  Versión con email como clave de almacenamiento
// ═══════════════════════════════════════════════════

const RATES_PER_TON  = { polimero: 6.3,   apron: 1.0,   inoculante: 3.0 };
const RATES_PER_UNIT = { polimero: 7.875, apron: 1.250, inoculante: 3.750 };
const KG_PER_UNIT    = 1250;

// ── Estado ──
let currentUser = null;   // email del operador
let records     = [];
let editingId   = null;

// ── DOM ──
const views       = { login: document.getElementById('login-view'), dashboard: document.getElementById('dashboard-view') };
const loginForm   = document.getElementById('login-form');
const recordForm  = document.getElementById('record-form');
const modal       = document.getElementById('record-modal');
const historyBody = document.getElementById('history-body');
const emptyState  = document.getElementById('empty-state');

const inp = {
    email:          document.getElementById('email'),
    password:       document.getElementById('password'),
    fecha:          document.getElementById('fecha'),
    horaInicio:     document.getElementById('hora-inicio'),
    horaFin:        document.getElementById('hora-fin'),
    lote:           document.getElementById('lote'),
    variedad:       document.getElementById('variedad'),
    unidad:         document.getElementById('unidad'),
    cantidad:       document.getElementById('cantidad'),
    bultos:         document.getElementById('bultos'),
    usePolimero:    document.getElementById('use-polimero'),
    useApron:       document.getElementById('use-apron'),
    useInoculante:  document.getElementById('use-inoculante'),
    ratePolimero:   document.getElementById('rate-polimero'),
    rateApron:      document.getElementById('rate-apron'),
    rateInoculante: document.getElementById('rate-inoculante'),
    contenidoBulto: document.getElementById('calc-contenido-bulto'),
};
const out = {
    polimero:   document.getElementById('calc-polimero'),
    apron:      document.getElementById('calc-apron'),
    inoculante: document.getElementById('calc-inoculante'),
    total:      document.getElementById('calc-total'),
    userBadge:  document.getElementById('user-badge'),
    recordCount:document.getElementById('record-count'),
    modalTitle: document.getElementById('modal-title'),
};

// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════
function init() {
    try {
        const saved = sessionStorage.getItem('ag_user');
        if (saved) signIn(saved, false);
    } catch(e) {}
    bindEvents();
}

// ════════════════════════════════════════════
//  VISTAS
// ════════════════════════════════════════════
function showView(id) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[id].classList.add('active');
}

// ════════════════════════════════════════════
//  AUTH — cualquier email válido es una cuenta
// ════════════════════════════════════════════
function signIn(email, persist = true) {
    currentUser = email.trim().toLowerCase();
    out.userBadge.textContent = email.trim();
    if (persist) try { sessionStorage.setItem('ag_user', email.trim()); } catch(e) {}
    loadRecords();
    showView('dashboard');
}

function signOut() {
    currentUser = null; records = [];
    try { sessionStorage.removeItem('ag_user'); } catch(e) {}
    loginForm.reset();
    document.getElementById('login-error').style.display = 'none';
    showView('login');
}

// ════════════════════════════════════════════
//  STORAGE (clave = email del operador)
// ════════════════════════════════════════════
function storageKey() { return `agseed::${currentUser}`; }

function loadRecords() {
    try { records = JSON.parse(localStorage.getItem(storageKey())) || []; }
    catch(e) { records = []; }
    renderTable(records);
}

function persist() {
    try { localStorage.setItem(storageKey(), JSON.stringify(records)); } catch(e) {}
    renderTable(records);
}

// ════════════════════════════════════════════
//  CÁLCULO DE DOSIS
// ════════════════════════════════════════════
function calcDose() {
    const unidad = inp.unidad.value;
    const qty    = parseFloat(inp.cantidad.value)  || 0;
    const bultos = parseFloat(inp.bultos.value)    || 1;
    const useP   = inp.usePolimero.checked;
    const useA   = inp.useApron.checked;
    const useI   = inp.useInoculante.checked;

    // Read custom rates (fall back to defaults)
    const rateP = parseFloat(inp.ratePolimero.value)   || RATES_PER_TON.polimero;
    const rateA = parseFloat(inp.rateApron.value)      || RATES_PER_TON.apron;
    const rateI = parseFloat(inp.rateInoculante.value) || RATES_PER_TON.inoculante;

    // Rates per unit = rate * 1.25 (1250kg / 1000kg)
    const rateP_u = rateP * 1.25;
    const rateA_u = rateA * 1.25;
    const rateI_u = rateI * 1.25;

    if (qty <= 0) { resetOutputs(); return null; }

    let totalKg, polimero = 0, apron = 0, inoculante = 0;

    if (unidad === 'Unidades') {
        totalKg = qty * KG_PER_UNIT;
        if (useP) polimero   = qty * rateP_u;
        if (useA) apron      = qty * rateA_u;
        if (useI) inoculante = qty * rateI_u;
    } else {
        totalKg = qty;
        const ratio = qty / 1000;
        if (useP) polimero   = ratio * rateP;
        if (useA) apron      = ratio * rateA;
        if (useI) inoculante = ratio * rateI;
    }

    const total             = polimero + apron + inoculante;
    const contenidoPromedio = totalKg / bultos;

    out.polimero.textContent   = useP ? `${polimero.toFixed(3)} L`   : '— L';
    out.apron.textContent      = useA ? `${apron.toFixed(3)} L`      : '— L';
    out.inoculante.textContent = useI ? `${inoculante.toFixed(3)} L` : '— L';
    out.total.textContent      = `${total.toFixed(3)} L`;
    inp.contenidoBulto.value   = `${contenidoPromedio.toFixed(2)} Kg / Bulto`;

    return { polimero, apron, inoculante, total, contenidoPromedio,
             usePolimero:useP, useApron:useA, useInoculante:useI,
             ratePolimero:rateP, rateApron:rateA, rateInoculante:rateI };
}

function resetOutputs() {
    ['polimero','apron','inoculante'].forEach(k => out[k].textContent = '— L');
    out.total.textContent    = '0.000 L';
    inp.contenidoBulto.value = '';
}

// ════════════════════════════════════════════
//  TABLA
// ════════════════════════════════════════════
function renderTable(data) {
    historyBody.innerHTML = '';
    const count = data ? data.length : 0;
    out.recordCount.textContent = count === 0
        ? 'Sin registros cargados'
        : `${count} registro${count !== 1 ? 's' : ''} — cuenta: ${currentUser}`;

    if (!data || count === 0) { emptyState.style.display = 'block'; return; }
    emptyState.style.display = 'none';

    [...data].reverse().forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.fecha||'—'}</td>
            <td>${r.horaInicio||'--:--'} – ${r.horaFin||'--:--'}</td>
            <td><strong>${r.lote}</strong></td>
            <td>${r.variedad}</td>
            <td>${r.cantidad} ${r.unidad}</td>
            <td><strong>${r.bultos||'—'}</strong> | ${r.contenidoPromedio ? r.contenidoPromedio.toFixed(2)+' Kg' : '—'}</td>
            <td>${r.usePolimero!==false   ? r.polimero.toFixed(3)+' L'   : '—'}</td>
            <td>${r.useApron!==false      ? r.apron.toFixed(3)+' L'      : '—'}</td>
            <td>${r.useInoculante!==false ? r.inoculante.toFixed(3)+' L' : '—'}</td>
            <td><strong>${r.total.toFixed(3)} L</strong></td>
            <td class="actions-cell">
                <button class="btn btn-small btn-edit" onclick="editRecord('${r.id}')">Editar</button>
                <button class="btn btn-small btn-danger" onclick="deleteRecord('${r.id}')">×</button>
            </td>`;
        historyBody.appendChild(tr);
    });
}

// ════════════════════════════════════════════
//  ACCIONES GLOBALES
// ════════════════════════════════════════════
window.deleteRecord = function(id) {
    if (confirm('¿Eliminar este registro?')) {
        records = records.filter(r => r.id !== id);
        persist();
    }
};

window.editRecord = function(id) {
    const r = records.find(r => r.id === id);
    if (!r) return;
    editingId = id;
    inp.fecha.value          = r.fecha         || '';
    inp.horaInicio.value     = r.horaInicio    || '';
    inp.horaFin.value        = r.horaFin       || '';
    inp.lote.value           = r.lote;
    inp.variedad.value       = r.variedad;
    inp.unidad.value         = r.unidad;
    inp.cantidad.value       = r.cantidad;
    inp.bultos.value         = r.bultos        || 1;
    inp.usePolimero.checked   = r.usePolimero   !== false;
    inp.useApron.checked      = r.useApron      !== false;
    inp.useInoculante.checked = r.useInoculante !== false;
    // Restore custom rates if saved
    inp.ratePolimero.value   = r.ratePolimero   || RATES_PER_TON.polimero;
    inp.rateApron.value      = r.rateApron      || RATES_PER_TON.apron;
    inp.rateInoculante.value = r.rateInoculante || RATES_PER_TON.inoculante;
    out.modalTitle.textContent = 'Editar Registro';
    calcDose();
    modal.classList.add('active');
};

// ════════════════════════════════════════════
//  EXPORTAR CSV
// ════════════════════════════════════════════
function exportCSV() {
    if (!records || records.length === 0) { alert('No hay registros para exportar.'); return; }

    const headers = [
        'Fecha','Hora Inicio','Hora Fin','N° Lote','Variedad',
        'Unidad','Cantidad','N° Bultos','Kg / Bulto',
        'Polímero (L)','Apron/Maxin (L)','Inoculante (L)','Total Mezcla (L)'
    ];

    const rows = records.map(r => [
        r.fecha, r.horaInicio, r.horaFin, r.lote, r.variedad,
        r.unidad, r.cantidad, r.bultos,
        r.contenidoPromedio ? r.contenidoPromedio.toFixed(2) : '',
        r.usePolimero   !== false ? r.polimero.toFixed(3)   : '',
        r.useApron      !== false ? r.apron.toFixed(3)      : '',
        r.useInoculante !== false ? r.inoculante.toFixed(3) : '',
        r.total.toFixed(3)
    ].map(v => `"${v}"`));     // wrap in quotes to handle commas

    const csv  = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\r\n');  // BOM for Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href     = url;
    a.download = `AgroSeed_Curados_${currentUser}_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════════
function openModal() {
    editingId = null;
    recordForm.reset();
    out.modalTitle.textContent = 'Registrar Nuevo Curado';
    const now = new Date();
    inp.fecha.value       = now.toISOString().split('T')[0];
    inp.horaInicio.value  = now.toTimeString().substring(0,5);
    inp.usePolimero.checked  = true;
    inp.useApron.checked     = true;
    inp.useInoculante.checked= true;
    inp.ratePolimero.value   = RATES_PER_TON.polimero;
    inp.rateApron.value      = RATES_PER_TON.apron;
    inp.rateInoculante.value = RATES_PER_TON.inoculante;
    inp.bultos.value = 1;
    resetOutputs();
    modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }

// ════════════════════════════════════════════
//  EVENTOS
// ════════════════════════════════════════════
function bindEvents() {

    // Login: cualquier email válido entra
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = inp.email.value.trim();
        const errEl = document.getElementById('login-error');
        if (email) {
            errEl.style.display = 'none';
            signIn(email);
        } else {
            errEl.textContent = 'Por favor ingresá un correo electrónico válido.';
            errEl.style.display = 'block';
        }
    });

    document.getElementById('btn-logout').addEventListener('click', signOut);

    // Export
    document.getElementById('btn-export').addEventListener('click', exportCSV);

    // Modal
    document.getElementById('btn-new-record').addEventListener('click', openModal);
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

    // Cálculo reactivo
    ['input','change'].forEach(ev => inp.cantidad.addEventListener(ev, calcDose));
    inp.unidad.addEventListener('change', calcDose);
    inp.bultos.addEventListener('input', calcDose);
    inp.usePolimero.addEventListener('change', calcDose);
    inp.useApron.addEventListener('change', calcDose);
    inp.useInoculante.addEventListener('change', calcDose);
    inp.ratePolimero.addEventListener('input', calcDose);
    inp.rateApron.addEventListener('input', calcDose);
    inp.rateInoculante.addEventListener('input', calcDose);

    // Búsqueda
    document.getElementById('search-lote').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        renderTable(q ? records.filter(r => r.lote.toLowerCase().includes(q)) : records);
    });

    // Guardar registro
    recordForm.addEventListener('submit', e => {
        e.preventDefault();
        const dose = calcDose();
        if (!dose) { alert('Ingresá una cantidad válida.'); return; }

        const record = {
            id:              editingId || Date.now().toString(),
            fecha:           inp.fecha.value,
            horaInicio:      inp.horaInicio.value,
            horaFin:         inp.horaFin.value,
            lote:            inp.lote.value,
            variedad:        inp.variedad.value,
            unidad:          inp.unidad.value,
            cantidad:        parseFloat(inp.cantidad.value),
            bultos:          parseFloat(inp.bultos.value),
            contenidoPromedio: dose.contenidoPromedio,
            usePolimero:     dose.usePolimero,
            useApron:        dose.useApron,
            useInoculante:   dose.useInoculante,
            polimero:        dose.polimero,
            apron:           dose.apron,
            inoculante:      dose.inoculante,
            total:           dose.total,
        };

        if (editingId) {
            const idx = records.findIndex(r => r.id === editingId);
            if (idx !== -1) records[idx] = record;
            editingId = null;
        } else {
            records.push(record);
        }
        persist();
        closeModal();
    });
}

document.addEventListener('DOMContentLoaded', init);
