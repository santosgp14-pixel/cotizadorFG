(function () {
  'use strict';

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const cont = document.getElementById('herramientas');
  const buscador = document.getElementById('buscar');
  const vacio = document.getElementById('vacio');

  function tarjeta(h) {
    const activo = h.estado !== 'proximamente';
    const attrs = activo
      ? `href="${escapeHtml(h.url)}"${h.externo ? ' target="_blank" rel="noopener"' : ''}`
      : 'aria-disabled="true" tabindex="-1"';
    return `
      <a class="card${activo ? '' : ' card-off'}" ${attrs}>
        <span class="card-icono" aria-hidden="true">${escapeHtml(h.icono || '🔧')}</span>
        <span class="card-cuerpo">
          <span class="card-titulo">${escapeHtml(h.titulo)}</span>
          <span class="card-desc">${escapeHtml(h.descripcion || '')}</span>
        </span>
        ${activo ? '<span class="card-ir" aria-hidden="true">→</span>' : '<span class="badge">Próximamente</span>'}
      </a>`;
  }

  function render(filtro = '') {
    const q = filtro.trim().toLowerCase();
    const lista = HERRAMIENTAS.filter((h) =>
      !q || `${h.titulo} ${h.descripcion} ${h.categoria}`.toLowerCase().includes(q));

    // Agrupar por categoría manteniendo el orden de aparición
    const grupos = new Map();
    lista.forEach((h) => {
      const cat = h.categoria || 'General';
      if (!grupos.has(cat)) grupos.set(cat, []);
      grupos.get(cat).push(h);
    });

    cont.innerHTML = Array.from(grupos, ([cat, items]) => `
      <section class="grupo">
        <h2>${escapeHtml(cat)}</h2>
        <div class="grid">${items.map(tarjeta).join('')}</div>
      </section>`).join('');

    vacio.hidden = lista.length > 0;
  }

  buscador.addEventListener('input', () => render(buscador.value));
  document.getElementById('anio').textContent = new Date().getFullYear();
  render();
})();

