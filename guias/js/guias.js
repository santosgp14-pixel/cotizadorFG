(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const contLista = $('#listaGuias');
  const infoTitulo = $('#infoTitulo');
  const infoDesc = $('#infoDesc');
  const btnDescargar = $('#btnDescargarPdf');
  const btnRapido = $('#btnImprimirRapido');

  let guiaSeleccionada = CATALOGO_GUIAS[0];

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

  renderMenu();
})();

