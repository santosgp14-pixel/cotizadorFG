/**
 * Tarifas – Seguro Colectivo de Salud AJEVEN C.A. Nómina Diaria (Obreros)
 * Hispana de Seguros, S.A. – Opción I
 * Para actualizar tarifas, modifique solo este archivo.
 */
const TARIFAS = {
  empresa: 'AJEVEN C.A. – Nómina Diaria (Obreros)',
  aseguradora: 'Hispana de Seguros, S.A.',
  validezDias: 15,

  titular: {
    sumaAsegurada: 6000, // Básica $5.000 + Exceso $1.000
    primas: [
      { min: 0,  max: 9,  prima: 309 },
      { min: 10, max: 19, prima: 410 },
      { min: 20, max: 29, prima: 502 },
      { min: 30, max: 39, prima: 595 },
      { min: 40, max: 49, prima: 635 },
      { min: 50, max: 54, prima: 775 },
      { min: 55, max: 59, prima: 995 },
      { min: 60, max: 69, prima: 1325 },
      { min: 70, max: 79, prima: 1459 },
      { min: 80, max: 99, prima: 2159 },
    ],
  },

  familiar: {
    sumaAsegurada: 4000,
    primas: [
      { min: 0,  max: 9,  prima: 245 },
      { min: 10, max: 19, prima: 305 },
      { min: 20, max: 29, prima: 435 },
      { min: 30, max: 39, prima: 525 },
      { min: 40, max: 49, prima: 602 },
      { min: 50, max: 54, prima: 703 },
      { min: 55, max: 59, prima: 898 },
      { min: 60, max: 69, prima: 1050 },
      { min: 70, max: 79, prima: 1440 },
      { min: 80, max: 99, prima: 1846 },
    ],
  },

  // Parentescos asegurables y edad máxima permitida
  parentescos: [
    { id: 'conyuge', nombre: 'Cónyuge',     edadMax: 99 },
    { id: 'hijo',    nombre: 'Hijo(a)',     edadMax: 25 },
    { id: 'padre',   nombre: 'Padre/Madre', edadMax: 99 },
    { id: 'hermano', nombre: 'Hermano(a)',  edadMax: 25 },
  ],

  coberturas: [
    'HCM sin deducible',
    'Maternidad $1.000',
    'COVID-19',
    'Odontología',
    'Oftalmología',
    'Dermatología',
    'Atención médica primaria',
    'Atención domiciliaria',
    'Ambulancia',
  ],
};

