import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// ---------- Catálogos ----------
const PARENTESCOS = ['Titular', 'Cónyuge', 'Hijo(a)', 'Padre', 'Madre', 'Otro'];
const TIPOS_SERVICIO = ['Consulta', 'Reembolso', 'Emergencia', 'Hospitalización', 'Farmacia', 'Odontología', 'Otro'];
const ESTATUS = ['Pendiente', 'En revisión', 'Pagado', 'Pagado parcial', 'Rechazado'];
const EST_PAGADOS = ['Pagado', 'Pagado parcial'];
const EST_PENDIENTES = ['Pendiente', 'En revisión'];

const LISTADOS = {
  todos:      { titulo: 'Todos los siniestros',     filtro: () => true },
  titulares:  { titulo: 'Siniestros de titulares',  filtro: (s) => s.parentesco === 'Titular' },
  familiares: { titulo: 'Siniestros de familiares', filtro: (s) => s.parentesco !== 'Titular' },
  causa:      { titulo: 'Siniestros por causa',     filtro: () => true, resumen: true },
  pagados:    { titulo: 'Siniestros pagados',       filtro: (s) => EST_PAGADOS.includes(s.estatus) },
  pendientes: { titulo: 'Siniestros pendientes',    filtro: (s) => EST_PENDIENTES.includes(s.estatus) },
};

const COLUMNAS = [
  { key: 'cedula', titulo: 'Cédula' },
  { key: 'nombre', titulo: 'Nombre' },
  { key: 'parentesco', titulo: 'Parentesco' },
  { key: 'tipoServicio', titulo: 'Servicio' },
  { key: 'fechaNacimiento', titulo: 'F. nacimiento' },
  { key: 'causa', titulo: 'Causa' },
  { key: 'fechaOcurrencia', titulo: 'F. ocurrencia' },
  { key: 'estatus', titulo: 'Estatus' },
  { key: 'montoPagado', titulo: 'Pagado', num: true },
  { key: 'montoRechazado', titulo: 'Rechazado', num: true },
];

// ---------- Utilidades ----------
const $ = (sel) => document.querySelector(sel);
const fmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n) => '$' + fmt.format(n || 0);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
const fecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const hoyISO = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
const normCedula = (v) => v.trim().toUpperCase().replace(/\s+/g, '');
const normTexto = (v) => v.trim().replace(/\s+/g, ' ');
const claveCausa = (v) => normTexto(v).toLowerCase();

function edadEn(nac, ref) {
  if (!nac || !ref) return null;
  const [a1, m1, d1] = nac.split('-').map(Number);
  const [a2, m2, d2] = ref.split('-').map(Number);
  let e = a2 - a1;
  if (m2 < m1 || (m2 === m1 && d2 < d1)) e--;
  return e;
}

function llenarSelect(sel, opciones) {
  opciones.forEach((o) => sel.add(new Option(o, o)));
}

// ---------- Estado ----------
let siniestros = [];
let vista = 'todos';
let orden = { key: 'fechaOcurrencia', dir: -1 };
let editandoId = null;
let desuscribir = null;

// ---------- Inicio ----------
const configurado = !String(firebaseConfig.apiKey).startsWith('TU_');
if (!configurado) {
  $('#vistaConfig').hidden = false;
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const col = collection(db, 'siniestros');
  iniciar(auth, db, col);
}

function iniciar(auth, db, col) {
  llenarSelect($('#sParentesco'), PARENTESCOS);
  llenarSelect($('#sTipoServicio'), TIPOS_SERVICIO);
  llenarSelect($('#sEstatus'), ESTATUS);
  llenarSelect($('#fEstatus'), ESTATUS);
  llenarSelect($('#fTipoServicio'), TIPOS_SERVICIO);

  // ----- Autenticación -----
  onAuthStateChanged(auth, (user) => {
    $('#vistaLogin').hidden = !!user;
    $('#vistaApp').hidden = !user;
    $('#btnSalir').hidden = !user;
    $('#usuario').textContent = user ? user.email : '';
    if (desuscribir) { desuscribir(); desuscribir = null; }
    if (user) {
      desuscribir = onSnapshot(query(col, orderBy('fechaOcurrencia', 'desc')), (snap) => {
        siniestros = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        actualizarCatalogos();
        render();
      }, (err) => {
        console.error(err);
        mostrarError(err.code === 'permission-denied'
          ? 'Sin permiso para leer los datos. Revisa el UID en las reglas de Firestore.'
          : 'Error al cargar los datos: ' + err.message);
      });
    } else {
      siniestros = [];
    }
  });

  // Recordar la última elección de "Mantener la sesión iniciada"
  const recordar = $('#loginRecordar');
  recordar.checked = localStorage.getItem('siniestros.recordar') === '1';

  $('#formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#loginMsg');
    msg.textContent = 'Ingresando…';
    try {
      // Local: sobrevive al cierre del navegador. Sesión: se cierra al cerrar la pestaña/navegador.
      await setPersistence(auth, recordar.checked ? browserLocalPersistence : browserSessionPersistence);
      localStorage.setItem('siniestros.recordar', recordar.checked ? '1' : '0');
      await signInWithEmailAndPassword(auth, $('#loginEmail').value.trim(), $('#loginPass').value);
      msg.textContent = '';
      $('#loginPass').value = '';
    } catch (err) {
      msg.textContent = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email']
        .includes(err.code) ? 'Correo o contraseña incorrectos.'
        : err.code === 'auth/too-many-requests' ? 'Demasiados intentos. Espera unos minutos.'
        : 'No se pudo iniciar sesión: ' + err.message;
    }
  });
  $('#btnSalir').addEventListener('click', () => signOut(auth));

  // ----- Pestañas y filtros -----
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-vista]');
    if (b) cambiarVista(b.dataset.vista);
  });
  ['#fTexto', '#fEstatus', '#fTipoServicio', '#fCausa', '#fDesde', '#fHasta'].forEach((id) =>
    $(id)?.addEventListener('input', render));
  $('#btnLimpiarFiltros').addEventListener('click', () => {
    ['#fTexto', '#fEstatus', '#fTipoServicio', '#fCausa', '#fDesde', '#fHasta'].forEach((id) => { if ($(id)) $(id).value = ''; });
    render();
  });

  // Ordenar por columna / abrir registro / ir a causa
  $('#tablaWrap').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-key]');
    if (th) {
      const key = th.dataset.key;
      orden = { key, dir: orden.key === key ? -orden.dir : 1 };
      return render();
    }
    const trCausa = e.target.closest('tr[data-causa]');
    if (trCausa) {
      $('#fCausa').value = trCausa.dataset.causa;
      return cambiarVista('todos');
    }
    const tr = e.target.closest('tr[data-id]');
    if (tr) abrirDialogo(siniestros.find((s) => s.id === tr.dataset.id));
  });

  $('#btnCsv').addEventListener('click', exportarCsv);
  $('#btnImprimir').addEventListener('click', () => window.print());

  // ----- Formulario -----
  const dlg = $('#dlg');
  $('#btnNuevo').addEventListener('click', () => abrirDialogo(null));
  $('#btnCancelar').addEventListener('click', () => dlg.close());
  $('#sCedula').addEventListener('input', sugerirPorCedula);
  $('#sParentesco').addEventListener('change', sugerirPorCedula);

  $('#formSiniestro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = leerFormulario();
    if (!datos) return;
    const btn = $('#btnGuardar');
    btn.disabled = true;
    try {
      if (editandoId) {
        await updateDoc(doc(db, 'siniestros', editandoId), { ...datos, actualizado: serverTimestamp() });
      } else {
        await addDoc(col, { ...datos, creado: serverTimestamp(), actualizado: serverTimestamp() });
      }
      dlg.close();
    } catch (err) {
      console.error(err);
      $('#dlgMsg').textContent = err.code === 'permission-denied'
        ? 'Sin permiso para guardar (revisa las reglas de Firestore).'
        : 'No se pudo guardar: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('#btnEliminar').addEventListener('click', async () => {
    if (!editandoId) return;
    const s = siniestros.find((x) => x.id === editandoId);
    if (!confirm(`¿Eliminar el siniestro de ${s?.nombre ?? ''} (${fecha(s?.fechaOcurrencia)})? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'siniestros', editandoId));
      dlg.close();
    } catch (err) {
      $('#dlgMsg').textContent = 'No se pudo eliminar: ' + err.message;
    }
  });
}

// ---------- Formulario ----------
function abrirDialogo(s) {
  editandoId = s ? s.id : null;
  $('#dlgTitulo').textContent = s ? 'Editar siniestro' : 'Nuevo siniestro';
  $('#btnEliminar').hidden = !s;
  $('#dlgMsg').textContent = '';
  $('#sCedula').value = s?.cedula ?? '';
  $('#sNombre').value = s?.nombre ?? '';
  $('#sParentesco').value = s?.parentesco ?? 'Titular';
  $('#sNacimiento').value = s?.fechaNacimiento ?? '';
  $('#sCausa').value = s?.causa ?? '';
  $('#sTipoServicio').value = s?.tipoServicio ?? 'Consulta';
  $('#sOcurrencia').value = s?.fechaOcurrencia ?? '';
  $('#sEstatus').value = s?.estatus ?? 'Pendiente';
  $('#sPagado').value = s?.montoPagado ?? 0;
  $('#sRechazado').value = s?.montoRechazado ?? 0;
  $('#sOcurrencia').max = hoyISO();
  $('#sNacimiento').max = hoyISO();
  document.querySelectorAll('#formSiniestro .invalido').forEach((el) => el.classList.remove('invalido'));
  sugerirPorCedula();
  $('#dlg').showModal();
  $('#sCedula').focus();
}

/** Muestra el titular conocido de la cédula y sugiere nombres/fecha de esa familia. */
function sugerirPorCedula() {
  const ced = normCedula($('#sCedula').value);
  const familia = siniestros.filter((s) => s.cedula === ced);
  const titular = familia.find((s) => s.parentesco === 'Titular');
  $('#hintCedula').textContent = titular ? `Titular: ${titular.nombre}`
    : familia.length ? 'Cédula registrada (sin siniestros del titular)' : '';

  const nombres = [...new Set(familia.map((s) => s.nombre))];
  $('#dlNombres').innerHTML = nombres.map((n) => `<option value="${escapeHtml(n)}">`).join('');

  // Nuevo registro de titular conocido → autocompletar nombre y nacimiento
  if (!editandoId && titular && $('#sParentesco').value === 'Titular' && !$('#sNombre').value) {
    $('#sNombre').value = titular.nombre;
    if (!$('#sNacimiento').value) $('#sNacimiento').value = titular.fechaNacimiento || '';
  }
}

function leerFormulario() {
  const msg = $('#dlgMsg');
  const campos = ['#sCedula', '#sNombre', '#sParentesco', '#sNacimiento', '#sCausa', '#sTipoServicio', '#sOcurrencia', '#sEstatus'];
  let faltan = false;
  campos.forEach((id) => {
    const vacio = !$(id).value.trim();
    $(id).classList.toggle('invalido', vacio);
    if (vacio) faltan = true;
  });
  if (faltan) { msg.textContent = 'Completa los campos marcados.'; return null; }

  const d = {
    cedula: normCedula($('#sCedula').value),
    nombre: normTexto($('#sNombre').value),
    parentesco: $('#sParentesco').value,
    tipoServicio: $('#sTipoServicio').value,
    fechaNacimiento: $('#sNacimiento').value,
    causa: normTexto($('#sCausa').value),
    fechaOcurrencia: $('#sOcurrencia').value,
    estatus: $('#sEstatus').value,
    montoPagado: Math.round(Number($('#sPagado').value || 0) * 100) / 100,
    montoRechazado: Math.round(Number($('#sRechazado').value || 0) * 100) / 100,
  };

  // Usar la misma escritura de una causa ya existente (evita duplicados por mayúsculas)
  const existente = siniestros.find((s) => claveCausa(s.causa) === claveCausa(d.causa));
  if (existente) d.causa = existente.causa;

  if (!Number.isFinite(d.montoPagado) || d.montoPagado < 0 || !Number.isFinite(d.montoRechazado) || d.montoRechazado < 0) {
    msg.textContent = 'Los montos deben ser números positivos.'; return null;
  }
  if (d.fechaOcurrencia < d.fechaNacimiento) {
    msg.textContent = 'La fecha de ocurrencia no puede ser anterior al nacimiento.'; return null;
  }
  if (d.fechaOcurrencia > hoyISO()) {
    msg.textContent = 'La fecha de ocurrencia no puede ser futura.'; return null;
  }
  if (EST_PAGADOS.includes(d.estatus) && d.montoPagado <= 0) {
    msg.textContent = `Con estatus "${d.estatus}" indica el monto pagado.`; return null;
  }
  if (d.estatus === 'Rechazado' && d.montoPagado > 0) {
    msg.textContent = 'Un siniestro rechazado no debería tener monto pagado.'; return null;
  }
  return d;
}

// ---------- Listados ----------
function cambiarVista(v) {
  vista = v;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('activo', b.dataset.vista === v));
  render();
}

function actualizarCatalogos() {
  const causas = [...new Map(siniestros.map((s) => [claveCausa(s.causa), s.causa])).values()]
    .sort((a, b) => a.localeCompare(b, 'es'));
  $('#dlCausas').innerHTML = causas.map((c) => `<option value="${escapeHtml(c)}">`).join('');
  const sel = $('#fCausa');
  const actual = sel.value;
  sel.innerHTML = '<option value="">Todas</option>' +
    causas.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  sel.value = causas.includes(actual) ? actual : '';
}

function filtrados() {
  const txt = $('#fTexto').value.trim().toLowerCase();
  const est = $('#fEstatus').value;
  const serv = $('#fTipoServicio')?.value || '';
  const causa = $('#fCausa').value;
  const desde = $('#fDesde').value;
  const hasta = $('#fHasta').value;
  return siniestros.filter((s) =>
    LISTADOS[vista].filtro(s)
    && (!txt || s.cedula.toLowerCase().includes(txt) || s.nombre.toLowerCase().includes(txt))
    && (!est || s.estatus === est)
    && (!serv || (s.tipoServicio || 'Consulta') === serv)
    && (!causa || claveCausa(s.causa) === claveCausa(causa))
    && (!desde || s.fechaOcurrencia >= desde)
    && (!hasta || s.fechaOcurrencia <= hasta));
}

function ordenar(lista) {
  const { key, dir } = orden;
  return [...lista].sort((a, b) => {
    const va = a[key] ?? '', vb = b[key] ?? '';
    const r = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return r * dir;
  });
}

function totales(lista) {
  return lista.reduce((t, s) => {
    t.cantidad++;
    t.pagado += s.montoPagado || 0;
    t.rechazado += s.montoRechazado || 0;
    if (EST_PENDIENTES.includes(s.estatus)) t.pendientes++;
    return t;
  }, { cantidad: 0, pagado: 0, rechazado: 0, pendientes: 0 });
}

function porCausa(lista) {
  const m = new Map();
  lista.forEach((s) => {
    const k = claveCausa(s.causa);
    if (!m.has(k)) m.set(k, { causa: s.causa, items: [] });
    m.get(k).items.push(s);
  });
  return [...m.values()].map((g) => ({ causa: g.causa, ...totales(g.items) }))
    .sort((a, b) => b.cantidad - a.cantidad || a.causa.localeCompare(b.causa, 'es'));
}

function render() {
  const lista = ordenar(filtrados());
  const t = totales(lista);
  const conf = LISTADOS[vista];

  $('#tituloListado').textContent = conf.titulo;
  $('#filtrosPrint').textContent = descripcionFiltros();
  $('#resumen').innerHTML = `
    <div class="kpi"><span>Siniestros</span><strong>${t.cantidad}</strong></div>
    <div class="kpi"><span>Total pagado</span><strong>${money(t.pagado)}</strong></div>
    <div class="kpi"><span>Total rechazado</span><strong>${money(t.rechazado)}</strong></div>
    <div class="kpi kpi-alerta"><span>Pendientes</span><strong>${t.pendientes}</strong></div>`;

  $('#vacio').hidden = lista.length > 0;
  if (!lista.length) { $('#tablaWrap').innerHTML = ''; return; }

  if (conf.resumen) {
    const grupos = porCausa(lista);
    $('#tablaWrap').innerHTML = `
      <table class="tabla">
        <thead><tr>
          <th class="left">Causa</th><th>Cantidad</th><th>Pendientes</th>
          <th class="right">Pagado</th><th class="right">Rechazado</th>
        </tr></thead>
        <tbody>${grupos.map((g) => `
          <tr data-causa="${escapeHtml(g.causa)}" title="Ver siniestros de esta causa">
            <td class="left">${escapeHtml(g.causa)}</td><td>${g.cantidad}</td><td>${g.pendientes}</td>
            <td class="right">${money(g.pagado)}</td><td class="right">${money(g.rechazado)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td class="left">TOTAL</td><td>${t.cantidad}</td><td>${t.pendientes}</td>
          <td class="right">${money(t.pagado)}</td><td class="right">${money(t.rechazado)}</td>
        </tr></tfoot>
      </table>`;
    return;
  }

  const flecha = (k) => (orden.key === k ? (orden.dir > 0 ? ' ▲' : ' ▼') : '');
  $('#tablaWrap').innerHTML = `
    <table class="tabla">
      <thead><tr>${COLUMNAS.map((c) =>
        `<th data-key="${c.key}" class="${c.num ? 'right' : 'left'}">${c.titulo}${flecha(c.key)}</th>`).join('')}
      </tr></thead>
      <tbody>${lista.map((s) => {
        const edad = edadEn(s.fechaNacimiento, s.fechaOcurrencia);
        return `
        <tr data-id="${s.id}" title="Editar">
          <td class="left nowrap">${escapeHtml(s.cedula)}</td>
          <td class="left">${escapeHtml(s.nombre)}</td>
          <td class="left">${escapeHtml(s.parentesco)}</td>
          <td class="left nowrap"><span class="badge-serv">${escapeHtml(s.tipoServicio || 'Consulta')}</span></td>
          <td class="left nowrap">${fecha(s.fechaNacimiento)}${edad !== null ? ` <small>(${edad})</small>` : ''}</td>
          <td class="left">${escapeHtml(s.causa)}</td>
          <td class="left nowrap">${fecha(s.fechaOcurrencia)}</td>
          <td class="left"><span class="estatus est-${claveEstatus(s.estatus)}">${escapeHtml(s.estatus)}</span></td>
          <td class="right nowrap">${money(s.montoPagado)}</td>
          <td class="right nowrap">${money(s.montoRechazado)}</td>
        </tr>`;
      }).join('')}
      </tbody>
      <tfoot><tr>
        <td colspan="8" class="right">TOTAL (${t.cantidad})</td>
        <td class="right nowrap">${money(t.pagado)}</td>
        <td class="right nowrap">${money(t.rechazado)}</td>
      </tr></tfoot>
    </table>`;
}

const claveEstatus = (e) => String(e).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');

function descripcionFiltros() {
  const p = [];
  if ($('#fTexto').value.trim()) p.push(`Búsqueda: "${$('#fTexto').value.trim()}"`);
  if ($('#fEstatus').value) p.push(`Estatus: ${$('#fEstatus').value}`);
  if ($('#fCausa').value) p.push(`Causa: ${$('#fCausa').value}`);
  if ($('#fDesde').value) p.push(`Desde: ${fecha($('#fDesde').value)}`);
  if ($('#fHasta').value) p.push(`Hasta: ${fecha($('#fHasta').value)}`);
  p.push(`Emitido: ${fecha(hoyISO())}`);
  return p.join(' · ');
}

function mostrarError(texto) {
  $('#tablaWrap').innerHTML = '';
  $('#vacio').hidden = false;
  $('#vacio').textContent = texto;
}

// ---------- Exportar CSV (separador ";" para Excel en español) ----------
function exportarCsv() {
  const lista = ordenar(filtrados());
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const num = (n) => (n || 0).toFixed(2).replace('.', ',');
  let filas;
  if (LISTADOS[vista].resumen) {
    filas = [['Causa', 'Cantidad', 'Pendientes', 'Pagado', 'Rechazado'],
      ...porCausa(lista).map((g) => [g.causa, g.cantidad, g.pendientes, num(g.pagado), num(g.rechazado)])];
  } else {
    filas = [['Cédula', 'Nombre', 'Parentesco', 'Servicio', 'Fecha nacimiento', 'Causa', 'Fecha ocurrencia', 'Estatus', 'Monto pagado', 'Monto rechazado'],
      ...lista.map((s) => [s.cedula, s.nombre, s.parentesco, s.tipoServicio || 'Consulta', fecha(s.fechaNacimiento), s.causa,
        fecha(s.fechaOcurrencia), s.estatus, num(s.montoPagado), num(s.montoRechazado)])];
  }
  const csv = '\uFEFF' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `siniestros-${vista}-${hoyISO()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

