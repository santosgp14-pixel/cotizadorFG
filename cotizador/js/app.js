(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const fmt = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 });
  const money = (n) => '$' + fmt.format(n);
  const money0 = (n) => '$' + fmt0.format(n);

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /** Devuelve la prima según edad, o null si está fuera de rango. */
  function primaPorEdad(tabla, edad) {
    const r = tabla.primas.find((p) => edad >= p.min && edad <= p.max);
    return r ? r.prima : null;
  }

  function parseEdad(v) {
    if (v === '' || v === null) return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : NaN;
  }

  // ---------- Familiares ----------
  const contFam = $('#familiares');
  const tpl = $('#tplFamiliar');

  function agregarFamiliar() {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const sel = $('.f-parentesco', node);
    TARIFAS.parentescos.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `${p.nombre} (hasta ${p.edadMax})`;
      sel.appendChild(o);
    });
    $('.btn-del', node).addEventListener('click', () => { node.remove(); render(); });
    contFam.appendChild(node);
    $('.f-nombre', node).focus();
    render();
  }

  // ---------- Estado del Titular ----------
  function actualizarEstadoTitular() {
    const incluir = $('#cotizarTitular').checked;
    const inputEdad = $('#titularEdad');
    const lblEdad = $('#lblTitularEdad');
    const ayuda = $('#ayudaModo');

    if (incluir) {
      inputEdad.disabled = false;
      inputEdad.placeholder = '';
      lblEdad.classList.remove('deshabilitado');
      ayuda.hidden = true;
    } else {
      inputEdad.disabled = true;
      inputEdad.value = '';
      inputEdad.placeholder = '—';
      lblEdad.classList.add('deshabilitado');
      ayuda.hidden = false;
    }
    render();
  }

  // ---------- Cálculo + render ----------
  function calcular() {
    const filas = [];
    let subTitular = 0;
    let subFamiliares = 0;
    let errores = 0;
    let familiaresValidos = 0;

    const incluirTitular = $('#cotizarTitular').checked;
    const tNombre = $('#titularNombre').value.trim();
    const tEdad = incluirTitular ? parseEdad($('#titularEdad').value) : null;
    let tPrima = null;

    if (incluirTitular) {
      if (tEdad !== null && !Number.isNaN(tEdad)) {
        tPrima = primaPorEdad(TARIFAS.titular, tEdad);
      }
      if (tEdad !== null && tPrima === null) errores++;
      if (tPrima !== null) subTitular = tPrima;

      filas.push({
        nombre: tNombre || '—',
        parentesco: 'Titular',
        edad: tEdad,
        sa: TARIFAS.titular.sumaAsegurada,
        prima: tPrima,
      });
    }

    // Familiares
    $$('.familiar', contFam).forEach((el) => {
      const nombre = $('.f-nombre', el).value.trim();
      const parId = $('.f-parentesco', el).value;
      const par = TARIFAS.parentescos.find((p) => p.id === parId);
      const edad = parseEdad($('.f-edad', el).value);
      const err = $('.f-error', el);
      let prima = null;
      let msg = '';

      if (edad !== null) {
        if (Number.isNaN(edad)) msg = 'Edad inválida';
        else if (edad > par.edadMax) msg = `No elegible: ${par.nombre} hasta ${par.edadMax} años`;
        else {
          prima = primaPorEdad(TARIFAS.familiar, edad);
          if (prima === null) msg = 'Edad fuera de rango';
        }
      }

      err.textContent = msg;
      el.classList.toggle('invalido', !!msg);
      if (msg) errores++;
      if (prima !== null) {
        subFamiliares += prima;
        familiaresValidos++;
      }

      // Solo se muestran en la cotización los familiares elegibles
      if (!msg && (nombre || edad !== null)) {
        filas.push({
          nombre: nombre || '—',
          parentesco: par.nombre,
          edad,
          sa: TARIFAS.familiar.sumaAsegurada,
          prima,
        });
      }
    });

    return {
      incluirTitular,
      tNombre,
      tEdad,
      tPrima,
      filas,
      subTitular,
      subFamiliares,
      total: subTitular + subFamiliares,
      errores,
      familiaresValidos,
      titularFueraRango: incluirTitular && tEdad !== null && tPrima === null,
    };
  }

  function render() {
    const c = calcular();

    $('#cotTitular').textContent = c.tNombre || '—';
    if (!c.incluirTitular) {
      $('#cotEdad').textContent = 'No cotizado';
    } else {
      $('#cotEdad').textContent = c.tEdad !== null && !Number.isNaN(c.tEdad) ? `${c.tEdad} años` : '—';
    }

    if (c.filas.length === 0) {
      $('#cotFilas').innerHTML = `
        <tr>
          <td colspan="6" class="fila-vacia">Agregue familiares para cotizar</td>
        </tr>`;
    } else {
      $('#cotFilas').innerHTML = c.filas.map((f, i) => `
        <tr class="${f.parentesco === 'Titular' ? 'fila-titular' : ''}">
          <td>${i + 1}</td>
          <td class="left">${escapeHtml(f.nombre)}</td>
          <td class="left">${f.parentesco}</td>
          <td>${f.edad !== null && !Number.isNaN(f.edad) ? f.edad : '—'}</td>
          <td class="right">${money0(f.sa)}</td>
          <td class="right">${f.prima !== null ? money(f.prima) : '—'}</td>
        </tr>`).join('');
    }

    $('#cotSubTitular').textContent = money(c.subTitular);
    $('#cotSubFamiliares').textContent = money(c.subFamiliares);
    $('#cotTotal').textContent = money(c.total);
    $('#totalMovil').textContent = money(c.total);

    const msg = $('#mensaje');
    msg.textContent = c.titularFueraRango ? 'La edad del titular debe estar entre 0 y 99 años.' : '';
    ajustarVista();
    return c;
  }

  /** Escala la hoja (8.5in) para que quepa en pantallas pequeñas. */
  function ajustarVista() {
    const wrap = $('#previewWrap');
    const hoja = $('#cotizacion');
    const titulo = $('.preview-titulo', wrap);
    hoja.style.transform = '';
    wrap.style.height = '';
    const escala = Math.min(1, wrap.clientWidth / hoja.offsetWidth);
    if (escala < 1) {
      hoja.style.transform = `scale(${escala})`;
      const extra = titulo && titulo.offsetParent ? titulo.offsetHeight : 0;
      wrap.style.height = Math.ceil(hoja.offsetHeight * escala + extra) + 'px';
    }
  }

  function imprimir() {
    const c = render();
    const msg = $('#mensaje');

      if (!c.tNombre) {
        msg.textContent = 'Complete el nombre del titular.';
        return;
      }

      if (c.incluirTitular) {
        if (c.tEdad === null || Number.isNaN(c.tEdad)) {
          msg.textContent = 'Complete la edad del titular.';
          return;
        }
        if (c.titularFueraRango) {
          msg.textContent = 'La edad del titular debe estar entre 0 y 99 años.';
          return;
        }
      } else {
        if (c.familiaresValidos === 0) {
          msg.textContent = 'Agregue al menos un familiar con datos válidos para cotizar.';
          return;
        }
      }

      if (c.errores) {
        msg.textContent = 'Corrija los datos marcados en rojo antes de imprimir.';
        return;
      }

      window.print();
    }

    function limpiar() {
      $('#cotizarTitular').checked = true;
      actualizarEstadoTitular();
      $('#titularNombre').value = '';
      $('#titularEdad').value = '';
      contFam.innerHTML = '';
      $('#mensaje').textContent = '';
      render();
      $('#titularNombre').focus();
    }

    // ---------- Init ----------
    function init() {
      $('#cotEmpresa').textContent = `${TARIFAS.empresa} · ${TARIFAS.aseguradora}`;
      $('#cotFecha').textContent = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      $('#cotCoberturas').textContent = TARIFAS.coberturas.join(' · ');
      $('#cotValidez').textContent = TARIFAS.validezDias;

      $('#cotizarTitular').addEventListener('change', actualizarEstadoTitular);
      $('#formulario').addEventListener('input', render);
      $('#formulario').addEventListener('change', render);
      $('#btnAgregar').addEventListener('click', agregarFamiliar);
      $('#btnImprimir').addEventListener('click', imprimir);
      $('#btnLimpiar').addEventListener('click', limpiar);
      window.addEventListener('resize', ajustarVista);
      window.addEventListener('load', ajustarVista); // logo cargado → altura real
      window.addEventListener('beforeprint', () => {
        $('#cotizacion').style.transform = '';
        $('#previewWrap').style.height = '';
      });
      window.addEventListener('afterprint', ajustarVista);

      actualizarEstadoTitular();
    }

    init();
  }) ();

