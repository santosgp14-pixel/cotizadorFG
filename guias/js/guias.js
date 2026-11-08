(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const contLista = $('#listaGuias');
  const infoTitulo = $('#infoTitulo');
  const infoDesc = $('#infoDesc');
  const btnDescargar = $('#btnDescargarPdf');
  const btnRapido = $('#btnImprimirRapido');
  const btnVerQr = $('#btnVerQr');
  const btnDescargarSoloQr = $('#btnDescargarSoloQr');
  const imgQrDoc = $('#imgQrDoc');
  const qrLateralImg = $('#qrLateralImg');

  let guiaSeleccionada = CATALOGO_GUIAS[0];

  // URL final de producción en GitHub Pages: Enlace directo al archivo PDF de la guía
  // https://santosgp14-pixel.github.io/cotizadorFG/guias/pdf/Guia-Rapida-Hispana-FelixGarcia.pdf
  const urlProduccion = 'https://santosgp14-pixel.github.io/cotizadorFG/guias/pdf/Guia-Rapida-Hispana-FelixGarcia.pdf';

  // Generador de código QR de alta resolución (API estándar qrserver sin dependencias)
  const qrUrlApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=4&color=1f3f8a&data=${encodeURIComponent(urlProduccion)}`;

  // Asignar el QR tanto a la hoja de impresión como a la barra lateral
  if (imgQrDoc) imgQrDoc.src = qrUrlApi;
  if (qrLateralImg) {
    qrLateralImg.innerHTML = `<img src="${qrUrlApi}" alt="Código QR Guía Médica PDF">`;
  }

  function renderMenu() {
    contLista.innerHTML = CATALOGO_GUIAS.map((g, idx) => `
      <div class="item-guia-nav ${g.id === guiaSeleccionada.id ? 'activa' : ''}" data-id="${g.id}">
        <span class="item-icono">${g.icono || '📄'}</span>
        <div class="item-textos">
          <span class="item-tit">${g.titulo}</span>
          <span class="item-sub">${g.categoria} · ${g.paginas}</span>
        </div>
      </div>
    `).join('');

    infoTitulo.textContent = guiaSeleccionada.titulo;
    infoDesc.textContent = guiaSeleccionada.descripcion;
  }

  contLista.addEventListener('click', (e) => {
    const item = e.target.closest('.item-guia-nav');
    if (!item) return;
    const id = item.dataset.id;
    guiaSeleccionada = CATALOGO_GUIAS.find((g) => g.id === id) || CATALOGO_GUIAS[0];
    renderMenu();
  });

  function descargarPDF() {
    window.print();
  }

  btnDescargar.addEventListener('click', descargarPDF);
  btnRapido.addEventListener('click', descargarPDF);

  if (btnVerQr) {
    btnVerQr.addEventListener('click', () => {
      window.open(urlProduccion, '_blank');
    });
  }

  if (btnDescargarSoloQr) {
    btnDescargarSoloQr.addEventListener('click', async () => {
      try {
        const res = await fetch(qrUrlApi);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'QR-Guia-Medica-FelixGarcia.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } catch (err) {
        window.open(qrUrlApi, '_blank');
      }
    });
  }

  renderMenu();
})();

