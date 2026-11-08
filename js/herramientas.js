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
    id: 'proxima',
    titulo: 'Nueva herramienta',
    descripcion: 'Espacio reservado para la próxima herramienta.',
    url: '#',
    icono: '🧰',
    categoria: 'Utilidades',
    estado: 'proximamente',
  },
];

