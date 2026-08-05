import { describe, it, expect } from 'vitest'
import { calcular, TARIFAS_DEFAULT } from './maquinista.js'

const TOLERANCIA = 0.01

function cerca(real, esperado, label) {
  expect(Math.abs(real - esperado)).toBeLessThanOrEqual(TOLERANCIA)
}

describe('Liquidación SICONARA — maquinista', () => {
  const res = calcular({ kgLangostino: 1283.4, diasMarea: 10 }, TARIFAS_DEFAULT)
  const v = res.valores

  it('haberes remunerativos', () => {
    cerca(v.capturaRem, 1791895.91, 'capturaRem')
    cerca(v.alistamiento, 32675.00, 'alistamiento')
    cerca(v.tareasEspecificas, 283041.50, 'tareasEspecificas')
    cerca(v.alistamientoMaqF, 16337.50, 'alistamientoMaqF')
    cerca(v.tareasEspecificasMaqF, 108960.75, 'tareasEspecificasMaqF')
    cerca(v.totalRemunerativo, 2232910.66, 'totalRemunerativo')
  })

  it('haberes no remunerativos', () => {
    cerca(v.capturaNR, 1791895.91, 'capturaNR')
    cerca(v.acuerdoNR, 441014.75, 'acuerdoNR')
    cerca(v.ropaAgua, 44658.21, 'ropaAgua')
    cerca(v.manutencion, 361280.00, 'manutencion')
    cerca(v.manutencionDescuento, -361280.00, 'manutencionDescuento')
    cerca(v.totalNoRemunerativo, 2277568.87, 'totalNoRemunerativo')
  })

  it('total bruto', () => {
    cerca(res.totalBruto, 4510479.54, 'totalBruto')
  })

  it('deducciones', () => {
    cerca(v.jubilacion, 245620.17, 'jubilacion')
    cerca(v.inssjp, 66987.32, 'inssjp')
    cerca(v.obraSocial, 66987.32, 'obraSocial')
    cerca(v.obraSocialAcuerdos, 66987.32, 'obraSocialAcuerdos')
    cerca(v.siconara, 181116.30, 'siconara')
    cerca(v.siconaraAcuerdos, 19845.66, 'siconaraAcuerdos')
    cerca(v.totalDeducciones, 647544.09, 'totalDeducciones')
  })

  it('neto a cobrar', () => {
    cerca(res.neto, 3862935.45, 'netoACobrar')
  })
})
