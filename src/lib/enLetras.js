// Convierte un monto en pesos a letras (español rioplatense) para la línea
// "Son pesos: …" del recibo. Ej: 9303862.05 → "nueve millones trescientos tres
// mil ochocientos sesenta y dos con 05/100".

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

// 0..999
function menorMil(n, apocope) {
  if (n === 0) return ''
  if (n === 100) return 'cien'
  let txt = ''
  const c = Math.floor(n / 100)
  const resto = n % 100
  if (c) txt += CENTENAS[c] + (resto ? ' ' : '')
  if (resto < 30) {
    let u = UNIDADES[resto]
    if (apocope && resto === 1) u = 'un'
    if (apocope && resto === 21) u = 'veintiún'
    txt += u
  } else {
    const d = Math.floor(resto / 10)
    const u = resto % 10
    txt += DECENAS[d]
    if (u) txt += ' y ' + (apocope && u === 1 ? 'un' : UNIDADES[u])
  }
  return txt.trim()
}

function enteroEnLetras(n) {
  if (n === 0) return 'cero'
  let txt = ''
  const millones = Math.floor(n / 1000000)
  const miles = Math.floor((n % 1000000) / 1000)
  const resto = n % 1000

  if (millones) {
    txt += millones === 1 ? 'un millón' : menorMil(millones, true) + ' millones'
    if (miles || resto) txt += ' '
  }
  if (miles) {
    txt += miles === 1 ? 'mil' : menorMil(miles, true) + ' mil'
    if (resto) txt += ' '
  }
  if (resto) txt += menorMil(resto, false)
  return txt.trim()
}

// monto → "… con NN/100"
export function montoEnLetras(monto) {
  const neg = monto < 0
  const abs = Math.abs(Number(monto) || 0)
  const entero = Math.floor(abs)
  const centavos = Math.round((abs - entero) * 100)
  const letras = enteroEnLetras(entero)
  const cc = String(centavos).padStart(2, '0')
  return `${neg ? 'menos ' : ''}${letras} con ${cc}/100`
}
