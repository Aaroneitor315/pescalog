import { describe, it, expect } from 'vitest'
import {
  coefSuperficieArmado,
  potenciaTension,
  flotabilidadFlotador,
  cableProfundidad,
  areaBarrida,
  seleccionPuertas,
  seleccionCableAcero,
  formatNum,
} from './calculos.js'

describe('coefSuperficieArmado', () => {
  it('E = R / F', () => {
    expect(coefSuperficieArmado({ R: 30, F: 50 }).E.valor).toBeCloseTo(0.6, 6)
  })
  it('S = E · L · H · M2²', () => {
    // E = 0,6 ; S = 0,6 · 400 · 120 · 0,12² = 414,72
    expect(coefSuperficieArmado({ R: 30, F: 50, L: 400, H: 120, M2: 0.12 }).S.valor).toBeCloseTo(414.72, 2)
  })
  it('tolerante a inputs vacíos (null, sin romper)', () => {
    const r = coefSuperficieArmado({})
    expect(r.E.valor).toBeNull()
    expect(r.S.valor).toBeNull()
  })
  it('no divide por cero (F = 0 → E null)', () => {
    expect(coefSuperficieArmado({ R: 10, F: 0 }).E.valor).toBeNull()
  })
})

describe('potenciaTension — caso real 2800 HP / 4 nudos', () => {
  const r = potenciaTension({ NHP: 2800, V: 4 })
  it('PS ≈ 358 HP', () => {
    expect(r.PS.valor).toBeCloseTo(358.4, 1)
  })
  it('T ≈ 13.060 kg (conversión exacta nudo→m/s)', () => {
    expect(r.T.valor).toBeGreaterThan(13000)
    expect(r.T.valor).toBeLessThan(13100)
  })
})

describe('flotabilidadFlotador', () => {
  it('cilíndrico: Fb = 0,55 · L · D²  (L=20, D=10 → 1100 gf)', () => {
    expect(flotabilidadFlotador({ forma: 'cilindrico', L: 20, D: 10 }).Fb.valor).toBeCloseTo(1100, 6)
  })
  it('oval: Fb = 0,67 · L · D²', () => {
    expect(flotabilidadFlotador({ forma: 'oval', L: 20, D: 10 }).Fb.valor).toBeCloseTo(1340, 6)
  })
})

describe('cableProfundidad', () => {
  it('plataforma: 3–4 × profundidad', () => {
    const r = cableProfundidad({ profundidad: 80, zona: 'plataforma' })
    expect(r.cable_min.valor).toBe(240)
    expect(r.cable_max.valor).toBe(320)
  })
  it('mínimo 120 m en fondos < 20 m', () => {
    const r = cableProfundidad({ profundidad: 15, zona: 'plataforma' })
    expect(r.cable_min.valor).toBe(120)
  })
})

describe('areaBarrida', () => {
  it('AH·V·t con conversión exacta', () => {
    // V_ms = 3·0,514444 = 1,543332 ; dist = ·(180·60=10800) = 16667,99 ; Área = 18·dist
    const r = areaBarrida({ AH: 18, V: 3, t: 180 })
    expect(r.distancia.valor).toBeCloseTo(16667.99, 1)
    expect(r.area.valor).toBeCloseTo(300023.8, 0)
  })
  it('pelágico: AH = RS · 0,50 cuando falta AH', () => {
    const r = areaBarrida({ RS: 40, tipoPesca: 'pelagico', V: 3, t: 180 })
    // AH = 20 → área = 20 · distancia
    expect(r.area.valor).toBeCloseTo(333359.8, 0)
  })
})

describe('seleccionPuertas (tabla empírica)', () => {
  it('rectangular 350 CV → 2,42–2,88 m² / 300–420 kg', () => {
    const r = seleccionPuertas({ potenciaCV: 350, tipo: 'rectangular' })
    expect(r.area_min.valor).toBe(2.42)
    expect(r.area_max.valor).toBe(2.88)
    expect(r.peso_min.valor).toBe(300)
    expect(r.peso_max.valor).toBe(420)
  })
  it('ovalada sin peso en la tabla (null)', () => {
    const r = seleccionPuertas({ potenciaCV: 150, tipo: 'ovalada' })
    expect(r.area_min.valor).toBe(1.65)
    expect(r.peso_min.valor).toBeNull()
  })
})

describe('seleccionCableAcero', () => {
  it('500 CV → 16,5 mm / 1,0 kg·m / 13.200 kgf', () => {
    const r = seleccionCableAcero({ potenciaCV: 500 })
    expect(r.diametro.valor).toBe(16.5)
    expect(r.peso.valor).toBe(1.0)
    expect(r.rotura.valor).toBe(13200)
  })
})

describe('formatNum (es-AR)', () => {
  it('miles con punto, decimal con coma', () => {
    expect(formatNum(13060, 0)).toBe('13.060')
    expect(formatNum(0.6, 2)).toBe('0,60')
  })
  it('vacío → guion', () => {
    expect(formatNum(null)).toBe('—')
  })
})
