import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, query, orderBy, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// ---------- Catálogos y Colores ----------
const TIPOS_SERVICIO = ['Consulta', 'Reembolso', 'Emergencia', 'Hospitalización', 'Farmacia', 'Odontología', 'Otro'];
const ESTATUS = ['Pendiente', 'En revisión', 'Pagado', 'Pagado parcial', 'Rechazado'];

const COLORES_ESTATUS = {
  'Pagado': '#7a9a1e',
  'Pagado parcial': '#a4c639',
  'Pendiente': '#f59e0b',
  'En revisión': '#1f3f8a',
  'Rechazado': '#dc2626',
};

const PALETA = [
  '#1f3f8a', '#7a9a1e', '#0284c7', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#64748b', '#e11d48', '#84cc16'
];

// ---------- Utilidades ----------
const $ = (sel) => document.querySelector(sel);
const fmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n) => '$' + fmt.format(n || 0);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// ---------- Estado ----------
let siniestros = [];
let chartCausasInst = null;
let chartEstatusInst = null;
let chartEvolucionInst = null;
let chartServiciosInst = null;
let desuscribir = null;

// ---------- Inicio ----------
const configurado = !String(firebaseConfig.apiKey).startsWith('TU_');
if (configurado) {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  iniciar(db);
}

  function iniciar(db) {
    const selServ = $('#fServicio');
    TIPOS_SERVICIO.forEach((s) => selServ.add(new Option(s, s)));

      // Carga directa y en tiempo real sin requerir login
      const col = collection(db, 'siniestros');
      onSnapshot(query(col, orderBy('fechaOcurrencia', 'desc')), (snap) => {
        siniestros = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderDashboard();
      }, (err) => {
        console.error(err);
        alert('Error al sincronizar datos del Dashboard: ' + err.message);
      });

      // Eventos de Filtro
      $('#fPeriodo').addEventListener('change', () => {
        const p = $('#fPeriodo').value;
        const ahora = new Date();
        const yyyy = ahora.getFullYear();
        const mm = String(ahora.getMonth() + 1).padStart(2, '0');

        if (p === 'este-ano') {
          $('#dDesde').value = `${yyyy}-01-01`;
          $('#dHasta').value = `${yyyy}-12-31`;
        } else if (p === 'este-mes') {
          const ultimoDia = new Date(yyyy, ahora.getMonth() + 1, 0).getDate();
          $('#dDesde').value = `${yyyy}-${mm}-01`;
          $('#dHasta').value = `${yyyy}-${mm}-${ultimoDia}`;
        } else if (p === 'mes-ant') {
          const dAnt = new Date(yyyy, ahora.getMonth() - 1, 1);
          const mmAnt = String(dAnt.getMonth() + 1).padStart(2, '0');
          const ultAnt = new Date(dAnt.getFullYear(), dAnt.getMonth() + 1, 0).getDate();
          $('#dDesde').value = `${dAnt.getFullYear()}-${mmAnt}-01`;
          $('#dHasta').value = `${dAnt.getFullYear()}-${mmAnt}-${ultAnt}`;
        } else if (p === 'todo') {
          $('#dDesde').value = '';
          $('#dHasta').value = '';
        }
        renderDashboard();
      });

      // Inicializar en "Este año"
      const anioActual = new Date().getFullYear();
      $('#dDesde').value = `${anioActual}-01-01`;
      $('#dHasta').value = `${anioActual}-12-31`;

      ['#dDesde', '#dHasta', '#fParentesco', '#fServicio', '#selMetricaCausa'].forEach((id) =>
        $(id).addEventListener('change', renderDashboard));

      $('#btnReset').addEventListener('click', () => {
        $('#fPeriodo').value = 'este-ano';
        $('#dDesde').value = `${anioActual}-01-01`;
        $('#dHasta').value = `${anioActual}-12-31`;
        $('#fParentesco').value = '';
        $('#fServicio').value = '';
        $('#selMetricaCausa').value = 'casos';
        renderDashboard();
      });

      $('#btnImprimir').addEventListener('click', () => window.print());
    }

// ---------- Filtros ----------
function obtenerFiltrados() {
        const desde = $('#dDesde').value;
        const hasta = $('#dHasta').value;
        const par = $('#fParentesco').value;
        const serv = $('#fServicio').value;

        return siniestros.filter((s) => {
          if (desde && s.fechaOcurrencia < desde) return false;
          if (hasta && s.fechaOcurrencia > hasta) return false;
          if (par === 'Titular' && s.parentesco !== 'Titular') return false;
          if (par === 'Familiares' && s.parentesco === 'Titular') return false;
          if (serv && (s.tipoServicio || 'Consulta') !== serv) return false;
          return true;
        });
      }

// ---------- Render Principal ----------
function renderDashboard() {
        const datos = obtenerFiltrados();

        renderKPIs(datos);
        renderServiciosGrid(datos);
        renderGraficoCausas(datos);
        renderGraficoEstatus(datos);
        renderGraficoEvolucion(datos);
        renderGraficoServicios(datos);
        renderTablaDetalle(datos);
      }

// 1. KPIs
function renderKPIs(datos) {
        const total = datos.length;
        let pagado = 0;
        let rechazado = 0;
        let pendientes = 0;
        let titulares = 0;
        let familiares = 0;

        datos.forEach((s) => {
          pagado += s.montoPagado || 0;
          rechazado += s.montoRechazado || 0;
          if (s.estatus === 'Pendiente' || s.estatus === 'En revisión') pendientes++;
          if (s.parentesco === 'Titular') titulares++;
          else familiares++;
        });

        const totalReclamado = pagado + rechazado;
        const tasaPagado = totalReclamado > 0 ? ((pagado / totalReclamado) * 100).toFixed(1) : 0;
        const tasaRechazo = totalReclamado > 0 ? ((rechazado / totalReclamado) * 100).toFixed(1) : 0;

        $('#kpiTotal').textContent = total;
        $('#kpiTitVsFam').textContent = `${titulares} titulares (${total ? Math.round((titulares / total) * 100) : 0}%) · ${familiares} familiares`;
        $('#kpiPagado').textContent = money(pagado);
        $('#kpiTasaPagado').textContent = `${tasaPagado}% de efectividad de cobertura`;
        $('#kpiRechazado').textContent = money(rechazado);
        $('#kpiTasaRechazo').textContent = `${tasaRechazo}% del monto reclamado`;
        $('#kpiPendientes').textContent = pendientes;
        $('#kpiPendientesSub').textContent = `${total ? Math.round((pendientes / total) * 100) : 0}% de los casos en trámite`;
      }

// 2. Chips rápidos por servicio
function renderServiciosGrid(datos) {
        const cont = $('#gridServicios');
        const mapa = {};
        TIPOS_SERVICIO.forEach((t) => { mapa[t] = { count: 0, pagado: 0 }; });

        datos.forEach((s) => {
          const serv = s.tipoServicio || 'Consulta';
          if (!mapa[serv]) mapa[serv] = { count: 0, pagado: 0 };
          mapa[serv].count++;
          mapa[serv].pagado += s.montoPagado || 0;
        });

        cont.innerHTML = Object.entries(mapa)
          .filter(([_, d]) => d.count > 0 || _ === 'Consulta' || _ === 'Reembolso')
          .map(([nombre, d]) => `
      <div class="serv-chip">
        <span>${escapeHtml(nombre)}</span>
        <strong>${d.count} casos</strong>
        <small>${money(d.pagado)} pagado</small>
      </div>`).join('');
      }

// 3. Gráfico Top Causas
function renderGraficoCausas(datos) {
        const metrica = $('#selMetricaCausa').value;
        const mapa = {};

        datos.forEach((s) => {
          const causa = s.causa?.trim() || 'No especificada';
          if (!mapa[causa]) mapa[causa] = { casos: 0, monto: 0 };
          mapa[causa].casos++;
          mapa[causa].monto += s.montoPagado || 0;
        });

        const ordenadas = Object.entries(mapa)
          .sort((a, b) => (metrica === 'casos' ? b[1].casos - a[1].casos : b[1].monto - a[1].monto))
          .slice(0, 8); // Top 8 causas

        const labels = ordenadas.map((c) => c[0]);
        const valores = ordenadas.map((c) => (metrica === 'casos' ? c[1].casos : c[1].monto));

        if (chartCausasInst) chartCausasInst.destroy();
        const ctx = document.getElementById('chartCausas').getContext('2d');
        chartCausasInst = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: metrica === 'casos' ? 'Casos registrados' : 'Monto Pagado ($)',
              data: valores,
              backgroundColor: '#1f3f8a',
              borderRadius: 5,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => (metrica === 'casos' ? `${ctx.raw} casos` : money(ctx.raw)),
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (v) => (metrica === 'casos' ? v : '$' + v),
                },
              },
            },
          },
        });
      }

// 4. Gráfico Estatus / Cierre (Dona)
function renderGraficoEstatus(datos) {
        const conteo = {};
        ESTATUS.forEach((e) => { conteo[e] = 0; });
        datos.forEach((s) => {
          if (conteo[s.estatus] !== undefined) conteo[s.estatus]++;
          else conteo[s.estatus] = 1;
        });

        const labels = Object.keys(conteo).filter((k) => conteo[k] > 0);
        const data = labels.map((k) => conteo[k]);
        const bg = labels.map((k) => COLORES_ESTATUS[k] || '#94a3b8');

        if (chartEstatusInst) chartEstatusInst.destroy();
        const ctx = document.getElementById('chartEstatus').getContext('2d');
        chartEstatusInst = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data,
              backgroundColor: bg,
              borderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            },
            cutout: '65%',
          },
        });
      }

// 5. Gráfico Evolución Mensual
function renderGraficoEvolucion(datos) {
        const mesesMapa = {};
        datos.forEach((s) => {
          if (!s.fechaOcurrencia) return;
          const yyyymm = s.fechaOcurrencia.substring(0, 7);
          if (!mesesMapa[yyyymm]) mesesMapa[yyyymm] = { count: 0, pagado: 0 };
          mesesMapa[yyyymm].count++;
          mesesMapa[yyyymm].pagado += s.montoPagado || 0;
        });

        const ordenMeses = Object.keys(mesesMapa).sort();
        const labels = ordenMeses.map((m) => {
          const [y, mes] = m.split('-');
          const f = new Date(Number(y), Number(mes) - 1, 1);
          return f.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
        });

        const dataCasos = ordenMeses.map((m) => mesesMapa[m].count);
        const dataPagado = ordenMeses.map((m) => mesesMapa[m].pagado);

        if (chartEvolucionInst) chartEvolucionInst.destroy();
        const ctx = document.getElementById('chartEvolucion').getContext('2d');
        chartEvolucionInst = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Monto pagado ($)',
                data: dataPagado,
                borderColor: '#7a9a1e',
                backgroundColor: 'rgba(122, 154, 30, 0.1)',
                fill: true,
                yAxisID: 'yMonto',
                tension: 0.3,
              },
              {
                label: 'Casos',
                data: dataCasos,
                borderColor: '#1f3f8a',
                backgroundColor: '#1f3f8a',
                yAxisID: 'yCasos',
                tension: 0.3,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 14 } },
              tooltip: {
                callbacks: {
                  label: (ctx) => (ctx.datasetIndex === 0 ? `Pagado: ${money(ctx.raw)}` : `Casos: ${ctx.raw}`),
                },
              },
            },
            scales: {
              yMonto: {
                type: 'linear',
                position: 'left',
                beginAtZero: true,
                ticks: { callback: (v) => '$' + v },
              },
              yCasos: {
                type: 'linear',
                position: 'right',
                beginAtZero: true,
                grid: { drawOnChartArea: false },
              },
            },
          },
        });
      }

// 6. Gráfico Distribución por Servicio (Pie)
function renderGraficoServicios(datos) {
        const mapa = {};
        datos.forEach((s) => {
          const serv = s.tipoServicio || 'Consulta';
          mapa[serv] = (mapa[serv] || 0) + 1;
        });

        const labels = Object.keys(mapa);
        const data = labels.map((k) => mapa[k]);
        const bg = labels.map((_, i) => PALETA[i % PALETA.length]);

        if (chartServiciosInst) chartServiciosInst.destroy();
        const ctx = document.getElementById('chartServicios').getContext('2d');
        chartServiciosInst = new Chart(ctx, {
          type: 'pie',
          data: {
            labels,
            datasets: [{
              data,
              backgroundColor: bg,
              borderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            },
          },
        });
      }

// 7. Tabla Detallada por Causa
function renderTablaDetalle(datos) {
        const tb = $('#tbCausasDetalle');
        const mapa = {};
        let totalCasos = datos.length;

        datos.forEach((s) => {
          const c = s.causa?.trim() || 'Sin especificar';
          if (!mapa[c]) mapa[c] = { casos: 0, pagado: 0, rechazado: 0, pendientes: 0 };
          mapa[c].casos++;
          mapa[c].pagado += s.montoPagado || 0;
          mapa[c].rechazado += s.montoRechazado || 0;
          if (s.estatus === 'Pendiente' || s.estatus === 'En revisión') mapa[c].pendientes++;
        });

        const filas = Object.entries(mapa).sort((a, b) => b[1].casos - a[1].casos);
        $('#lblDetalleCount').textContent = `${filas.length} patologías/causas registradas en el período`;

        if (!filas.length) {
          tb.innerHTML = `<tr><td colspan="7" class="vacio">No hay datos en el rango seleccionado.</td></tr>`;
          return;
        }

        tb.innerHTML = filas.map(([causa, d]) => {
          const pct = totalCasos > 0 ? ((d.casos / totalCasos) * 100).toFixed(1) : 0;
          const promedio = d.casos > 0 ? d.pagado / d.casos : 0;
          return `
      <tr>
        <td class="left"><strong>${escapeHtml(causa)}</strong></td>
        <td>${d.casos}</td>
        <td>${pct}%</td>
        <td class="right">${money(d.pagado)}</td>
        <td class="right">${money(d.rechazado)}</td>
        <td class="right">${money(promedio)}</td>
        <td>${d.pendientes > 0 ? `<span class="estatus est-pendiente">${d.pendientes}</span>` : '0'}</td>
      </tr>`;
        }).join('');
      }

function destruirGraficos() {
        if (chartCausasInst) chartCausasInst.destroy();
        if (chartEstatusInst) chartEstatusInst.destroy();
        if (chartEvolucionInst) chartEvolucionInst.destroy();
        if (chartServiciosInst) chartServiciosInst.destroy();
      }

