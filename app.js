// ==================== BREAKLOOP - PWA Modular ====================
// Soporta: General (pornografía/procrastinación) y Ludopatía (adicción al juego)
// País fijo: Cuba
// Offline first, instalable, con PIN opcional, exportación, etc.

// ==================== CONFIGURACIÓN DE MODOS ====================
const MODOS = {
    general: {
        nombre: "General (pornografía/procrastinación)",
        accionesBase: {
            fisica: "Ponte de pie y estira los brazos hacia arriba durante 10 segundos",
            cognitiva: "Di en voz alta: 'Esto es solo un impulso, no una necesidad'",
            simbolica: "Toca el botón 'Completado' y observa cómo tu dedo lo hace",
            emergencia: "Respira profundo una vez, aprieta y suelta tus manos"
        },
        duracionMaximaSegundos: 30,
        mostrarAvisoProfesional: false,
        cuartaAccionFinanciera: false,
        pinHabilitadoPorDefecto: false
    },
    ludopatia: {
        nombre: "Ludopatía (adicción al juego)",
        accionesBase: {
            fisica: "Aparta cualquier tarjeta de crédito, débito o dinero en efectivo de tu vista. Mételos en un cajón o bolsillo cerrado.",
            cognitiva: "Di en voz alta: 'El casino siempre gana a largo plazo. Esta apuesta no me hará recuperar lo perdido'",
            simbolica: "Tacha un número de tu 'contador de victorias' (dibuja una cuadrícula en un papel y marca cada vez que resistes)",
            emergencia: "Aprieta tus manos con fuerza hasta sentir presión intensa. Suelta. Respira. No deposites nada ahora."
        },
        duracionMaximaSegundos: 120,
        mostrarAvisoProfesional: true,
        cuartaAccionFinanciera: true,
        pinHabilitadoPorDefecto: false
    }
};

// ==================== VARIABLES GLOBALES ====================
let configuracion = {
    modoActual: "general",  // "general" o "ludopatia"
    accionesPersonalizadas: {}, // Si el usuario edita
    cuartaAccionActiva: true,
    pinActivo: false,
    pinHash: null,
    ultimoModoRecordado: "general"
};

let diario = []; // Array de registros
let streak = 0; // Rachas actuales (solo celebración)
let pantallaSecuencia = {
    pasoActual: 0,
    pasos: [], // ["fisica", "cognitiva", "simbolica"] o + "financiera"
    esModoEmergencia: false
};

// Elementos DOM
let mainScreen, sequenceScreen, successScreen, diaryScreen, configScreen, pinModal;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Obtener referencias a pantallas
    mainScreen = document.getElementById('mainScreen');
    sequenceScreen = document.getElementById('sequenceScreen');
    successScreen = document.getElementById('successScreen');
    diaryScreen = document.getElementById('diaryScreen');
    configScreen = document.getElementById('configScreen');
    pinModal = document.getElementById('pinModal');
    
    // Cargar datos guardados
    cargarDatos();
    
    // Verificar si es primer inicio con modo ludopatía y mostrar aviso
    if (configuracion.modoActual === "ludopatia" && MODOS.ludopatia.mostrarAvisoProfesional) {
        mostrarAvisoProfesionalCuba();
    }
    
    // Actualizar UI según modo
    actualizarUIporModo();
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Registrar Service Worker para PWA offline
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(() => {
            console.log('Service Worker registrado');
        }).catch(err => console.log('Error SW:', err));
    }
    
    // Mostrar pantalla principal
    mostrarPantalla('main');
    actualizarStatsUI();
    cargarDiarioUI();
});

// ==================== FUNCIONES DE ALMACENAMIENTO ====================
function cargarDatos() {
    const guardado = localStorage.getItem('breakloop_config');
    if (guardado) {
        try {
            const data = JSON.parse(guardado);
            configuracion = { ...configuracion, ...data };
        } catch(e) {}
    }
    
    const diarioGuardado = localStorage.getItem('breakloop_diario');
    if (diarioGuardado) {
        try {
            diario = JSON.parse(diarioGuardado);
        } catch(e) {}
    }
    
    const streakGuardado = localStorage.getItem('breakloop_streak');
    if (streakGuardado) {
        streak = parseInt(streakGuardado) || 0;
    }
    
    // Asegurar valores por defecto
    if (!configuracion.accionesPersonalizadas) configuracion.accionesPersonalizadas = {};
    if (configuracion.cuartaAccionActiva === undefined) configuracion.cuartaAccionActiva = true;
}

function guardarConfiguracion() {
    localStorage.setItem('breakloop_config', JSON.stringify(configuracion));
}

function guardarDiario() {
    localStorage.setItem('breakloop_diario', JSON.stringify(diario));
}

function guardarStreak() {
    localStorage.setItem('breakloop_streak', streak);
}

// ==================== FUNCIONES DE UI ====================
function mostrarPantalla(pantalla) {
    const pantallas = ['main', 'sequence', 'success', 'diary', 'config'];
    pantallas.forEach(p => {
        const el = document.getElementById(`${p}Screen`);
        if (el) el.classList.remove('active');
    });
    document.getElementById(`${pantalla}Screen`).classList.add('active');
}

function actualizarUIporModo() {
    const modo = configuracion.modoActual;
    const modoData = MODOS[modo];
    document.getElementById('modoBadge').innerHTML = `🎯 Modo activo: ${modoData.nombre}`;
    
    // Mostrar/ocultar opciones de ludopatía en configuración
    const ludopatiaOptions = document.getElementById('ludopatiaOptions');
    if (modo === 'ludopatia') {
        ludopatiaOptions.style.display = 'block';
        document.getElementById('cuartaAccionFinanciera').checked = configuracion.cuartaAccionActiva;
        document.getElementById('bloqueoPin').checked = configuracion.pinActivo;
    } else {
        ludopatiaOptions.style.display = 'none';
    }
    
    // Cargar acciones personalizadas en los textareas
    const accBase = modoData.accionesBase;
    document.getElementById('customFisica').value = configuracion.accionesPersonalizadas.fisica || accBase.fisica;
    document.getElementById('customCognitiva').value = configuracion.accionesPersonalizadas.cognitiva || accBase.cognitiva;
    document.getElementById('customSimbolica').value = configuracion.accionesPersonalizadas.simbolica || accBase.simbolica;
    document.getElementById('customEmergencia').value = configuracion.accionesPersonalizadas.emergencia || accBase.emergencia;
}

function actualizarStatsUI() {
    const hoy = new Date().toDateString();
    const exitosHoy = diario.filter(entry => 
        new Date(entry.fecha).toDateString() === hoy && entry.completado === true
    ).length;
    document.getElementById('todaySuccessCount').innerText = exitosHoy;
    document.getElementById('currentStreak').innerText = streak;
}

function mostrarAvisoProfesionalCuba() {
    if (!localStorage.getItem('aviso_profesional_visto')) {
        setTimeout(() => {
            alert("⚠️ AVISO IMPORTANTE\n\nEsta app es una herramienta de apoyo, no sustituye tratamiento profesional.\n\nSi has perdido control sobre tus finanzas o relaciones, busca ayuda:\n📞 Línea MINSAP: 7 838-0000\n🏥 Acude a tu policlínico");
            localStorage.setItem('aviso_profesional_visto', 'true');
        }, 500);
    }
}

// ==================== SECUENCIA DE ACCIONES ====================
function iniciarSecuencia(esEmergencia = false) {
    // Verificar PIN si está activo en ludopatía
    if (configuracion.modoActual === 'ludopatia' && configuracion.pinActivo) {
        if (!verificarPin()) {
            return;
        }
    }
    
    pantallaSecuencia.esModoEmergencia = esEmergencia;
    const modoData = MODOS[configuracion.modoActual];
    
    if (esEmergencia) {
        // Modo emergencia: solo una acción
        pantallaSecuencia.pasos = ['emergencia'];
        pantallaSecuencia.pasoActual = 0;
        mostrarPasoAccion();
    } else {
        // Modo normal: secuencia completa
        pantallaSecuencia.pasos = ['fisica', 'cognitiva', 'simbolica'];
        
        // Si es ludopatía y cuarta acción activa, agregar financiera
        if (configuracion.modoActual === 'ludopatia' && configuracion.cuartaAccionActiva) {
            pantallaSecuencia.pasos.push('financiera');
        }
        pantallaSecuencia.pasoActual = 0;
        mostrarPasoAccion();
    }
    
    mostrarPantalla('sequence');
}

function mostrarPasoAccion() {
    const paso = pantallaSecuencia.pasos[pantallaSecuencia.pasoActual];
    const modoData = MODOS[configuracion.modoActual];
    const esEmergencia = pantallaSecuencia.esModoEmergencia;
    
    // Obtener texto de la acción (personalizado o base)
    let textoAccion = "";
    let categoria = "";
    let duracion = modoData.duracionMaximaSegundos;
    
    if (esEmergencia) {
        textoAccion = configuracion.accionesPersonalizadas.emergencia || modoData.accionesBase.emergencia;
        categoria = "⚡ MODO EMERGENCIA (5 segundos)";
        duracion = 5;
    } else {
        switch(paso) {
            case 'fisica':
                textoAccion = configuracion.accionesPersonalizadas.fisica || modoData.accionesBase.fisica;
                categoria = "🔹 ACCIÓN FÍSICA";
                break;
            case 'cognitiva':
                textoAccion = configuracion.accionesPersonalizadas.cognitiva || modoData.accionesBase.cognitiva;
                categoria = "🧠 ACCIÓN COGNITIVA";
                break;
            case 'simbolica':
                textoAccion = configuracion.accionesPersonalizadas.simbolica || modoData.accionesBase.simbolica;
                categoria = "✨ ACCIÓN SIMBÓLICA";
                break;
            case 'financiera':
                textoAccion = "💰 ACCIÓN FINANCIERA: Escribe la cantidad que has perdido hoy (o 0 si no has apostado). Reflexiona: ¿Vale la pena seguir perdiendo?";
                categoria = "💸 REFLEXIÓN FINANCIERA";
                break;
        }
    }
    
    document.getElementById('actionCategory').innerText = categoria;
    document.getElementById('actionText').innerText = textoAccion;
    document.getElementById('progressIndicator').innerHTML = `Paso ${pantallaSecuencia.pasoActual + 1} de ${pantallaSecuencia.pasos.length}`;
    
    // Timer
    let tiempoRestante = duracion;
    const timerEl = document.getElementById('timer');
    timerEl.innerText = `${tiempoRestante}s`;
    
    if (window.timerInterval) clearInterval(window.timerInterval);
    window.timerInterval = setInterval(() => {
        tiempoRestante--;
        timerEl.innerText = `${tiempoRestante}s`;
        if (tiempoRestante <= 0) {
            clearInterval(window.timerInterval);
            timerEl.innerText = "✓ Listo";
        }
    }, 1000);
}

function completarPaso() {
    if (window.timerInterval) clearInterval(window.timerInterval);
    
    pantallaSecuencia.pasoActual++;
    if (pantallaSecuencia.pasoActual >= pantallaSecuencia.pasos.length) {
        // Secuencia completada
        finalizarSecuenciaExitosa();
    } else {
        mostrarPasoAccion();
    }
}

function finalizarSecuenciaExitosa() {
    // Registrar en diario
    const registro = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        modo: configuracion.modoActual,
        completado: true,
        esEmergencia: pantallaSecuencia.esModoEmergencia,
        desencadenante: null
    };
    diario.unshift(registro);
    guardarDiario();
    
    // Aumentar streak (solo si fue completado hoy)
    const hoy = new Date().toDateString();
    const yaCompletoHoy = diario.some(entry => 
        new Date(entry.fecha).toDateString() === hoy && entry.completado === true && entry.id !== registro.id
    );
    if (!yaCompletoHoy) {
        streak++;
        guardarStreak();
    }
    
    actualizarStatsUI();
    
    // Mostrar pantalla de éxito
    const msg = pantallaSecuencia.esModoEmergencia 
        ? "Has detenido un impulso en modo emergencia."
        : "Has interrumpido un ciclo de impulso completo.";
    document.getElementById('successMessage').innerText = msg;
    mostrarPantalla('success');
}

// ==================== DIARIO ====================
function cargarDiarioUI() {
    const container = document.getElementById('diaryEntries');
    if (!container) return;
    
    if (diario.length === 0) {
        container.innerHTML = '<p class="config-note">No hay registros aún. Completa una secuencia para empezar.</p>';
        return;
    }
    
    container.innerHTML = diario.map(entry => `
        <div class="diary-entry">
            <div class="date">📅 ${new Date(entry.fecha).toLocaleString()}</div>
            <div class="detail">Modo: ${entry.modo === 'ludopatia' ? 'Ludopatía' : 'General'}</div>
            <div class="detail">✅ Completado: ${entry.completado ? 'Sí' : 'No'}</div>
            ${entry.esEmergencia ? '<div class="detail">⚡ Modo emergencia usado</div>' : ''}
            ${entry.desencadenante ? `<div class="detail">📌 Desencadenante: ${entry.desencadenante}</div>` : ''}
        </div>
    `).join('');
}

function exportarDiario() {
    const dataStr = JSON.stringify(diario, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakloop_diario_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function agregarRegistroManual() {
    const desencadenante = prompt("¿Qué desencadenó el impulso? (ej. estrés, aburrimiento, soledad)");
    const registro = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        modo: configuracion.modoActual,
        completado: false,
        esEmergencia: false,
        desencadenante: desencadenante || "no especificado"
    };
    diario.unshift(registro);
    guardarDiario();
    cargarDiarioUI();
    actualizarStatsUI();
    alert("Registro manual agregado al diario.");
}

// ==================== PIN (para ludopatía) ====================
function verificarPin() {
    return new Promise((resolve) => {
        if (!configuracion.pinActivo || !configuracion.pinHash) {
            resolve(true);
            return;
        }
        
        pinModal.style.display = 'flex';
        const pinInput = document.getElementById('pinInput');
        const pinError = document.getElementById('pinError');
        pinInput.value = '';
        pinError.innerText = '';
        
        const submitHandler = () => {
            const ingresado = pinInput.value;
            // Hash simple (en producción usar bcrypt, pero para demo es suficiente)
            const hashIngresado = btoa(ingresado);
            if (hashIngresado === configuracion.pinHash) {
                pinModal.style.display = 'none';
                document.getElementById('btnSubmitPin').removeEventListener('click', submitHandler);
                resolve(true);
            } else {
                pinError.innerText = 'PIN incorrecto';
                pinInput.value = '';
            }
        };
        
        document.getElementById('btnSubmitPin').onclick = submitHandler;
        pinInput.onkeypress = (e) => { if(e.key === 'Enter') submitHandler(); };
    });
}

function guardarPin(nuevoPin) {
    if (nuevoPin.length === 4 && /^\d+$/.test(nuevoPin)) {
        configuracion.pinHash = btoa(nuevoPin);
        configuracion.pinActivo = true;
        guardarConfiguracion();
        alert("PIN guardado. Reinicia la app para que surta efecto completo.");
    } else {
        alert("El PIN debe ser exactamente 4 dígitos numéricos.");
    }
}

// ==================== CONFIGURACIÓN Y EVENTOS ====================
function cambiarModo(nuevoModo, conservarDiario = true) {
    if (nuevoModo === configuracion.modoActual) return;
    
    if (!conservarDiario) {
        if (confirm("¿Borrar todos los registros del diario?")) {
            diario = [];
            guardarDiario();
            streak = 0;
            guardarStreak();
        }
    }
    
    configuracion.modoActual = nuevoModo;
    configuracion.ultimoModoRecordado = nuevoModo;
    
    // Resetear acciones personalizadas al cambiar de modo (opcional)
    configuracion.accionesPersonalizadas = {};
    
    guardarConfiguracion();
    actualizarUIporModo();
    actualizarStatsUI();
    cargarDiarioUI();
    
    alert(`Modo cambiado a ${MODOS[nuevoModo].nombre}`);
}

function guardarAccionesPersonalizadas() {
    const modoData = MODOS[configuracion.modoActual];
    configuracion.accionesPersonalizadas = {
        fisica: document.getElementById('customFisica').value || modoData.accionesBase.fisica,
        cognitiva: document.getElementById('customCognitiva').value || modoData.accionesBase.cognitiva,
        simbolica: document.getElementById('customSimbolica').value || modoData.accionesBase.simbolica,
        emergencia: document.getElementById('customEmergencia').value || modoData.accionesBase.emergencia
    };
    guardarConfiguracion();
    alert("Acciones personalizadas guardadas");
}

function resetearAcciones() {
    const modoData = MODOS[configuracion.modoActual];
    configuracion.accionesPersonalizadas = {};
    guardarConfiguracion();
    actualizarUIporModo();
    alert("Acciones restablecidas a valores clásicos");
}

function configurarEventListeners() {
    // Botones principales
    document.getElementById('btnNormal').onclick = () => iniciarSecuencia(false);
    document.getElementById('btnEmergency').onclick = () => iniciarSecuencia(true);
    document.getElementById('btnComplete').onclick = () => completarPaso();
    document.getElementById('btnBackToMain').onclick = () => mostrarPantalla('main');
    document.getElementById('btnRegisterOption').onclick = () => {
        mostrarPantalla('diary');
        cargarDiarioUI();
    };
    document.getElementById('btnDiary').onclick = () => {
        if (configuracion.modoActual === 'ludopatia' && configuracion.pinActivo) {
            verificarPin().then(() => {
                mostrarPantalla('diary');
                cargarDiarioUI();
            });
        } else {
            mostrarPantalla('diary');
            cargarDiarioUI();
        }
    };
    document.getElementById('btnConfig').onclick = () => mostrarPantalla('config');
    document.getElementById('btnExport').onclick = () => exportarDiario();
    document.getElementById('btnCloseDiary').onclick = () => mostrarPantalla('main');
    document.getElementById('btnCloseConfig').onclick = () => mostrarPantalla('main');
    document.getElementById('btnExportDiary').onclick = () => exportarDiario();
    document.getElementById('btnAddManualEntry').onclick = () => agregarRegistroManual();
    
    // Configuración modo
    document.getElementById('btnApplyModo').onclick = () => {
        const nuevoModo = document.querySelector('input[name="modo"]:checked').value;
        const conservar = confirm("¿Conservar el diario actual? (Cancelar = borrar)");
        cambiarModo(nuevoModo, conservar);
    };
    
    // Opciones ludopatía
    document.getElementById('cuartaAccionFinanciera').onchange = (e) => {
        configuracion.cuartaAccionActiva = e.target.checked;
        guardarConfiguracion();
    };
    document.getElementById('bloqueoPin').onchange = (e) => {
        if (e.target.checked) {
            document.getElementById('pinConfigArea').style.display = 'block';
        } else {
            configuracion.pinActivo = false;
            configuracion.pinHash = null;
            guardarConfiguracion();
            document.getElementById('pinConfigArea').style.display = 'none';
        }
    };
    document.getElementById('btnGuardarPin').onclick = () => {
        const nuevoPin = document.getElementById('nuevoPin').value;
        guardarPin(nuevoPin);
    };
    
    // Acciones personalizadas
    document.getElementById('btnSaveActions').onclick = () => guardarAccionesPersonalizadas();
    document.getElementById('btnResetActions').onclick = () => resetearAcciones();
}
