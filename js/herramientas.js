/**
 * Registro de herramientas del portal.
 * Para agregar una nueva: crear su carpeta (ej. /mi-herramienta/index.html)
 * y añadir un objeto a esta lista.
 *
 *  id          identificador único
 *  titulo      nombre visible
 *  descripcion texto corto de la tarjeta
 *  url         ruta relativa (carpeta de la herramienta) o URL externa
 *  icono       emoji o carácter
 *  categoria   agrupa las tarjetas en secciones
 *  estado      'activo' | 'proximamente'
 *  externo     true para abrir en otra pestaña (opcional)
 */
const HERRAMIENTAS = [
  {
    id: 'cotizador-ajeven',
    titulo: 'Cotizador AJEVEN',
    descripcion: 'Seguro Colectivo de Salud · Hispana de Seguros. Cotiza titular y familiares e imprime en media hoja carta.',
    url: 'cotizador/',
    icono: '🩺',
    categoria: 'Cotizadores',
    estado: 'activo',
  },
  {
    id: 'siniestros',
    titulo: 'Control de Siniestros',
    descripcion: 'Registro de siniestros y listados por titular, familiar, causa, pagados y pendientes.',
    url: 'siniestros/',
    icono: '📋',
    categoria: 'Gestión',
    estado: 'activo',
  },
  {
    id: 'dashboard-siniestros',
    titulo: 'Dashboard de Siniestros',
    descripcion: 'Análisis de siniestralidad, causas principales, consultas vs reembolsos y tasas de cierre.',
    url: 'dashboard/',
    icono: '📊',
    categoria: 'Gestión',
    estado: 'activo',
  },
  {
    id: 'centro-guias',
    titulo: 'Guías e Instructivos',
    descripcion: 'Material informativo y guías rápidas de atención médica para entrega directa en PDF a clientes.',
    url: 'guias/',
    icono: '📥',
    categoria: 'Clientes y Recursos',
    estado: 'activo',
  },
];

