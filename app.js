// ═══════════════════════════════════════════
//  AgroSeed — Sistema de Curado de Semillas
// ═══════════════════════════════════════════

// ── Constantes de cálculo ──
const RATES_PER_TON  = { polimero: 6.3, apron: 1.0, inoculante: 3.0 };
const RATES_PER_UNIT = { polimero: 7.875, apron: 1.250, inoculante: 3.750 };
const KG_PER_UNIT    = 1250;
const CREDENTIALS    = { user: 'matius', pass: 'm4tius' }; // lowercase para comparar

// ── Estado ──
let currentUser = null;
let records = [];
let editingId = null;

// ── Elementos DOM ──
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
};
const loginForm   = document.getElementById('login-form');
const recordForm  = document.getElementById('record-form');
const modal       = document.getElementById('record-modal');
const historyBody = document.getElementById('history-body');
const emptyState  = document.getElementById('empty-state');

const inp = {
    username:     document.getElementById('username'),
    password:     document.getElementById('password'),
    fecha:        document.getElementById('fecha'),
    horaInicio:   document.getElementById('hora-inicio'),
    horaFin:      document.getElementById('hora-fin'),
    lote:         document.getElementById('lote'),
    variedad:     document.getElementById('variedad'),
    unidad:       document.getElementById('unidad'),
    cantidad:     document.getElementById('cantidad'),
    bultos:       document.getElementById('bultos'),
    usePolimero:  document.getElementById('use-polimero'),
    useApron:     document.getElementById('use-apron'),
    useInoculante:document.getElementById('use-inoculante'),
    contenidoBulto: document.getElementById('calc-contenido-bulto'),
};

const out = {
    polimero:  document.getElementById('calc-polimero'),
    apron:     document.getElementById('calc-apron'),
    inoculante:document.getElementById('calc-inoculante'),
    total:     document.getElementById('calc-total'),
    userLabel: document.getElementById('current-user-email'),
};

// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════
function init() {
    try {
        const saved = sessionStorage.getItem('cUser');
        if (saved) signIn(saved, false);
    } catch(e) {}
    bindEvents();
}

// ════════════════════════════════════════════
//  NAVEGACIÓN
// ════════════════════════════════════════════
function showView(id) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[id].classList.add('active');
}

// ════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════
function signIn(user, persist = true) {
    currentUser = user;
    out.userLabel.textContent = user;
    if (persist) try { sessionStorage.setItem('cUser', user); } catch(e) {}
    loadRecords();
    showView('dashboard');
}

function signOut() {
    currentUser = null;
    records = [];
    try { sessionStorage.removeItem('cUser'); } catch(e) {}
    loginForm.reset();
    showView('login');
}

// ════════════════════════════════════════════
//  STORAGE
// ════════════════════════════════════════════
function storageKey() { return `agseed_${currentUser}`; }

function loadRecords() {
    try {
        const raw = localStorage.getItem(storageKey());
        records = raw ? JSON.parse(raw) : [];
    } catch(e) { records = []; }
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
    const unidad  = inp.unidad.value;
    const qty     = parseFloat(inp.cantidad.value) || 0;
    const bultos  = parseFloat(inp.bultos.value)   || 1;
    const useP    = inp.usePolimero.checked;
    const useA    = inp.useApron.checked;
    const useI    = inp.useInoculante.checked;

    if (qty <= 0) {
        resetOutputs();
        return null;
    }

    let totalKg, polimero = 0, apron = 0, inoculante = 0;

    if (unidad === 'Unidades') {
        totalKg = qty * KG_PER_UNIT;
        if (useP) polimero   = qty * RATES_PER_UNIT.polimero;
        if (useA) apron      = qty * RATES_PER_UNIT.apron;
        if (useI) inoculante = qty * RATES_PER_UNIT.inoculante;
    } else {
        totalKg = qty;
        const ratio = qty / 1000;
        if (useP) polimero   = ratio * RATES_PER_TON.polimero;
        if (useA) apron      = ratio * RATES_PER_TON.apron;
        if (useI) inoculante = ratio * RATES_PER_TON.inoculante;
    }

    const total           = polimero + apron + inoculante;
    const contenidoPromedio = totalKg / bultos;

    // Actualizar UI
    out.polimero.textContent   = useP ? `${polimero.toFixed(3)} L`   : '— L';
    out.apron.textContent      = useA ? `${apron.toFixed(3)} L`      : '— L';
    out.inoculante.textContent = useI ? `${inoculante.toFixed(3)} L` : '— L';
    out.total.textContent      = `${total.toFixed(3)} L`;
    inp.contenidoBulto.value   = `${contenidoPromedio.toFixed(2)} Kg / Bulto`;

    return { polimero, apron, inoculante, total, contenidoPromedio,
             usePolimero: useP, useApron: useA, useInoculante: useI };
}

function resetOutputs() {
    out.polimero.textContent   = '— L';
    out.apron.textContent      = '— L';
    out.inoculante.textContent = '— L';
    out.total.textContent      = '0.000 L';
    inp.contenidoBulto.value   = '';
}

// ════════════════════════════════════════════
//  TABLA
// ════════════════════════════════════════════
function renderTable(data) {
    historyBody.innerHTML = '';
    if (!data || data.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    [...data].reverse().forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.fecha || '—'}</td>
            <td>${r.horaInicio || '--:--'} – ${r.horaFin || '--:--'}</td>
            <td><strong>${r.lote}</strong></td>
            <td>${r.variedad}</td>
            <td>${r.cantidad} ${r.unidad}</td>
            <td><strong>${r.bultos || '—'}</strong> | ${r.contenidoPromedio ? r.contenidoPromedio.toFixed(2) : '—'} Kg</td>
            <td>${r.usePolimero !== false ? r.polimero.toFixed(3)+' L' : '—'}</td>
            <td>${r.useApron !== false ? r.apron.toFixed(3)+' L' : '—'}</td>
            <td>${r.useInoculante !== false ? r.inoculante.toFixed(3)+' L' : '—'}</td>
            <td><strong>${r.total.toFixed(3)} L</strong></td>
            <td class="actions-cell">
                <button class="btn btn-small btn-edit" onclick="editRecord('${r.id}')">Editar</button>
                <button class="btn btn-small btn-danger" onclick="deleteRecord('${r.id}')">×</button>
            </td>`;
        historyBody.appendChild(tr);
    });
}

// ════════════════════════════════════════════
//  ACCIONES GLOBALES (llamadas desde tabla)
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
    inp.fecha.value         = r.fecha       || '';
    inp.horaInicio.value    = r.horaInicio  || '';
    inp.horaFin.value       = r.horaFin     || '';
    inp.lote.value          = r.lote;
    inp.variedad.value      = r.variedad;
    inp.unidad.value        = r.unidad;
    inp.cantidad.value      = r.cantidad;
    inp.bultos.value        = r.bultos      || 1;
    inp.usePolimero.checked  = r.usePolimero !== false;
    inp.useApron.checked     = r.useApron    !== false;
    inp.useInoculante.checked= r.useInoculante !== false;
    calcDose();
    modal.classList.add('active');
};

// ════════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════════
function openModal() {
    editingId = null;
    recordForm.reset();
    const now = new Date();
    inp.fecha.value       = now.toISOString().split('T')[0];
    inp.horaInicio.value  = now.toTimeString().substring(0,5);
    inp.usePolimero.checked  = true;
    inp.useApron.checked     = true;
    inp.useInoculante.checked= true;
    inp.bultos.value = 1;
    resetOutputs();
    modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }

// ════════════════════════════════════════════
//  EVENTOS
// ════════════════════════════════════════════
function bindEvents() {
    // Login
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const u = inp.username.value.trim().toLowerCase();
        const p = inp.password.value.trim().toLowerCase();
        const errEl = document.getElementById('login-error');

        if (u === CREDENTIALS.user && p === CREDENTIALS.pass) {
            if (errEl) errEl.style.display = 'none';
            signIn(inp.username.value.trim());
        } else {
            if (errEl) {
                errEl.textContent = 'Usuario o contraseña incorrectos. Verifique e intente nuevamente.';
                errEl.style.display = 'block';
            }
        }
    });

    document.getElementById('btn-logout').addEventListener('click', signOut);

    // Modal open/close
    document.getElementById('btn-new-record').addEventListener('click', openModal);
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

    // Cálculo reactivo
    ['input','change'].forEach(ev => {
        inp.cantidad.addEventListener(ev, calcDose);
    });
    inp.unidad.addEventListener('change', calcDose);
    inp.bultos.addEventListener('input', calcDose);
    inp.usePolimero.addEventListener('change', calcDose);
    inp.useApron.addEventListener('change', calcDose);
    inp.useInoculante.addEventListener('change', calcDose);

    // Búsqueda
    document.getElementById('search-lote').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        renderTable(q ? records.filter(r => r.lote.toLowerCase().includes(q)) : records);
    });

    // Guardar / actualizar registro
    recordForm.addEventListener('submit', e => {
        e.preventDefault();
        const dose = calcDose();
        if (!dose) { alert('Ingresá una cantidad válida.'); return; }

        const record = {
            id:               editingId || Date.now().toString(),
            fecha:            inp.fecha.value,
            horaInicio:       inp.horaInicio.value,
            horaFin:          inp.horaFin.value,
            lote:             inp.lote.value,
            variedad:         inp.variedad.value,
            unidad:           inp.unidad.value,
            cantidad:         parseFloat(inp.cantidad.value),
            bultos:           parseFloat(inp.bultos.value),
            contenidoPromedio: dose.contenidoPromedio,
            usePolimero:      dose.usePolimero,
            useApron:         dose.useApron,
            useInoculante:    dose.useInoculante,
            polimero:         dose.polimero,
            apron:            dose.apron,
            inoculante:       dose.inoculante,
            total:            dose.total,
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

// ── Arranque ──
document.addEventListener('DOMContentLoaded', init);
