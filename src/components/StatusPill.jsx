// Sistema de estados de stock unificado (reutilizable en toda la app).
// 3 estados: ok (verde) · low/bajo (ámbar, stock <= mínimo) · out/sin stock (rojo, stock == 0).

export const ESTADO_STOCK = {
  ok:  { label: 'OK',        color: '#34d399' },
  low: { label: 'Bajo',      color: '#fbbf24' },
  out: { label: 'Sin stock', color: '#f87171' },
}

// Calcula el estado a partir del stock actual y el mínimo.
export function estadoStock(stock, minimo) {
  const s = Number(stock) || 0
  const m = Number(minimo) || 0
  if (s === 0) return 'out'
  if (s <= m) return 'low'
  return 'ok'
}

// Color hex del estado (para teñir números, textos, etc.).
export function colorEstado(status) {
  return (ESTADO_STOCK[status] || ESTADO_STOCK.ok).color
}

// Píldora de estado. Dark-theme: fondo e línea derivados del color con alpha.
export default function StatusPill({ status, className = '' }) {
  const e = ESTADO_STOCK[status] || ESTADO_STOCK.ok
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${className}`}
      style={{ color: e.color, background: `${e.color}1a`, borderColor: `${e.color}4d` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
      {e.label}
    </span>
  )
}
