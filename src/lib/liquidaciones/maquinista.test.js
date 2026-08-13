import { describe, it, expect } from 'vitest'
import { calcular, TARIFAS_DEFAULT } from './maquinista.js'

const TOLERANCIA = 0.01
const cerca = (real, esperado) => expect(Math.abs(real - esperado)).toBeLessThanOrEqual(TOLERANCIA)

// Caso de aceptación — recibo real de referencia (Gambacorta, julio 2026).
// Kg=9.679,14 · tarifa=1.348,50 · 4 viajes · 29 días · split 30/70.
// Las tarifas por defecto están calibradas contra este recibo.
describe('Liquidación Máquinas — caso real Gambacorta', () => {
  const entradas = {
    kgLangostino: 9679.14,
    cantViajes: 4,
    diasMarea: 29,
    ganancias: 3650061.28, // Impuesto a las Ganancias (carga manual)
    anticipos: [
      { concepto: 'Anticipo de sueldo', monto: 1000000.00 },
      { concepto: 'Anticipo en puerto', monto: 175523.53 },
      { concepto: 'Anticipo de sueldo', monto: 1669685.50 },
    ],
  }
  const res = calcular(entradas, TARIFAS_DEFAULT)
  const v = res.valores

  it('captura: split 30/70 sobre el total', () => {
    cerca(v.capturaTotal, 13052320.29)
    cerca(v.capturaRem, 3915696.09)   // 30%
    cerca(v.capturaNR, 9136624.20)    // 70%
  })

  it('remunerativos: alistamiento y tareas ×viajes, MAQ.F fijos', () => {
    cerca(v.alistamiento, 89065.60)          // 22.266,40 × 4
    cerca(v.tareasEspecificas, 771513.32)    // 192.878,33 × 4
    cerca(v.alistamientoMaqF, 44532.80)      // fijo ×1
    cerca(v.tareasEspecificasMaqF, 297005.52) // fijo ×1
    cerca(v.totalRemunerativo, 5117813.33)   // ← criterio de aceptación
  })

  it('no remunerativos', () => {
    cerca(v.acuerdoNR, 2800933.17)
    cerca(v.ropaAgua, 102356.27)
    cerca(v.viaticos, 175523.53)
    cerca(v.manutencion, 1189940.18)
    cerca(v.manutencionDescuento, -1189940.18)
    cerca(v.totalNoRemunerativo, 12215437.17)
  })

  it('aportes con tope previsional y sindicales', () => {
    cerca(v.baseAportes, 4509567.45)          // tope, no el remunerativo completo
    cerca(v.jubilacion, 496052.42)            // 11% del tope
    cerca(v.inssjp, 135287.02)                // 3% del tope
    cerca(v.obraSocial, 135287.02)            // 3% del tope
    cerca(v.aporteSindical, 641449.69)        // 4,5% de (remun + captura NR)
    cerca(v.aporteSindicalAcuerdos, 126041.99) // 4,5% del acuerdo NR
    cerca(v.ganancias, 3650061.28)
    cerca(v.totalAnticipos, 2845209.03)
    cerca(v.totalDeducciones, 8029388.45)
  })

  it('bruto y neto coinciden con el recibo', () => {
    cerca(res.totalBruto, 17333250.50)
    cerca(res.neto, 9303862.05) // ← neto a cobrar del recibo real
  })
})
