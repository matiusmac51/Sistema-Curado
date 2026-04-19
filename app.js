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

let lotesStats  = {}; 

// ── DOM ──
const views = { login: document.getElementById('login-view'), dashboard: document.getElementById('dashboard-view') };
const loginForm = document.getElementById('login-form');
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');

const historyBody = document.getElementById('history-body');
const emptyState = document.getElementById('empty-state');
const stocksBody = document.getElementById('stocks-body');
const dispatchBody = document.getElementById('dispatch-body');
const supplyBody = document.getElementById('supply-body');

const recordForm = document.getElementById('record-form');
const recordModal = document.getElementById('record-modal');

const dispatchModal = document.getElementById('dispatch-modal');
const dispatchForm = document.getElementById('dispatch-form');
const dispatchItemsContainer = document.getElementById('dispatch-items-container');
const btnAddLote = document.getElementById('btn-add-lote');
const dispatchKilosGlobal = document.getElementById('dispatch-kilos-global');

const supplyModal = document.getElementById('supply-modal');
const supplyForm = document.getElementById('supply-form');

const exportModal = document.getElementById('export-modal');

const inp = {
    email:          document.getElementById('email'),
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
    buildLotesStats(); 
    renderTable();
    renderStocks();
    renderDispatches();
    renderSupplies();
}

function buildLotesStats() {
    lotesStats = {};
    records.forEach(r => {
        if(!lotesStats[r.lote]) lotesStats[r.lote] = { curados: 0, despachados: 0, devueltos: 0, kgSuma: 0, bultosSuma: 0, avgKg: 0 };
        const b = parseFloat(r.bultos) || 0;
        lotesStats[r.lote].curados += b;
        lotesStats[r.lote].bultosSuma += b;
        
        let kg = r.unidad === 'Unidades' ? ((parseFloat(r.cantidad)||0) * KG_PER_UNIT) : (parseFloat(r.cantidad)||0);
        lotesStats[r.lote].kgSuma += kg;
    });

    Object.keys(lotesStats).forEach(k => {
        const ls = lotesStats[k];
        ls.avgKg = ls.bultosSuma > 0 ? (ls.kgSuma / ls.bultosSuma) : 0;
    });

    dispatches.forEach(d => {
        (d.items || []).forEach(item => {
            if(!lotesStats[item.lote]) lotesStats[item.lote] = { curados: 0, despachados: 0, devueltos: 0, kgSuma: 0, bultosSuma: 0, avgKg: 0 };
            const b = parseFloat(item.bultos) || 0;
            if(d.tipo === 'Despacho') lotesStats[item.lote].despachados += b;
            if(d.tipo === 'Devolución') lotesStats[item.lote].devueltos += b;
        });
    });
}

// ════════════════════════════════════════════
//  PANTALLAS
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

function renderStocks() {
    stocksBody.innerHTML = '';
    const loteKeys = Object.keys(lotesStats);
    if(loteKeys.length === 0) {
        document.getElementById('stocks-empty-state').style.display = 'block';
        return;
    }
    document.getElementById('stocks-empty-state').style.display = 'none';

    loteKeys.forEach(l => {
        const d = lotesStats[l];
        const stockActual = d.curados - d.despachados + d.devueltos;
        const stockKilos = stockActual * d.avgKg;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${l}</strong><br><small style="color:var(--text-muted)">${d.avgKg.toFixed(2)} Kg/bulto</small></td>
            <td>${d.curados}</td>
            <td class="text-error">${d.despachados}</td>
            <td style="color:#27ae60;">${d.devueltos}</td>
            <td><strong>${stockActual}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${stockKilos.toFixed(1)} Kg)</span></td>
        `;
        stocksBody.appendChild(tr);
    });
}

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
        
        let sumBultos = 0;
        let badges = '';
        (d.items || []).forEach(it => {
            sumBultos += parseFloat(it.bultos) || 0;
            badges += `<span style="display:inline-block; background-color:#eee; border-radius:4px; padding:2px 5px; margin:2px; font-size:0.7rem; border:1px solid #ccc;">${it.lote} (${it.bultos}b)</span> `;
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.fecha}</td>
            <td style="color:${typeColor}; font-weight:bold;">${d.tipo}</td>
            <td style="max-width: 150px;">${badges}</td>
            <td>${d.chofer}</td>
            <td>${d.campo} <br> <small>${d.cosecha}</small></td>
            <td><strong style="color:${typeColor}">${prefix}${sumBultos}</strong></td>
            <td>${d.kilos} Kg</td>
            <td class="actions-cell">
                <button class="btn btn-small btn-danger" onclick="deleteDispatch('${d.id}')">×</button>
            </td>
        `;
        dispatchBody.appendChild(tr);
    });
}

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

    ['polimero', 'apron', 'inoculante'].forEach(ins => {
        document.getElementById(`insumo-in-${ins}`).textContent = entered[ins].toFixed(2) + ' L';
        document.getElementById(`insumo-out-${ins}`).textContent = consumed[ins].toFixed(2) + ' L';
        document.getElementById(`insumo-stock-${ins}`).textContent = (entered[ins] - consumed[ins]).toFixed(2) + ' L';
    });

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
//  DESPACHO MULTI-LOTE LOGIC
// ════════════════════════════════════════════
function addDispatchItem(loteVal = '', bultosVal = 1) {
    const loteKeys = Object.keys(lotesStats);
    let optionsJSON = loteKeys.map(l => {
        const disp = lotesStats[l].curados - lotesStats[l].despachados + lotesStats[l].devueltos;
        return `<option value="${l}">${l} (Disponible: ${disp})</option>`;
    }).join('');

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '0.5rem';
    row.style.marginBottom = '0.5rem';
    row.className = 'dispatch-item-row';
    
    row.innerHTML = `
        <select class="dispatch-item-lote" required style="flex: 2;">
            <option value="">Seleccione Lote...</option>
            ${optionsJSON}
        </select>
        <input type="number" class="dispatch-item-bultos" required min="1" step="1" placeholder="Bultos" value="${bultosVal}" style="flex: 1;">
        <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove(); calcDispatchKilos();">X</button>
    `;
    
    if(loteVal) row.querySelector('.dispatch-item-lote').value = loteVal;

    row.querySelector('.dispatch-item-lote').addEventListener('change', calcDispatchKilos);
    row.querySelector('.dispatch-item-bultos').addEventListener('input', calcDispatchKilos);

    dispatchItemsContainer.appendChild(row);
    calcDispatchKilos();
}

window.calcDispatchKilos = function() {
    let sum = 0;
    const rows = document.querySelectorAll('.dispatch-item-row');
    rows.forEach(r => {
        const lote = r.querySelector('.dispatch-item-lote').value;
        const bultos = parseFloat(r.querySelector('.dispatch-item-bultos').value) || 0;
        if(lote && lotesStats[lote]) {
            sum += bultos * lotesStats[lote].avgKg;
        }
    });
    dispatchKilosGlobal.value = sum.toFixed(2) + ' Kg';
}

// ════════════════════════════════════════════
//  EXPORTACIONES
// ════════════════════════════════════════════
window.executeExport = function(method) {
    const wC = document.getElementById('exp-curados').checked;
    const wS = document.getElementById('exp-stocks').checked;
    const wD = document.getElementById('exp-despachos').checked;
    const wI = document.getElementById('exp-insumos').checked;

    if(!wC && !wS && !wD && !wI) return alert('Debes seleccionar al menos un módulo.');

    if (method === 'excel') {
        const wb = XLSX.utils.book_new();

        if(wC) {
            const hC = ['Fecha','Hora Inicio','Hora Fin','Nº Lote','Variedad','Unidad','Cantidad','Nº Bultos','Kg/Bulto','Polímero(L)','Apron/Maxin(L)','Inoculante(L)','Total Mezcla(L)'];
            const rC = records.map(r => ({
                'Fecha': r.fecha||'', 'Hora Inicio': r.horaInicio||'', 'Hora Fin': r.horaFin||'',
                'Nº Lote': r.lote, 'Variedad': r.variedad, 'Unidad': r.unidad, 'Cantidad': r.cantidad,
                'Nº Bultos': r.bultos||'', 'Kg/Bulto': r.contenidoPromedio ? parseFloat(r.contenidoPromedio.toFixed(2)) : '',
                'Polímero(L)': r.usePolimero!==false ? parseFloat(r.polimero.toFixed(3)) : '',
                'Apron/Maxin(L)': r.useApron!==false ? parseFloat(r.apron.toFixed(3)) : '',
                'Inoculante(L)': r.useInoculante!==false ? parseFloat(r.inoculante.toFixed(3)) : '',
                'Total Mezcla(L)': parseFloat(r.total.toFixed(3))
            }));
            const wsC = XLSX.utils.json_to_sheet(rC, { header: hC });
            XLSX.utils.book_append_sheet(wb, wsC, 'Curados');
        }

        if(wS) {
            const hS = ['Nº Lote', 'Bultos Curados', 'Bultos Despachados', 'Bultos Devueltos', 'Stock Disponible (Bultos)', 'Stock Disponible (Kilos)', 'Kg Promedio/Bulto'];
            const rS = Object.keys(lotesStats).map(l => {
                const s = lotesStats[l];
                const disp = s.curados - s.despachados + s.devueltos;
                return {
                    'Nº Lote': l, 'Bultos Curados': s.curados, 'Bultos Despachados': s.despachados,
                    'Bultos Devueltos': s.devueltos, 'Stock Disponible (Bultos)': disp,
                    'Stock Disponible (Kilos)': parseFloat((disp * s.avgKg).toFixed(2)), 'Kg Promedio/Bulto': parseFloat(s.avgKg.toFixed(2))
                };
            });
            const wsS = XLSX.utils.json_to_sheet(rS, { header: hS });
            XLSX.utils.book_append_sheet(wb, wsS, 'Stocks Lotes');
        }

        if(wD) {
            const hD = ['Fecha', 'Tipo', 'Chofer', 'Campo', 'Cosecha', 'Lote Afectado', 'Bultos Moviéndose', 'Kilos Viaje Global'];
            const rD = [];
            dispatches.forEach(d => {
                (d.items || []).forEach(item => {
                    rD.push({
                        'Fecha': d.fecha, 'Tipo': d.tipo, 'Chofer': d.chofer, 'Campo': d.campo, 'Cosecha': d.cosecha,
                        'Lote Afectado': item.lote, 'Bultos Moviéndose': item.bultos, 'Kilos Viaje Global': d.kilos
                    });
                });
            });
            const wsD = XLSX.utils.json_to_sheet(rD, { header: hD });
            XLSX.utils.book_append_sheet(wb, wsD, 'Despachos y Devoluciones');
        }

        if(wI) {
            const hI = ['Fecha', 'Insumo', 'Cantidad Ingresada (L)', 'Remito'];
            const rI = supplies.map(s => ({
                'Fecha': s.fecha, 'Insumo': s.insumo, 'Cantidad Ingresada (L)': parseFloat(s.cantidad), 'Remito': s.remito
            }));
            const wsI = XLSX.utils.json_to_sheet(rI, { header: hI });
            XLSX.utils.book_append_sheet(wb, wsI, 'Ingresos Insumo');
        }

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Manisur_ReporteGlobal_${currentUser}_${date}.xlsx`);
        exportModal.classList.remove('active');
    } 
    
    if (method === 'whatsapp') {
        const date = new Date().toLocaleDateString('es-AR');
        let msg = `✅ *Manisur — Reporte Consolidado*\nOperador: ${currentUser}\nFecha: ${date}\n`;

        if(wC && records.length > 0) {
            msg += `\n*—— CURADOS (Últimos 3) ——*\n`;
            [...records].reverse().slice(0, 3).forEach((r) => {
                msg += `▶ Lote: ${r.lote} | ${r.bultos||'-'} Bultos | ${r.total.toFixed(2)} L Mezcla\n`;
            });
        }
        if(wS && Object.keys(lotesStats).length > 0) {
            msg += `\n*—— STOCK LOTES ——*\n`;
            Object.keys(lotesStats).forEach(l => {
                const ls = lotesStats[l];
                const disp = ls.curados - ls.despachados + ls.devueltos;
                if(disp > 0) msg += `▶ ${l}: ${disp} Bultos (${(disp*ls.avgKg).toFixed(1)} Kg)\n`;
            });
        }
        if(wI) {
            msg += `\n*—— STOCK INSUMOS ——*\n`;
            ['polimero', 'apron', 'inoculante'].forEach(ins => {
                let disp = parseFloat(document.getElementById(`insumo-stock-${ins}`).textContent) || 0;
                msg += `▶ ${ins.toUpperCase()}: ${disp} L disp.\n`;
            });
        }
        
        msg += `\n_Generado por Manisur Logística_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        exportModal.classList.remove('active');
    }
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
    if (confirm('¿Eliminar este registro de curado? Esto impactará los stocks.')) { records = records.filter(r => r.id !== id); persist(); }
};
window.deleteDispatch = function(id) {
    if (confirm('¿Eliminar este movimiento?')) { dispatches = dispatches.filter(d => d.id !== id); persist(); }
};
window.deleteSupply = function(id) {
    if (confirm('¿Eliminar este ingreso de stock?')) { supplies = supplies.filter(s => s.id !== id); persist(); }
};
window.editRecord = function(id) {
    const r = records.find(r => r.id === id);
    if (!r) return;
    editingId = id;
    inp.fecha.value = r.fecha || ''; inp.horaInicio.value = r.horaInicio || ''; inp.horaFin.value = r.horaFin || '';
    inp.lote.value = r.lote; inp.variedad.value = r.variedad; inp.unidad.value = r.unidad; inp.cantidad.value = r.cantidad;
    inp.bultos.value = r.bultos || 1; inp.usePolimero.checked = r.usePolimero !== false; inp.useApron.checked = r.useApron !== false;
    inp.useInoculante.checked = r.useInoculante !== false; inp.ratePolimero.value = r.ratePolimero || RATES_PER_TON.polimero;
    inp.rateApron.value = r.rateApron || RATES_PER_TON.apron; inp.rateInoculante.value = r.rateInoculante || RATES_PER_TON.inoculante;
    out.modalTitle.textContent = 'Editar Registro';
    calcDose(); recordModal.classList.add('active');
};

// ════════════════════════════════════════════
//  EVENTOS GLOBALES
// ════════════════════════════════════════════
function bindEvents() {
    navItems.forEach(btn => { btn.addEventListener('click', () => switchTab(btn.dataset.tab)); });

    document.getElementById('btn-logout').addEventListener('click', signOut);
    document.getElementById('btn-export-xlsx').addEventListener('click', () => { exportModal.classList.add('active'); });
    document.getElementById('btn-whatsapp').addEventListener('click', () => { exportModal.classList.add('active'); });

    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = inp.email.value.trim();
        if (email) signIn(email);
        else document.getElementById('login-error').style.display = 'block';
    });

    document.getElementById('btn-new-record').addEventListener('click', () => {
        editingId = null; recordForm.reset(); out.modalTitle.textContent = 'Registrar Nuevo Curado';
        const now = new Date(); inp.fecha.value = now.toISOString().split('T')[0]; inp.horaInicio.value = now.toTimeString().substring(0,5);
        inp.usePolimero.checked = true; inp.useApron.checked = true; inp.useInoculante.checked = true;
        inp.ratePolimero.value = RATES_PER_TON.polimero; inp.rateApron.value = RATES_PER_TON.apron; inp.rateInoculante.value = RATES_PER_TON.inoculante;
        calcDose(); recordModal.classList.add('active');
    });

    // Añadir Lote Modal Despacho
    btnAddLote.addEventListener('click', () => addDispatchItem());

    document.getElementById('btn-new-dispatch').addEventListener('click', () => {
        dispatchForm.reset();
        dispatchItemsContainer.innerHTML = '';
        addDispatchItem(); // Start with at least 1 row
        document.getElementById('dispatch-fecha').value = new Date().toISOString().split('T')[0];
        calcDispatchKilos();
        dispatchModal.classList.add('active');
    });

    document.getElementById('btn-new-supply').addEventListener('click', () => {
        supplyForm.reset();
        document.getElementById('supply-fecha').value = new Date().toISOString().split('T')[0];
        supplyModal.classList.add('active');
    });

    const closeModals = () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.btn-icon, .btn-secondary').forEach(btn => {
        if(btn.id !== 'btn-add-lote') btn.addEventListener('click', closeModals);
    });

    ['input','change'].forEach(ev => inp.cantidad.addEventListener(ev, calcDose));
    inp.unidad.addEventListener('change', calcDose); inp.bultos.addEventListener('input', calcDose);
    inp.usePolimero.addEventListener('change', calcDose); inp.useApron.addEventListener('change', calcDose);
    inp.useInoculante.addEventListener('change', calcDose); inp.ratePolimero.addEventListener('input', calcDose);
    inp.rateApron.addEventListener('input', calcDose); inp.rateInoculante.addEventListener('input', calcDose);

    document.getElementById('search-lote').addEventListener('input', e => renderTable(e.target.value.toLowerCase()));

    recordForm.addEventListener('submit', e => {
        e.preventDefault();
        const dose = calcDose(); if (!dose) return alert('Ingresá una cantidad válida.');
        const record = {
            id: editingId || Date.now().toString(), fecha: inp.fecha.value, horaInicio: inp.horaInicio.value, horaFin: inp.horaFin.value,
            lote: inp.lote.value, variedad: inp.variedad.value, unidad: inp.unidad.value, cantidad: parseFloat(inp.cantidad.value), bultos: parseFloat(inp.bultos.value),
            contenidoPromedio: dose.contenidoPromedio, usePolimero: dose.usePolimero, useApron: dose.useApron, useInoculante: dose.useInoculante,
            polimero: dose.polimero, apron: dose.apron, inoculante: dose.inoculante, total: dose.total,
        };
        if (editingId) {
            const idx = records.findIndex(r => r.id === editingId);
            if (idx !== -1) records[idx] = record;
            editingId = null;
        } else { records.push(record); }
        persist(); closeModals();
    });

    dispatchForm.addEventListener('submit', e => {
        e.preventDefault();
        
        let customItems = [];
        const rows = document.querySelectorAll('.dispatch-item-row');
        rows.forEach(r => {
            const l = r.querySelector('.dispatch-item-lote').value;
            const b = parseFloat(r.querySelector('.dispatch-item-bultos').value);
            if(l && b > 0) customItems.push({ lote: l, bultos: b });
        });

        if(customItems.length === 0) return alert('Debés incluir y seleccionar al menos un lote con bultos.');

        const d = {
            id: Date.now().toString(),
            tipo: document.getElementById('dispatch-tipo').value,
            fecha: document.getElementById('dispatch-fecha').value,
            chofer: document.getElementById('dispatch-chofer').value,
            campo: document.getElementById('dispatch-campo').value,
            cosecha: document.getElementById('dispatch-cosecha').value,
            items: customItems,
            kilos: parseFloat(dispatchKilosGlobal.value.replace(' Kg', '')) || 0
        };
        dispatches.push(d);
        persist(); closeModals();
    });

    supplyForm.addEventListener('submit', e => {
        e.preventDefault();
        const s = {
            id: Date.now().toString(), fecha: document.getElementById('supply-fecha').value,
            insumo: document.getElementById('supply-insumo').value, cantidad: parseFloat(document.getElementById('supply-cantidad').value), remito: document.getElementById('supply-remito').value
        };
        supplies.push(s);
        persist(); closeModals();
    });
}

document.addEventListener('DOMContentLoaded', init);
