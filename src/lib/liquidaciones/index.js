import maquinista from './maquinista.js'

// Cada tipo de liquidación es un módulo autocontenido que exporta:
//   id, label, subtitulo, disponible, campos, tarifasDefault, calcular, resumen
//
// Para agregar marinero o capitán: crear el archivo, importarlo e incluirlo acá.

const marinero = {
  id: 'marinero',
  label: 'Marinero',
  subtitulo: 'Próximamente',
  disponible: false,
  campos: [],
  tarifasDefault: {},
  calcular: () => ({ valores: {}, grupos: [], totalBruto: 0, totalDeducciones: 0, neto: 0 }),
  resumen: () => '',
}

const capitan = {
  id: 'capitan',
  label: 'Capitán',
  subtitulo: 'Próximamente',
  disponible: false,
  campos: [],
  tarifasDefault: {},
  calcular: () => ({ valores: {}, grupos: [], totalBruto: 0, totalDeducciones: 0, neto: 0 }),
  resumen: () => '',
}

export const TIPOS = [maquinista, marinero, capitan]

export function getTipo(id) {
  return TIPOS.find(t => t.id === id) || maquinista
}
