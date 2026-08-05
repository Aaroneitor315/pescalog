import { useState, useMemo, useEffect, useRef } from 'react'
import Sponsors from './Sponsors'
import { TrendingUp, Fish, Package, Award, DollarSign, Banknote, Waves, Eye, EyeOff, RefreshCw, Plus, Lock } from 'lucide-react'
import { calcularSingladuras } from '../hooks/useViajes'
import { useDolar } from '../hooks/useDolar'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function fmtPesos(n) {
  return `$ ${Math.round(n).toLocaleString('es-AR')}`
}

function fmtUSD(n) {
  return `USD ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function mesKey(v) {
  const iso = v.fechaRegreso || v.fechaSalida || v.creadoEn
  if (!iso || typeof iso !== 'string') return ''
  const [y, m] = iso.split('-')
  return `${y}-${m}`
}

function StatCard({ icon: Icon, label, value, sub, accent, iconBg }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
          <p className={`text-3xl font-black mt-1 tracking-tight ${accent || 'text-white'}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`${iconBg || 'bg-navy-700'} p-2 rounded-lg`}>
          <Icon size={20} className={accent || 'text-cyan-400'} />
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-sm">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-cyan-400 font-semibold">{payload[0].value.toLocaleString('es-AR')} cajones</p>
    </div>
  )
}

function DolarCards() {
  const { cotizaciones, cargando, error, actualizadoEn, recargar } = useDolar()
  const [flipKey, setFlipKey] = useState(0)

  const fmtHora = (d) => d ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''

  const colorClass = {
    blue:   { border: 'border-blue-500/40',   accent: 'text-blue-400',   bar: 'bg-blue-500' },
    cyan:   { border: 'border-cyan-500/40',    accent: 'text-cyan-400',   bar: 'bg-cyan-500' },
    purple: { border: 'border-purple-500/40',  accent: 'text-purple-400', bar: 'bg-purple-500' },
  }

  const items = cotizaciones ? ['oficial', 'blue', 'mep'].map(k => cotizaciones[k]).filter(Boolean) : []

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-navy-700">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cotización dólar</span>
        </div>
        <div className="flex items-center gap-2">
          {actualizadoEn && <span className="text-xs text-slate-600">{fmtHora(actualizadoEn)}</span>}
          <button onClick={recargar} className="btn-ghost p-1 rounded" title="Actualizar">
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>

      {cargando && !cotizaciones && (
        <div className="grid grid-cols-3 divide-x divide-navy-700">
          {[0,1,2].map(i => (
            <div key={i} className="px-4 py-4 text-center">
              <div className="h-2.5 w-12 bg-navy-700 rounded animate-pulse mx-auto mb-2" />
              <div className="h-5 w-20 bg-navy-700 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-slate-500 text-center py-3 px-4">Sin conexión · cotizaciones no disponibles</p>
      )}

      {cotizaciones && (
        <div className="grid grid-cols-3 gap-2 p-2">
          {items.map(item => {
            const c = colorClass[item.color] || colorClass.blue
            const borderColors = { blue: '#3b82f6', cyan: '#06b6d4', purple: '#8b5cf6' }
            return (
              <div key={item.key} className="rounded-xl px-3 py-3 bg-navy-900"
                style={{ borderLeft: `3px solid ${borderColors[item.color] || borderColors.blue}` }}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${c.accent}`}>{item.label}</p>
                <p className="text-lg font-black text-white tabular-nums tracking-tight flip-val" key={flipKey}>
                  ${(item.venta ?? 0).toLocaleString('es-AR')}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Compra ${(item.compra ?? 0).toLocaleString('es-AR')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const SECTORES_INFO = [
  {
    id: 'maquinas',
    label: 'Máquinas',
    sub: 'Sala de máquinas',
    color: '#0891b2',
    textColor: 'text-cyan-400',
    border: 'border-cyan-500/25',
    bg: 'bg-cyan-500/8',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    id: 'cubierta',
    label: 'Cubierta',
    sub: 'Aparejos y equipos',
    color: '#10b981',
    textColor: 'text-emerald-400',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/8',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6m0 0C8 8 5 11 5 15H2l10 7 10-7h-3c0-4-3-7-7-7z"/>
        <line x1="12" y1="8" x2="12" y2="22"/>
      </svg>
    ),
  },
  {
    id: 'puente',
    label: 'Puente',
    sub: 'Navegación e instrumental',
    color: '#a855f7',
    textColor: 'text-purple-400',
    border: 'border-purple-500/25',
    bg: 'bg-purple-500/8',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M5 20V10l7-7 7 7v10M9 20v-5h6v5"/>
      </svg>
    ),
  },
]

// ── Mini animaciones para las tarjetas ──────────────────────────────────────

function drawMiniMotor(ctx, W, H, t) {
  ctx.fillStyle = '#020a14'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(0,80,160,.07)'; ctx.lineWidth = 0.5
  for (let x = 0; x < W; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  for (let y = 0; y < H; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

  const CX = 95, CY = 92, CR = 20
  const cyls = [{ x: 46 }, { x: 82 }, { x: 118 }]
  cyls.forEach((c, i) => {
    const ang = t * 0.045 + (i * Math.PI * 2 / 3)
    const pisY = CY + Math.sin(ang) * CR - 36
    const CW = 22
    const jg = ctx.createLinearGradient(c.x, 14, c.x, 58)
    jg.addColorStop(0, 'rgba(0,100,220,.3)'); jg.addColorStop(1, 'rgba(180,50,0,.22)')
    ctx.fillStyle = jg; ctx.fillRect(c.x - CW / 2, 14, CW, 44)
    ctx.strokeStyle = 'rgba(0,160,255,.25)'; ctx.lineWidth = 0.5; ctx.strokeRect(c.x - CW / 2, 14, CW, 44)
    ctx.fillStyle = '#010811'; ctx.fillRect(c.x - CW / 2 + 2, 16, CW - 4, 40)
    const tdc = (Math.sin(ang) + 1) / 2
    if (tdc > 0.82) { ctx.fillStyle = `rgba(255,140,0,${(tdc - 0.82) * 5})`; ctx.fillRect(c.x - 8, 17, 16, 7) }
    const pg = ctx.createLinearGradient(c.x - 8, 0, c.x + 8, 0)
    pg.addColorStop(0, '#2a3a48'); pg.addColorStop(0.5, '#4e606e'); pg.addColorStop(1, '#2a3a48')
    ctx.fillStyle = pg; ctx.fillRect(c.x - 8, Math.max(18, pisY), 16, 9)
    ctx.strokeStyle = '#3a5060'; ctx.lineWidth = 1.5; ctx.beginPath()
    ctx.moveTo(c.x, Math.max(22, pisY + 9))
    ctx.lineTo(CX - 55 + i * 36 + Math.cos(ang) * CR, CY + Math.sin(ang) * CR); ctx.stroke()
  })

  ctx.save(); ctx.translate(CX, CY); ctx.rotate(t * 0.045)
  ctx.strokeStyle = 'rgba(60,110,160,.5)'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(0, 0, CR, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#253545'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill()
  ;[0, Math.PI * 2 / 3, Math.PI * 4 / 3].forEach(a => {
    ctx.fillStyle = '#1e2e3e'
    ctx.beginPath(); ctx.arc(Math.cos(a) * CR, Math.sin(a) * CR, 2.5, 0, Math.PI * 2); ctx.fill()
  })
  ctx.restore()

  const tx = 163, ty = 38
  ctx.strokeStyle = 'rgba(50,90,130,.4)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2); ctx.stroke()
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(t * 0.2)
  ctx.fillStyle = 'rgba(210,140,0,.85)'
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 14, a, a + Math.PI * 0.32); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = '#192530'; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI * 2); ctx.fill()

  const gx = 174, gy = 84, gr = 17
  const rpm = 1850 + Math.sin(t * 0.025) * 45
  const gS = -Math.PI * 0.78, gE = Math.PI * 0.78, gV = gS + (gE - gS) * (rpm / 2400)
  ctx.fillStyle = '#080f18'; ctx.beginPath(); ctx.arc(gx, gy, gr + 3, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#0a1a28'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(gx, gy, gr, gS, gE); ctx.stroke()
  const ag = ctx.createLinearGradient(gx - gr, gy, gx + gr, gy)
  ag.addColorStop(0, '#0a7fff'); ag.addColorStop(1, '#00d4ff')
  ctx.strokeStyle = ag; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(gx, gy, gr, gS, gV); ctx.stroke()
  ctx.save(); ctx.translate(gx, gy); ctx.rotate(gV)
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(gr - 3, 0); ctx.stroke()
  ctx.restore()
  ctx.fillStyle = 'rgba(0,212,255,.7)'; ctx.font = 'bold 5px "Courier New"'; ctx.textAlign = 'center'
  ctx.fillText(Math.round(rpm), gx, gy + 3)

  ctx.fillStyle = 'rgba(2,8,18,.88)'; ctx.fillRect(0, 0, W, 13)
  ctx.fillStyle = '#0a7fff'; ctx.font = 'bold 6px "Courier New"'; ctx.textAlign = 'left'
  ctx.fillText('■ PROPULSIÓN  ·  MOTOR PRINCIPAL', 5, 9)
}

function drawMiniArrastre(ctx, W, H, t) {
  const WY = 62
  ctx.fillStyle = '#010307'; ctx.fillRect(0, 0, W, WY)
  const sg = ctx.createLinearGradient(0, WY, 0, H)
  sg.addColorStop(0, '#031828'); sg.addColorStop(1, '#010a18')
  ctx.fillStyle = sg; ctx.fillRect(0, WY, W, H - WY)

  ;[[18, 8], [50, 5], [90, 12], [140, 4], [172, 9], [35, 20], [120, 17]].forEach(([sx, sy], i) => {
    ctx.globalAlpha = 0.18 + Math.sin(t * 0.035 + i * 1.4) * 0.12
    ctx.fillStyle = '#cce8ff'; ctx.fillRect(sx, sy, 1, 1)
  }); ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(10,70,130,.5)'; ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= W; x += 2) {
    const y = WY + Math.sin(x * 0.05 + t * 0.03) * 1.8 + Math.sin(x * 0.015 + t * 0.02) * 0.9
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }; ctx.stroke()

  const bob = Math.sin(t * 0.025) * 0.5
  ctx.fillStyle = '#1e2e40'; ctx.beginPath()
  ctx.moveTo(8, WY + bob); ctx.lineTo(5, WY - 4 + bob)
  ctx.bezierCurveTo(3, WY - 12 + bob, 7, WY - 20 + bob, 18, WY - 24 + bob)
  ctx.lineTo(32, WY - 27 + bob); ctx.lineTo(88, WY - 27 + bob)
  ctx.lineTo(96, WY - 16 + bob); ctx.lineTo(96, WY + bob); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#080f1a'; ctx.beginPath()
  ctx.moveTo(8, WY + bob); ctx.bezierCurveTo(3, WY + 9 + bob, 2, WY + 22 + bob, 10, WY + 30 + bob)
  ctx.bezierCurveTo(35, WY + 38 + bob, 75, WY + 40 + bob, 88, WY + 36 + bob)
  ctx.bezierCurveTo(94, WY + 31 + bob, 96, WY + 18 + bob, 96, WY + bob); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#9a1010'; ctx.lineWidth = 2.5; ctx.beginPath()
  ctx.moveTo(10, WY + 2 + bob); ctx.bezierCurveTo(40, WY + 6 + bob, 70, WY + 7 + bob, 90, WY + 5 + bob); ctx.stroke()

  ctx.strokeStyle = '#5a7088'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(30, WY - 27 + bob); ctx.lineTo(30, WY - 60 + bob); ctx.stroke()
  const blink = 0.6 + Math.sin(t * 0.07) * 0.35
  ctx.fillStyle = `rgba(255,255,220,${blink})`; ctx.shadowColor = '#ffffcc'; ctx.shadowBlur = 8 * blink
  ctx.beginPath(); ctx.arc(30, WY - 62 + bob, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
  ctx.fillStyle = '#00ee44'; ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 6
  ctx.beginPath(); ctx.arc(64, WY - 14 + bob, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0

  const ws = Math.sin(t * 0.022) * 0.5
  ctx.shadowColor = '#e8c432'; ctx.shadowBlur = 4; ctx.strokeStyle = '#e8c432'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(96, WY + bob); ctx.bezierCurveTo(128, WY + 18 + ws, 148, WY + 34 + ws, 160, WY + 44); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(96, WY + bob); ctx.bezierCurveTo(130, WY + 24 + ws, 150, WY + 40 + ws, 160, WY + 54); ctx.stroke()
  ctx.shadowBlur = 0

  const bx = 160, byt = WY + 44, byb = WY + 54, sx = W - 8, sy = WY + 49 + Math.sin(t * 0.02) * 1.2
  ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 3; ctx.strokeStyle = 'rgba(0,255,157,.7)'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(bx, byt); ctx.bezierCurveTo(bx + 20, byt + 2, bx + 24, sy - 5, sx, sy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(bx, byb); ctx.bezierCurveTo(bx + 20, byb - 2, bx + 24, sy + 5, sx, sy); ctx.stroke()
  ctx.shadowBlur = 0

  const peces = [{ x: 108, r: 1.1, ph: 0.3 }, { x: 130, r: 1.4, ph: 1.1 }, { x: 150, r: 1.0, ph: 2.2 }]
  peces.forEach(p => {
    const py = WY + 49 + Math.sin(t * 0.04 + p.ph) * 3
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#00d4ff'
    ctx.beginPath(); ctx.arc(p.x + (t * 0.3 % 50) - 5, py, p.r * 1.5, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  })

  ctx.fillStyle = 'rgba(1,3,7,.88)'; ctx.fillRect(0, 0, W, 13)
  ctx.fillStyle = '#0a7fff'; ctx.font = 'bold 6px "Courier New"'; ctx.textAlign = 'left'
  ctx.fillText('■ ARRASTRE  ·  PÓRTICO · WARPS · RED', 5, 9)
}

function drawMiniRadar(ctx, W, H, t) {
  ctx.fillStyle = '#021208'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(0,80,20,.1)'; ctx.lineWidth = 0.5
  for (let x = 0; x < W; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  for (let y = 0; y < H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

  const rx = 56, ry = 68, rr = 46
  for (let i = 1; i <= 3; i++) {
    ctx.strokeStyle = `rgba(0,200,80,${0.08 + i * 0.04})`; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.arc(rx, ry, rr * i / 3, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(0,180,70,.12)'; ctx.lineWidth = 0.5
  ;[0, 45, 90, 135].forEach(deg => {
    const a = (deg * Math.PI) / 180
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr)
    ctx.lineTo(rx - Math.cos(a) * rr, ry - Math.sin(a) * rr); ctx.stroke()
  })

  const sweepAngle = (t * 0.04) % (Math.PI * 2)
  const sg = ctx.createConicalGradient ? null : null
  ctx.save(); ctx.translate(rx, ry)
  const sweepG = ctx.createLinearGradient(0, 0, Math.cos(sweepAngle) * rr, Math.sin(sweepAngle) * rr)
  sweepG.addColorStop(0, 'rgba(0,255,100,.55)'); sweepG.addColorStop(1, 'rgba(0,255,100,.0)')
  ctx.fillStyle = sweepG
  ctx.beginPath(); ctx.moveTo(0, 0)
  ctx.arc(0, 0, rr, sweepAngle - 0.6, sweepAngle)
  ctx.closePath(); ctx.fill(); ctx.restore()

  const blips = [{ a: 1.1, d: 0.65 }, { a: 3.8, d: 0.42 }]
  blips.forEach(b => {
    const bx2 = rx + Math.cos(b.a) * rr * b.d, by2 = ry + Math.sin(b.a) * rr * b.d
    const blipAlpha = 0.4 + Math.sin(t * 0.05 + b.a) * 0.35
    ctx.fillStyle = `rgba(0,255,100,${blipAlpha})`; ctx.shadowColor = '#00ff64'; ctx.shadowBlur = 5
    ctx.beginPath(); ctx.arc(bx2, by2, 2, 0, Math.PI * 2); ctx.fill()
  }); ctx.shadowBlur = 0

  const gx = 158, gy = 55, gr = 30
  const rpm = 1850 + Math.sin(t * 0.025) * 40
  const gS = -Math.PI * 0.75, gE = Math.PI * 0.75, gV = gS + (gE - gS) * (rpm / 2400)
  ctx.fillStyle = '#030e07'; ctx.beginPath(); ctx.arc(gx, gy, gr + 4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(0,80,30,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, gy, gr + 4, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = '#071a0e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(gx, gy, gr, gS, gE); ctx.stroke()
  const arcG = ctx.createLinearGradient(gx - gr, gy, gx + gr, gy)
  arcG.addColorStop(0, '#00aa44'); arcG.addColorStop(1, '#00ff88')
  ctx.strokeStyle = arcG; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(gx, gy, gr, gS, gV); ctx.stroke()
  ctx.save(); ctx.translate(gx, gy); ctx.rotate(gV)
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(gr - 5, 0); ctx.stroke()
  ctx.restore()
  ctx.fillStyle = '#00ff88'; ctx.font = 'bold 6px "Courier New"'; ctx.textAlign = 'center'
  ctx.fillText(Math.round(rpm), gx, gy + 4)
  ctx.fillStyle = 'rgba(0,200,80,.6)'; ctx.font = '5px "Courier New"'
  ctx.fillText('RPM', gx, gy + gr - 2)

  const tx2 = gx, ty2 = 108
  ctx.strokeStyle = 'rgba(180,180,200,.55)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(tx2 - 24, ty2); ctx.lineTo(tx2 + 24, ty2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(tx2, ty2 - 14); ctx.lineTo(tx2, ty2 + 3); ctx.stroke()
  ctx.fillStyle = 'rgba(210,210,230,.5)'; ctx.beginPath(); ctx.arc(tx2 - 24, ty2, 3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(tx2 + 24, ty2, 3, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(200,200,220,.35)'; ctx.lineWidth = 8; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(tx2 - 14, ty2 - 6); ctx.lineTo(tx2 - 14, ty2 + 6); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(tx2 + 14, ty2 - 6); ctx.lineTo(tx2 + 14, ty2 + 6); ctx.stroke()
  ctx.lineCap = 'butt'

  ctx.fillStyle = 'rgba(2,18,8,.88)'; ctx.fillRect(0, 0, W, 13)
  ctx.fillStyle = '#00cc66'; ctx.font = 'bold 6px "Courier New"'; ctx.textAlign = 'left'
  ctx.fillText('■ PUENTE  ·  RADAR · RPM · TIMONEL', 5, 9)
}

function SectorCard({ s, esMio, onAbrirSector }) {
  const canvasRef = useRef()
  const rafRef = useRef()

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = 200, H = 130
    cv.width = W * dpr; cv.height = H * dpr
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    let t = 0
    function draw() {
      try {
        ctx.clearRect(0, 0, W, H)
        if (s.id === 'maquinas') drawMiniMotor(ctx, W, H, t)
        else if (s.id === 'cubierta') drawMiniArrastre(ctx, W, H, t)
        else drawMiniRadar(ctx, W, H, t)
        t++
        rafRef.current = requestAnimationFrame(draw)
      } catch {
        cancelAnimationFrame(rafRef.current)
      }
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [s.id])

  return (
    <button
      onClick={() => onAbrirSector(s.id)}
      className="flex flex-col rounded-2xl overflow-hidden transition-all active:scale-95"
      style={{
        background: esMio ? s.color + '14' : s.color + '0d',
        border: `1.5px solid ${esMio ? s.color + '60' : s.color + '30'}`,
        boxShadow: esMio ? `0 0 18px ${s.color}18` : 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      <div className="px-2 pt-1.5 pb-2.5 text-center">
        <p className="text-xs font-bold leading-tight" style={{ color: s.color }}>{s.label}</p>
        {esMio
          ? <span className="mt-1 inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: s.color + '20', color: s.color }}>Tu sector</span>
          : <p className="text-[9px] mt-0.5" style={{ color: '#2a4a6a' }}>{s.sub.split('·')[0].trim()}</p>
        }
      </div>
    </button>
  )
}

function SectoresHero({ perfil, onAbrirSector }) {
  const sorted = [...SECTORES_INFO].sort((a, b) => {
    if (perfil?.sector === a.id) return -1
    if (perfil?.sector === b.id) return 1
    return 0
  })
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2.5 px-0.5">Sectores a bordo</p>
      <div className="grid grid-cols-3 gap-2.5">
        {sorted.map(s => (
          <SectorCard key={s.id} s={s} esMio={perfil?.sector === s.id} onAbrirSector={onAbrirSector} />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ viajes, calcularTotalViaje, config, onAbrirSector, onNuevoViaje, perfil, esAdmin }) {
  const especies = useMemo(() => {
    const set = new Set(viajes.map(v => v.especie))
    return ['todas', ...Array.from(set).sort()]
  }, [viajes])

  const [especieFiltro, setEspecieFiltro] = useState('todas')
  const [mesFiltro, setMesFiltro] = useState('todos')
  const [ocultarMontos, setOcultarMontos] = useState(() => localStorage.getItem('ocultarMontos') === 'true')

  function toggleOcultarMontos() {
    setOcultarMontos(prev => {
      const next = !prev
      localStorage.setItem('ocultarMontos', next)
      return next
    })
  }

  const monto = (txt) => ocultarMontos ? '••••••' : txt

  const mesesDisponibles = useMemo(() => {
    const keys = [...new Set(viajes.map(v => mesKey(v)))].sort().reverse()
    return keys.map(k => {
      const [y, m] = k.split('-')
      return { key: k, label: `${MESES[Number(m) - 1]} ${y.slice(2)}`, labelFull: `${MESES_FULL[Number(m) - 1]} ${y}` }
    })
  }, [viajes])

  const viajesFiltrados = useMemo(() => {
    let lista = especieFiltro === 'todas' ? viajes : viajes.filter(v => v.especie === especieFiltro)
    if (mesFiltro !== 'todos') lista = lista.filter(v => mesKey(v) === mesFiltro)
    return lista
  }, [viajes, especieFiltro, mesFiltro])

  const mesActual = mesesDisponibles.find(m => m.key === mesFiltro)

  const stats = useMemo(() => {
    if (!viajesFiltrados.length) return null
    const total = viajesFiltrados.reduce((s, v) => s + v.cajones, 0)
    const promedio = Math.round(total / viajesFiltrados.length)
    const mejor = viajesFiltrados.reduce((m, v) => v.cajones > m.cajones ? v : m)
    const totalPesos = viajesFiltrados.reduce((s, v) => s + calcularTotalViaje(v).ars, 0)
    const totalUSD = viajesFiltrados.reduce((s, v) => s + calcularTotalViaje(v).usd, 0)
    const totalSingladuras = viajesFiltrados.reduce((s, v) => s + calcularSingladuras(v.fechaSalida, v.fechaRegreso), 0)
    const totalEmbarcado = viajesFiltrados.reduce((s, v) => s + calcularSingladuras(v.fechaEmbarco, v.fechaDesembarco), 0)
    const embarcadoPorBarco = {}
    viajesFiltrados.forEach(v => {
      const nombre = v.barco?.trim() || '(sin nombre)'
      const dias = calcularSingladuras(v.fechaEmbarco, v.fechaDesembarco)
      if (!embarcadoPorBarco[nombre]) embarcadoPorBarco[nombre] = { dias: 0, viajes: 0 }
      embarcadoPorBarco[nombre].dias += dias
      embarcadoPorBarco[nombre].viajes += 1
    })
    const barcosUnicos = Object.keys(embarcadoPorBarco).length
    return { total, promedio, mejor, cantidad: viajesFiltrados.length, totalPesos, totalUSD, totalSingladuras, totalEmbarcado, embarcadoPorBarco, barcosUnicos }
  }, [viajesFiltrados, calcularTotalViaje, config])


  if (!viajes.length) {
    return (
      <div className="space-y-6">
        <SectoresHero perfil={perfil} onAbrirSector={onAbrirSector} esAdmin={esAdmin} />
        <DolarCards />
        <div className="card text-center py-12 px-6 flex flex-col items-center gap-4">
          <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(6,182,212,0.1)',border:'2px solid rgba(6,182,212,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l4-8 4 4 3-6 4 10H3z"/><path d="M3 21h18"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">¡Bienvenido a BitácoraAR!</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">Registrá tu primer viaje y empezá a ver tus estadísticas, ganancias y stock a bordo en tiempo real.</p>
          </div>
          <button
            onClick={onNuevoViaje}
            className="btn-primary px-8 py-3 text-base font-bold rounded-xl flex items-center gap-2"
            style={{background:'linear-gradient(135deg,#06b6d4,#0891b2)',boxShadow:'0 4px 16px rgba(6,182,212,0.35)'}}>
            <Plus size={20} />
            Registrar mi primer viaje
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-2">
            {[
              { icon: Package, label: 'Cajones y capturas', desc: 'Registrá cada marea con fecha, barco y especie', color: 'text-cyan-400' },
              { icon: TrendingUp, label: 'Ganancias en ARS y USD', desc: 'Calculá tus liquidaciones con precios reales', color: 'text-green-400' },
              { icon: Fish, label: 'Stock por sector', desc: 'Inventario de repuestos para máquinas, cubierta y puente', color: 'text-purple-400' },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="bg-navy-900 rounded-xl p-4 border border-navy-700/50 text-left">
                <Icon size={20} className={`${color} mb-2`} />
                <p className="text-sm font-semibold text-white mb-1">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectoresHero perfil={perfil} onAbrirSector={onAbrirSector} />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">
            {mesActual ? mesActual.labelFull : 'Todos los períodos'}
          </h2>
          <button onClick={toggleOcultarMontos}
            className="flex items-center gap-2 bg-navy-700/60 hover:bg-navy-700 border border-navy-600 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg">
            {ocultarMontos ? <EyeOff size={18} /> : <Eye size={18} />}
            <span className="text-xs font-medium">{ocultarMontos ? 'Mostrar datos' : 'Ocultar datos'}</span>
          </button>
        </div>
        <select className="w-44 text-sm py-1.5" value={especieFiltro} onChange={e => setEspecieFiltro(e.target.value)}>
          {especies.map(e => (
            <option key={e} value={e}>{e === 'todas' ? 'Todas las especies' : capitalize(e)}</option>
          ))}
        </select>
      </div>

      {/* Pills de meses */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setMesFiltro('todos')}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${mesFiltro === 'todos' ? 'bg-cyan-500 text-navy-900' : 'bg-navy-700/60 text-slate-400 border border-navy-600 hover:border-cyan-500/40'}`}>
          Todo
        </button>
        {mesesDisponibles.map(m => (
          <button key={m.key} onClick={() => setMesFiltro(m.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${mesFiltro === m.key ? 'bg-cyan-500 text-navy-900' : 'bg-navy-700/60 text-slate-400 border border-navy-600 hover:border-cyan-500/40'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <DolarCards />

      {stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Package} label="Total cajones" value={stats.total.toLocaleString('es-AR')} sub={`${stats.cantidad} viaje${stats.cantidad !== 1 ? 's' : ''}`} />
            <StatCard icon={TrendingUp} label="Promedio por viaje" value={stats.promedio.toLocaleString('es-AR')} sub="cajones" />
            <StatCard icon={Award} label="Mejor viaje" value={stats.mejor.cajones.toLocaleString('es-AR')} sub={stats.mejor.barco} accent="text-yellow-400" />
            <StatCard icon={Fish} label="Viajes registrados" value={stats.cantidad} sub={especieFiltro !== 'todas' ? capitalize(especieFiltro) : 'todas las especies'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-l-4 border-l-green-500" style={{borderRadius:'0 12px 12px 0'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total facturado (ARS)</p>
                  <p className="text-3xl font-bold mt-1 text-green-400">
                    {stats.totalPesos > 0 ? monto(fmtPesos(stats.totalPesos)) : <span className="text-slate-600 text-xl">Configurar precios</span>}
                  </p>
                  {stats.cantidad > 1 && stats.totalPesos > 0 && (
                    <p className="text-xs text-slate-500 mt-1">Prom. {monto(fmtPesos(stats.totalPesos / stats.cantidad))} / viaje</p>
                  )}
                </div>
                <div className="bg-green-900/30 p-2 rounded-lg"><Banknote size={20} className="text-green-400" /></div>
              </div>
            </div>
            <div className="card border-l-4 border-l-blue-400" style={{borderRadius:'0 12px 12px 0'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total facturado (USD)</p>
                  <p className="text-3xl font-bold mt-1 text-blue-400">
                    {stats.totalUSD > 0 ? monto(fmtUSD(stats.totalUSD)) : <span className="text-slate-600 text-xl">Configurar precios</span>}
                  </p>
                  {stats.cantidad > 1 && stats.totalUSD > 0 && (
                    <p className="text-xs text-slate-500 mt-1">Prom. {monto(fmtUSD(stats.totalUSD / stats.cantidad))} / viaje</p>
                  )}
                </div>
                <div className="bg-blue-900/30 p-2 rounded-lg"><DollarSign size={20} className="text-blue-400" /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card" style={{padding:'10px 14px'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider" style={{fontSize:'10px'}}>Total singladuras</p>
                  <p className="text-lg font-semibold mt-0.5 text-cyan-400">{stats.totalSingladuras}</p>
                  <p className="text-slate-500" style={{fontSize:'10px',marginTop:'2px'}}>días navegados</p>
                </div>
                <Waves size={16} className="text-slate-600 mt-1" />
              </div>
            </div>
            <div className="card" style={{padding:'10px 14px'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider" style={{fontSize:'10px'}}>Días embarcado</p>
                  <p className="text-lg font-semibold mt-0.5 text-white">{stats.totalEmbarcado}</p>
                  <p className="text-slate-500" style={{fontSize:'10px',marginTop:'2px'}}>{stats.barcosUnicos} barco{stats.barcosUnicos !== 1 ? 's' : ''} distintos</p>
                </div>
                <Waves size={16} className="text-slate-600 mt-1" />
              </div>
            </div>
          </div>

          {stats.totalEmbarcado > 0 && (() => {
            const lista = Object.entries(stats.embarcadoPorBarco).sort((a, b) => b[1].dias - a[1].dias)
            const maxDias = lista[0]?.[1].dias || 1
            return (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">Días embarcado por barco</h3>
                <div className="space-y-2">
                  {lista.map(([barco, { dias, viajes }]) => (
                    <div key={barco} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-32 shrink-0 truncate">{barco}</span>
                      <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${(dias / maxDias) * 100}%` }} />
                      </div>
                      <span className="text-sm text-cyan-400 w-16 text-right shrink-0 font-medium">{dias} días</span>
                      <span className="text-xs text-slate-500 w-14 text-right shrink-0">{viajes} viaje{viajes !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

        </>
      ) : (
        <div className="card text-center py-10 text-slate-500">
          No hay viajes en este período.
        </div>
      )}

      <div className="border-t border-navy-700 pt-6">
        <Sponsors />
      </div>
    </div>
  )
}
