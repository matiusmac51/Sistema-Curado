// ═══════════════════════════════════════════════════
//  AgroSeed — Sistema Logística de Curado
// ═══════════════════════════════════════════════════

const RATES_PER_TON  = { polimero: 6.3,   apron: 1.0,   inoculante: 3.0 };
const RATES_PER_UNIT = { polimero: 7.875, apron: 1.250, inoculante: 3.750 };
const KG_PER_UNIT    = 1250;

// ── Estado ──
let currentUser = null;   
let records     = [];
let dispatches  = [];
let supplies    = [];
let editingId   = null;

// ── DOM ──
const views       = { login: document.getElementById('login-view'), dashboard: document.getElementById('dashboard-view') };
const loginForm   = document.getElementById('login-form');

// Nav & Tabs
const navItems    = document.querySelectorAll('.nav-item');
const tabPanes    = document.querySelectorAll('.tab-pane');

// Tablas Base
const historyBody  = document.getElementById('history-body');
const emptyState   = document.getElementById('empty-state');
const stocksBody   = document.getElementById('stocks-body');
const dispatchBody = document.getElementById('dispatch-body');
const supplyBody   = document.getElementById('supply-body');

// Modales Curado
const recordForm  = document.getElementById('record-form');
const recordModal = document.getElementById('record-modal');

// Modales Nuevos
const dispatchModal = document.getElementById('dispatch-modal');
const dispatchForm  = document.getElementById('dispatch-form');
const supplyModal   = document.getElementById('supply-modal');
const supplyForm    = document.getElementById('supply-form');

const inp = {
    email:          document.getElementById('email'),
    password:       document.getElementById('password'), // (Dummy por ahora)
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

function showView(id) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[id].classList.add('active');
}

function switchTab(tabId) {
    navItems.forEach(i => i.classList.toggle('active', i.dataset.tab === tabId));
    tabPanes.forEach(p => p.classList.toggle('active', p.id === tabId));
}

// ════════════════════════════════════════════
//  AUTH & STORAGE
// ════════════════════════════════════════════
function signIn(email, persist = true) {
    currentUser = email.trim().toLowerCase();
    out.userBadge.textContent = currentUser;
    if (persist) try { sessionStorage.setItem('ag_user', currentUser); } catch(e) {}
    loadData();
    showView('dashboard');
}

function signOut() {
    currentUser = null; records = []; dispatches = []; supplies = [];
    try { sessionStorage.removeItem('ag_user'); } catch(e) {}
    loginForm.reset();
    document.getElementById('login-error').style.display = 'none';
    showView('login');
}

function loadData() {
    try { records = JSON.parse(localStorage.getItem(`agseed::${currentUser}`)) || []; } catch(e) { records = []; }
    try { dispatches = JSON.parse(localStorage.getItem(`agseed::dispatch::${currentUser}`)) || []; } catch(e) { dispatches = []; }
    try { supplies = JSON.parse(localStorage.getItem(`agseed::supply::${currentUser}`)) || []; } catch(e) { supplies = []; }
    renderAll();
}

function persist() {
    try { 
        localStorage.setItem(`agseed::${currentUser}`, JSON.stringify(records)); 
        localStorage.setItem(`agseed::dispatch::${currentUser}`, JSON.stringify(dispatches)); 
        localStorage.setItem(`agseed::supply::${currentUser}`, JSON.stringify(supplies)); 
    } catch(e) {}
    renderAll();
}

function renderAll() {
    renderTable();
    renderStocks();
    renderDispatches();
    renderSupplies();
}

// ════════════════════════════════════════════
//  TABLA: REGISTRO DE CURADOS (HISTORIAL)
// ════════════════════════════════════════════
function renderTable(q = null) {
    historyBody.innerHTML = '';
    const filtered = q ? records.filter(r => r.lote.toLowerCase().includes(q)) : records;
    out.recordCount.textContent = `${records.length} registros totales`;

    if (!filtered || filtered.length === 0) { emptyState.style.display = 'block'; return; }
    emptyState.style.display = 'none';

    [...filtered].reverse().forEach(r => {
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
//  TAB 2: STOCKS DE CURADO (AGRUPADO POR LOTE)
// ════════════════════════════════════════════
function renderStocks() {
    let lotes = {};

    // Sumar producción original de Bultos
    records.forEach(r => {
        if(!lotes[r.lote]) lotes[r.lote] = { curados: 0, despachados: 0, devueltos: 0 };
        lotes[r.lote].curados += (parseFloat(r.bultos) || 0);
    });

    // Sumar despachos y devoluciones
    dispatches.forEach(d => {
        if(!lotes[d.lote]) lotes[d.lote] = { curados: 0, despachados: 0, devueltos: 0 };
        if(d.tipo === 'Despacho') lotes[d.lote].despachados += (parseFloat(d.bultos) || 0);
        if(d.tipo === 'Devolución') lotes[d.lote].devueltos += (parseFloat(d.bultos) || 0);
    });

    stocksBody.innerHTML = '';
    const selectLote = document.getElementById('dispatch-lote');
    selectLote.innerHTML = '<option value="">Seleccione un Lote...</option>';

    const loteKeys = Object.keys(lotes);
    if(loteKeys.length === 0) {
        document.getElementById('stocks-empty-state').style.display = 'block';
        return;
    }
    document.getElementById('stocks-empty-state').style.display = 'none';

    loteKeys.forEach(l => {
        const d = lotes[l];
        const stockActual = d.curados - d.despachados + d.devueltos;

        // Populate selects
        const opt = document.createElement('option');
        opt.value = l; opt.textContent = `${l} (Stock Disp: ${stockActual})`;
        selectLote.appendChild(opt);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${l}</strong></td>
            <td>${d.curados}</td>
            <td class="text-error">${d.despachados}</td>
            <td style="color:#27ae60;">${d.devueltos}</td>
            <td><strong>${stockActual}</strong></td>
        `;
        stocksBody.appendChild(tr);
    });
}

// ════════════════════════════════════════════
//  TAB 3: DESPACHOS
// ════════════════════════════════════════════
function renderDispatches() {
    dispatchBody.innerHTML = '';
    document.getElementById('dispatch-count').textContent = dispatches.length ? `${dispatches.length} movimientos` : '—';
    
    if(dispatches.length === 0) {
        document.getElementById('dispatch-empty-state').style.display = 'block';
        return;
    }
    document.getElementById('dispatch-empty-state').style.display = 'none';

    [...dispatches].reverse().forEach(d => {
        const isDespacho = d.tipo === 'Despacho';
        const typeColor = isDespacho ? 'var(--error)' : '#27ae60';
        const prefix = isDespacho ? '-' : '+';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.fecha}</td>
            <td style="color:${typeColor}; font-weight:bold;">${d.tipo}</td>
            <td><strong>${d.lote}</strong></td>
            <td>${d.chofer}</td>
            <td>${d.campo} <br> <small>${d.cosecha}</small></td>
            <td><strong style="color:${typeColor}">${prefix}${d.bultos}</strong></td>
            <td>${d.kilos} Kg</td>
            <td class="actions-cell">
                <button class="btn btn-small btn-danger" onclick="deleteDispatch('${d.id}')">×</button>
            </td>
        `;
        dispatchBody.appendChild(tr);
    });
}

// ════════════════════════════════════════════
//  TAB 4: INSUMOS
// ════════════════════════════════════════════
function renderSupplies() {
    let consumed = { polimero: 0, apron: 0, inoculante: 0 };
    records.forEach(r => {
        if(r.usePolimero !== false) consumed.polimero += (r.polimero || 0);
        if(r.useApron !== false) consumed.apron += (r.apron || 0);
        if(r.useInoculante !== false) consumed.inoculante += (r.inoculante || 0);
    });

    let entered = { polimero: 0, apron: 0, inoculante: 0 };
    supplies.forEach(s => {
        if(s.insumo === 'polimero') entered.polimero += (parseFloat(s.cantidad) || 0);
        if(s.insumo === 'apron') entered.apron += (parseFloat(s.cantidad) || 0);
        if(s.insumo === 'inoculante') entered.inoculante += (parseFloat(s.cantidad) || 0);
    });

    // Update DOM Dashboard Cards
    ['polimero', 'apron', 'inoculante'].forEach(ins => {
        document.getElementById(`insumo-in-${ins}`).textContent = entered[ins].toFixed(2) + ' L';
        document.getElementById(`insumo-out-${ins}`).textContent = consumed[ins].toFixed(2) + ' L';
        document.getElementById(`insumo-stock-${ins}`).textContent = (entered[ins] - consumed[ins]).toFixed(2) + ' L';
    });

    // Update Table
    supplyBody.innerHTML = '';
    if(supplies.length === 0) {
        document.getElementById('supply-empty-state').style.display = 'block';
        return;
    }
    document.getElementById('supply-empty-state').style.display = 'none';

    [...supplies].reverse().forEach(s => {
        const names = { polimero: 'Polímero', apron: 'Apron/Maxin', inoculante: 'Inoculante' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.fecha}</td>
            <td><strong>${names[s.insumo]}</strong></td>
            <td style="color:#27ae60; font-weight:bold;">+${parseFloat(s.cantidad).toFixed(2)} L</td>
            <td>${s.remito}</td>
            <td class="actions-cell">
                <button class="btn btn-small btn-danger" onclick="deleteSupply('${s.id}')">×</button>
            </td>
        `;
        supplyBody.appendChild(tr);
    });
}


// ════════════════════════════════════════════
//  CÁLCULO DE DOSIS (MODAL CURADO)
// ════════════════════════════════════════════
function calcDose() {
    const unidad = inp.unidad.value;
    const qty    = parseFloat(inp.cantidad.value)  || 0;
    const bultos = parseFloat(inp.bultos.value)    || 1;
    const useP   = inp.usePolimero.checked;
    const useA   = inp.useApron.checked;
    const useI   = inp.useInoculante.checked;

    const rateP = parseFloat(inp.ratePolimero.value)   || RATES_PER_TON.polimero;
    const rateA = parseFloat(inp.rateApron.value)      || RATES_PER_TON.apron;
    const rateI = parseFloat(inp.rateInoculante.value) || RATES_PER_TON.inoculante;

    const rateP_u = rateP * 1.25;
    const rateA_u = rateA * 1.25;
    const rateI_u = rateI * 1.25;

    if (qty <= 0) { 
        ['polimero','apron','inoculante'].forEach(k => out[k].textContent = '— L');
        out.total.textContent = '0.000 L';
        inp.contenidoBulto.value = '';
        return null; 
    }

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

    const total = polimero + apron + inoculante;
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

// ════════════════════════════════════════════
//  ELIMINACIONES / EDICIÓN
// ════════════════════════════════════════════
window.deleteRecord = function(id) {
    if (confirm('¿Eliminar este registro de curado? Esto impactará los stocks.')) {
        records = records.filter(r => r.id !== id);
        persist();
    }
};

window.deleteDispatch = function(id) {
    if (confirm('¿Eliminar este movimiento?')) {
        dispatches = dispatches.filter(d => d.id !== id);
        persist();
    }
};

window.deleteSupply = function(id) {
    if (confirm('¿Eliminar este ingreso de stock?')) {
        supplies = supplies.filter(s => s.id !== id);
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
    inp.ratePolimero.value   = r.ratePolimero   || RATES_PER_TON.polimero;
    inp.rateApron.value      = r.rateApron      || RATES_PER_TON.apron;
    inp.rateInoculante.value = r.rateInoculante || RATES_PER_TON.inoculante;
    out.modalTitle.textContent = 'Editar Registro';
    calcDose();
    recordModal.classList.add('active');
};

// ════════════════════════════════════════════
//  EVENTOS GLOBALES
// ════════════════════════════════════════════
function bindEvents() {

    // NAVEGACIÓN TABS
    navItems.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Login
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = inp.email.value.trim();
        if (email) signIn(email);
        else document.getElementById('login-error').style.display = 'block';
    });

    // Modales - Abrir
    document.getElementById('btn-new-record').addEventListener('click', () => {
        editingId = null; recordForm.reset();
        out.modalTitle.textContent = 'Registrar Nuevo Curado';
        const now = new Date();
        inp.fecha.value = now.toISOString().split('T')[0];
        inp.horaInicio.value = now.toTimeString().substring(0,5);
        inp.usePolimero.checked = true; inp.useApron.checked = true; inp.useInoculante.checked = true;
        inp.ratePolimero.value = RATES_PER_TON.polimero; inp.rateApron.value = RATES_PER_TON.apron; inp.rateInoculante.value = RATES_PER_TON.inoculante;
        calcDose();
        recordModal.classList.add('active');
    });

    document.getElementById('btn-new-dispatch').addEventListener('click', () => {
        dispatchForm.reset();
        document.getElementById('dispatch-fecha').value = new Date().toISOString().split('T')[0];
        dispatchModal.classList.add('active');
    });

    document.getElementById('btn-new-supply').addEventListener('click', () => {
        supplyForm.reset();
        document.getElementById('supply-fecha').value = new Date().toISOString().split('T')[0];
        supplyModal.classList.add('active');
    });

    // Modales - Cerrar
    const closeModals = () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.getElementById('btn-close-modal').addEventListener('click', closeModals);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModals);
    document.getElementById('btn-close-dispatch').addEventListener('click', closeModals);
    document.getElementById('btn-cancel-dispatch').addEventListener('click', closeModals);
    document.getElementById('btn-close-supply').addEventListener('click', closeModals);
    document.getElementById('btn-cancel-supply').addEventListener('click', closeModals);

    // Reactividad Curado
    ['input','change'].forEach(ev => inp.cantidad.addEventListener(ev, calcDose));
    inp.unidad.addEventListener('change', calcDose);
    inp.bultos.addEventListener('input', calcDose);
    inp.usePolimero.addEventListener('change', calcDose);
    inp.useApron.addEventListener('change', calcDose);
    inp.useInoculante.addEventListener('change', calcDose);
    inp.ratePolimero.addEventListener('input', calcDose);
    inp.rateApron.addEventListener('input', calcDose);
    inp.rateInoculante.addEventListener('input', calcDose);

    // Buscar en Curado
    document.getElementById('search-lote').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        renderTable(q);
    });

    // GUARDAR CURADO
    recordForm.addEventListener('submit', e => {
        e.preventDefault();
        const dose = calcDose();
        if (!dose) return alert('Ingresá una cantidad válida.');

        const record = {
            id: editingId || Date.now().toString(),
            fecha: inp.fecha.value, horaInicio: inp.horaInicio.value, horaFin: inp.horaFin.value,
            lote: inp.lote.value, variedad: inp.variedad.value,
            unidad: inp.unidad.value, cantidad: parseFloat(inp.cantidad.value), bultos: parseFloat(inp.bultos.value),
            contenidoPromedio: dose.contenidoPromedio,
            usePolimero: dose.usePolimero, useApron: dose.useApron, useInoculante: dose.useInoculante,
            polimero: dose.polimero, apron: dose.apron, inoculante: dose.inoculante, total: dose.total,
        };

        if (editingId) {
            const idx = records.findIndex(r => r.id === editingId);
            if (idx !== -1) records[idx] = record;
            editingId = null;
        } else { records.push(record); }
        
        persist(); closeModals();
    });

    // GUARDAR DESPACHO
    dispatchForm.addEventListener('submit', e => {
        e.preventDefault();
        const d = {
            id: Date.now().toString(),
            tipo: document.getElementById('dispatch-tipo').value,
            fecha: document.getElementById('dispatch-fecha').value,
            lote: document.getElementById('dispatch-lote').value,
            chofer: document.getElementById('dispatch-chofer').value,
            campo: document.getElementById('dispatch-campo').value,
            cosecha: document.getElementById('dispatch-cosecha').value,
            bultos: parseFloat(document.getElementById('dispatch-bultos').value),
            kilos: parseFloat(document.getElementById('dispatch-kilos').value)
        };
        dispatches.push(d);
        persist(); closeModals();
    });

    // GUARDAR INSUMOS
    supplyForm.addEventListener('submit', e => {
        e.preventDefault();
        const s = {
            id: Date.now().toString(),
            fecha: document.getElementById('supply-fecha').value,
            insumo: document.getElementById('supply-insumo').value,
            cantidad: parseFloat(document.getElementById('supply-cantidad').value),
            remito: document.getElementById('supply-remito').value
        };
        supplies.push(s);
        persist(); closeModals();
    });

}

document.addEventListener('DOMContentLoaded', init);
