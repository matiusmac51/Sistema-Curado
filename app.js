// Constants for Calculations
const DOSAGE_RATES = {
    // por cada 1000kg
    polimero: 6.3,
    apron: 1.0,
    inoculante: 3.0
};

// Base total for 1 Unit (1250kg)
const FIX_UNIT_1250 = {
    polimero: 7.875,
    apron: 1.250,
    inoculante: 3.750,
    total: 12.875
};

// State
let currentUser = null;
let records = [];
let editingRecordId = null;

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
};

const forms = {
    login: document.getElementById('login-form'),
    record: document.getElementById('record-form')
};

const ui = {
    currentUserEmail: document.getElementById('current-user-email'),
    btnLogout: document.getElementById('btn-logout'),
    btnNewRecord: document.getElementById('btn-new-record'),
    modal: document.getElementById('record-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    historyBody: document.getElementById('history-body'),
    emptyState: document.getElementById('empty-state'),
    searchLote: document.getElementById('search-lote')
};

// Form Inputs
const inputs = {
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    fecha: document.getElementById('fecha'),
    horaInicio: document.getElementById('hora-inicio'),
    horaFin: document.getElementById('hora-fin'),
    lote: document.getElementById('lote'),
    variedad: document.getElementById('variedad'),
    unidad: document.getElementById('unidad'),
    cantidad: document.getElementById('cantidad'),
    bultos: document.getElementById('bultos')
};

// Calculation Outputs
const outputs = {
    polimero: document.getElementById('calc-polimero'),
    apron: document.getElementById('calc-apron'),
    inoculante: document.getElementById('calc-inoculante'),
    total: document.getElementById('calc-total'),
    contenidoBulto: document.getElementById('calc-contenido-bulto')
};

// Initialization
function init() {
    // Check if user is logged in
    try {
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
            login(sessionUser);
        }
    } catch(e) {
        console.error("Storage Error:", e);
    }

    attachEventListeners();
}

// Navigation
function showView(viewId) {
    Object.values(views).forEach(view => view.classList.remove('active'));
    views[viewId].classList.add('active');
}

// Auth
function login(username) {
    currentUser = username;
    
    try {
        sessionStorage.setItem('currentUser', username);
    } catch(e) {
        console.error("Storage Error:", e);
    }
    
    ui.currentUserEmail.textContent = username;
    
    // Load records from "Database" (using localStorage mapped to user as requested)
    loadRecords();
    showView('dashboard');
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    records = [];
    forms.login.reset();
    showView('login');
}

// Database (Simulated via localStorage)
function loadRecords() {
    try {
        const data = localStorage.getItem(`db_seed_${currentUser}`);
        records = data ? JSON.parse(data) : [];
    } catch(e) {
        console.error("Storage Error:", e);
        records = [];
    }
    renderTable(records);
}

function persistData() {
    try {
        localStorage.setItem(`db_seed_${currentUser}`, JSON.stringify(records));
    } catch(e) {
        console.error("Storage Error:", e);
    }
    renderTable(records);
}

// Global Actions
window.deleteRecord = function(id) {
    if (confirm('¿Está seguro de querer eliminar este registro?')) {
        records = records.filter(r => r.id !== id);
        persistData();
    }
}

window.editRecord = function(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;
    
    editingRecordId = id;
    
    // Repopular los campos
    inputs.fecha.value = record.fechaRegistro || record.fecha;
    inputs.horaInicio.value = record.horaInicio || '';
    inputs.horaFin.value = record.horaFin || '';
    inputs.lote.value = record.lote;
    inputs.variedad.value = record.variedad;
    inputs.unidad.value = record.unidad;
    inputs.cantidad.value = record.cantidad;
    inputs.bultos.value = record.bultos || 1;
    
    calculateDose();
    ui.modal.classList.add('active');
}

// Calculations
function calculateDose() {
    const unidad = inputs.unidad.value;
    const cantidadStr = inputs.cantidad.value;
    const bultosStr = inputs.bultos.value;
    
    // Reset if empty
    if (!cantidadStr || parseFloat(cantidadStr) <= 0) {
        setOutputs(0, 0, 0, 0, 0);
        return;
    }

    const cantidad = parseFloat(cantidadStr);
    const bultos = parseFloat(bultosStr) || 1; // prevent div by zero

    let polimero = 0, apron = 0, inoculante = 0, total = 0;
    let totalKilos = 0;

    if (unidad === 'Unidades') {
        // Multiplicador por unidad de 1250kg
        totalKilos = cantidad * 1250;
        polimero = cantidad * FIX_UNIT_1250.polimero;
        apron = cantidad * FIX_UNIT_1250.apron;
        inoculante = cantidad * FIX_UNIT_1250.inoculante;
    } else {
        // Kilos: Ratio sobre 1000kg
        totalKilos = cantidad;
        const ratio = cantidad / 1000;
        polimero = ratio * DOSAGE_RATES.polimero;
        apron = ratio * DOSAGE_RATES.apron;
        inoculante = ratio * DOSAGE_RATES.inoculante;
    }

    const contenidoPromedio = totalKilos / bultos;

    total = polimero + apron + inoculante;
    setOutputs(polimero, apron, inoculante, total, contenidoPromedio, 'Kg');
    
    return { polimero, apron, inoculante, total, contenidoPromedio };
}

function setOutputs(polimero, apron, inoculante, total, contBulto, lblUnidad) {
    outputs.polimero.textContent = `${polimero.toFixed(3)} L`;
    outputs.apron.textContent = `${apron.toFixed(3)} L`;
    outputs.inoculante.textContent = `${inoculante.toFixed(3)} L`;
    outputs.total.textContent = `${total.toFixed(3)} L`;
    if (contBulto !== undefined) {
        outputs.contenidoBulto.value = `${contBulto.toFixed(2)} ${lblUnidad || ''}/Bulto`;
    }
}

// UI Rendering
function renderTable(data = records) {
    ui.historyBody.innerHTML = '';
    
    if (data.length === 0) {
        ui.emptyState.style.display = 'block';
    } else {
        ui.emptyState.style.display = 'none';
        
        // Render in reverse chronological order
        [...data].reverse().forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.fechaRegistro || record.fecha}</td>
                <td>${record.horaInicio || '--:--'} - ${record.horaFin || '--:--'}</td>
                <td><strong>${record.lote}</strong></td>
                <td>${record.variedad}</td>
                <td>${record.cantidad} ${record.unidad}</td>
                <td><strong>${record.bultos || '-'}</strong> (${record.contenidoPromedio ? record.contenidoPromedio.toFixed(2) : '-'} Kg / Bulto)</td>
                <td><strong>${record.total.toFixed(3)}</strong></td>
                <td class="actions-cell">
                    <button class="btn btn-small btn-edit" onclick="editRecord('${record.id}')">Editar</button>
                    <button class="btn btn-small btn-danger" onclick="deleteRecord('${record.id}')">Eliminar</button>
                </td>
            `;
            ui.historyBody.appendChild(tr);
        });
    }
}

// Events
function attachEventListeners() {
    // Auth Events
    forms.login.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = inputs.username.value.trim();
        const password = inputs.password.value;
        
        if (username.toLowerCase() === 'matius' && password === 'M4tius') {
            login(username);
        } else {
            alert('Usuario o contraseña incorrectos.');
        }
    });

    ui.btnLogout.addEventListener('click', logout);

    // Modal Events
    ui.btnNewRecord.addEventListener('click', () => {
        editingRecordId = null; // Clear edit state for NEW records
        forms.record.reset();
        
        // Defaults
        const now = new Date();
        inputs.fecha.value = now.toISOString().split('T')[0];
        // Time format HH:MM
        inputs.horaInicio.value = now.toTimeString().substring(0, 5);
        inputs.bultos.value = 1;
        
        setOutputs(0, 0, 0, 0, 0);
        ui.modal.classList.add('active');
    });

    const closeModal = () => ui.modal.classList.remove('active');
    ui.btnCloseModal.addEventListener('click', closeModal);
    ui.btnCancelModal.addEventListener('click', closeModal);

    // Calculation Events
    inputs.cantidad.addEventListener('input', calculateDose);
    inputs.unidad.addEventListener('change', calculateDose);
    inputs.bultos.addEventListener('input', calculateDose);

    // Filter Events
    ui.searchLote.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = records.filter(r => r.lote.toLowerCase().includes(query));
        renderTable(filtered);
    });

    // Form Submission
    forms.record.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const dose = calculateDose();
        if (!dose) return; // Validation failed
        
        const recData = {
            id: editingRecordId || Date.now().toString(),
            fechaRegistro: inputs.fecha.value,
            horaInicio: inputs.horaInicio.value,
            horaFin: inputs.horaFin.value,
            lote: inputs.lote.value,
            variedad: inputs.variedad.value,
            unidad: inputs.unidad.value,
            cantidad: parseFloat(inputs.cantidad.value),
            bultos: parseFloat(inputs.bultos.value),
            contenidoPromedio: dose.contenidoPromedio,
            polimero: dose.polimero,
            apron: dose.apron,
            inoculante: dose.inoculante,
            total: dose.total
        };

        if (editingRecordId) {
            const index = records.findIndex(r => r.id === editingRecordId);
            if (index !== -1) records[index] = recData;
            editingRecordId = null;
        } else {
            records.push(recData);
        }

        persistData();
        closeModal();
    });
}

// Boot up
document.addEventListener('DOMContentLoaded', init);
