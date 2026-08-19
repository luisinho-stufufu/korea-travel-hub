import { useEffect, useRef, useState } from 'react'
import AmountKeypadField from './AmountKeypadField'

const EUR_KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

function parseLooseNumber(input) {
  if (input === null || input === undefined) return NaN
  const normalized = String(input)
    .trim()
    .replace(/\s+/g, '')
    .replace(/\.(?=.*\.)/g, '')
    .replace(',', '.')
  if (!normalized) return NaN
  return Number(normalized)
}

function formatLastUpdated(val) {
  if (!val) return 'sin fecha'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Gráfica EUR/KRW (SVG puro) ─────────────────────────────────────────────
function RateChart({ refreshKey }) {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tooltip, setTooltip] = useState(null)
  const svgRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    async function fetchHistory() {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      const startStr = start.toISOString().slice(0, 10)
      const endStr = end.toISOString().slice(0, 10)

      try {
        const res = await fetch(
          `https://api.frankfurter.app/${startStr}..${endStr}?from=EUR&to=KRW`
        )
        if (!res.ok) throw new Error('API error')
        const data = await res.json()
        if (cancelled) return

        const points = Object.entries(data.rates)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, r]) => ({ date, value: r.KRW }))

        setChartData(points)
      } catch {
        if (!cancelled) setError('No se pudo cargar el historial de precios')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchHistory()
    return () => { cancelled = true }
  }, [refreshKey])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <span className="text-xs text-slate-400 dark:text-zinc-500 animate-pulse">Cargando gráfica…</span>
      </div>
    )
  }
  if (error || chartData.length < 2) {
    return (
      <p className="py-4 text-center text-xs text-slate-400 dark:text-zinc-500">
        {error || 'Sin datos suficientes'}
      </p>
    )
  }

  const W = 600
  const H = 180
  const PAD = { top: 20, right: 20, bottom: 36, left: 64 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const values = chartData.map((p) => p.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const pts = chartData.map((p, i) => ({
    x: PAD.left + (i / (chartData.length - 1)) * plotW,
    y: PAD.top + plotH - ((p.value - minVal) / range) * plotH,
    date: p.date,
    value: p.value,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`

  const last = pts[pts.length - 1]

  // Grid horizontal lines (3)
  const gridLines = [0, 0.5, 1].map((t) => ({
    y: PAD.top + plotH - t * plotH,
    label: Math.round(minVal + t * range).toLocaleString('es-ES'),
  }))

  function handleMouseMove(e) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    if (mouseX < PAD.left || mouseX > W - PAD.right) { setTooltip(null); return }
    const idx = Math.round(((mouseX - PAD.left) / plotW) * (pts.length - 1))
    const clamped = Math.max(0, Math.min(pts.length - 1, idx))
    setTooltip(pts[clamped])
  }

  // Dates for x-axis (show ~4 labels)
  const xLabels = [0, Math.round(chartData.length * 0.33), Math.round(chartData.length * 0.66), chartData.length - 1]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map((i) => ({ x: pts[i].x, label: chartData[i].date.slice(5) }))

  return (
    <div className="relative" onMouseLeave={() => setTooltip(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair"
        style={{ height: '180px' }}
        onMouseMove={handleMouseMove}
      >
        <defs>
          <linearGradient id="eurKrwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A76EEE" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#A76EEE" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridLines.map((g) => (
          <g key={g.label}>
            <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.left - 6} y={g.y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{g.label}</text>
          </g>
        ))}

        {/* Area + Line */}
        <path d={areaPath} fill="url(#eurKrwGrad)" />
        <path d={linePath} fill="none" stroke="#A76EEE" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Tooltip vertical line */}
        {tooltip && (
          <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + plotH} stroke="#A76EEE" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
        )}

        {/* Last point dot */}
        <circle cx={last.x} cy={last.y} r="4" fill="#A76EEE" stroke="white" strokeWidth="1.5" />

        {/* Tooltip dot */}
        {tooltip && (
          <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="white" stroke="#A76EEE" strokeWidth="2" />
        )}

        {/* X-axis labels */}
        {xLabels.map((l) => (
          <text key={l.label} x={l.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">{l.label}</text>
        ))}
      </svg>

      {/* Tooltip box */}
      {tooltip && (
        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-lg bg-white px-3 py-1.5 shadow-md ring-1 ring-slate-200 dark:bg-zinc-800 dark:ring-zinc-700">
          <p className="text-xs font-semibold text-lavender-600 dark:text-lavender-400">
            {tooltip.value.toLocaleString('es-ES')} ₩
          </p>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400">{tooltip.date}</p>
        </div>
      )}

      {/* Min/Max footer */}
      <div className="mt-1 flex justify-between px-1 text-[10px] text-slate-400 dark:text-zinc-500">
        <span>Mín: {minVal.toLocaleString('es-ES')} ₩</span>
        <span>Últ: <strong className="text-lavender-500">{values[values.length - 1].toLocaleString('es-ES')} ₩</strong></span>
        <span>Máx: {maxVal.toLocaleString('es-ES')} ₩</span>
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────
export default function CurrencyConverter({ rates, onUpdateRates, onRefreshRates, ratesStatus }) {
  const [eurInput, setEurInput] = useState('')
  const [krwInput, setKrwInput] = useState('')
  const [editingRates, setEditingRates] = useState(false)
  const [draftRates, setDraftRates] = useState(rates)

  useEffect(() => {
    setDraftRates(rates)
  }, [rates])

  function handleEurChange(e) {
    const v = e.target.value
    setEurInput(v)
    const eur = parseLooseNumber(v)
    if (!isNaN(eur)) {
      setKrwInput(Math.round(eur * rates.eur_krw).toString())
    } else {
      setKrwInput('')
    }
  }

  function handleKrwChange(e) {
    const v = e.target.value
    setKrwInput(v)
    const krw = parseLooseNumber(v)
    if (!isNaN(krw)) {
      setEurInput((krw / rates.eur_krw).toFixed(2))
    } else {
      setEurInput('')
    }
  }

  function saveRates() {
    onUpdateRates(draftRates)
    setEditingRates(false)
    if (eurInput) {
      setKrwInput(Math.round(parseLooseNumber(eurInput) * draftRates.eur_krw).toString())
    } else if (krwInput) {
      setEurInput((parseLooseNumber(krwInput) / draftRates.eur_krw).toFixed(2))
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Conversor ── */}
      <div className="rounded-2xl bg-lavender-500 p-5 shadow-sm ring-1 ring-lavender-400 dark:bg-lavender-600 dark:ring-lavender-500">
        <h2 className="mb-4 text-lg font-semibold text-white">💱 Conversor de Divisas</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-white">€ Euros (EUR)</label>
            <div className="md:hidden">
              <AmountKeypadField
                name="eur"
                label=""
                value={eurInput}
                onChange={handleEurChange}
                placeholder="0.00"
                unit="EUR"
                keys={EUR_KEYPAD_KEYS}
                triggerClassName="border-white/60 bg-white text-slate-900"
              />
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={eurInput}
              onChange={handleEurChange}
              placeholder="0.00"
              className="hidden w-full rounded-xl border border-white/60 bg-white px-4 py-3 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-white md:block"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white">₩ Wones (KRW)</label>
            <div className="md:hidden">
              <AmountKeypadField
                name="krw"
                label=""
                value={krwInput}
                onChange={handleKrwChange}
                placeholder="0"
                unit="KRW"
                triggerClassName="border-white/60 bg-white text-slate-900"
              />
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={krwInput}
              onChange={handleKrwChange}
              placeholder="0"
              className="hidden w-full rounded-xl border border-white/60 bg-white px-4 py-3 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-white md:block"
            />
          </div>
        </div>

      </div>

      {/* ── Tipos de cambio + Gráfica ── */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-zinc-700">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">⚙️ Tipos de cambio</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Revisa aquí la tasa actual y actualízala sin salir de la pantalla.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefreshRates}
              disabled={ratesStatus?.loading}
              className="rounded-lg bg-lavender-50 px-3 py-2 text-xs font-medium text-lavender-700 hover:bg-lavender-100 disabled:opacity-50 dark:bg-lavender-950/30 dark:text-lavender-200"
            >
              {ratesStatus?.loading ? 'Actualizando…' : '🔄 Actualizar'}
            </button>

            {!editingRates ? (
              <button
                onClick={() => {
                  setDraftRates(rates)
                  setEditingRates(true)
                }}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-700/70"
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  onClick={saveRates}
                  className="rounded-lg bg-lavender-500 px-3 py-2 text-xs font-medium text-white hover:bg-lavender-600"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingRates(false)}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Rate cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">1 € en KRW</p>
            {editingRates ? (
              <input
                type="number"
                value={draftRates.eur_krw}
                onChange={(e) =>
                  setDraftRates((p) => ({ ...p, eur_krw: Number(e.target.value) }))
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            ) : (
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-zinc-50">
                {rates.eur_krw.toLocaleString('es-ES')}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Estado</p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-zinc-50">
              {rates.source || 'manual'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Última actualización: {formatLastUpdated(rates.lastUpdated)}
            </p>
          </div>
        </div>

        {ratesStatus?.error && (
          <p className="mt-3 rounded-lg bg-lavender-50 px-3 py-2 text-xs text-lavender-700 dark:bg-lavender-950/30 dark:text-lavender-200">
            {ratesStatus.error}
          </p>
        )}

        {/* ── Gráfica histórica ── */}
        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-zinc-400">
            📈 Evolución EUR → KRW (últimos 30 días)
          </p>
          <RateChart refreshKey={rates.lastUpdated} />
        </div>
      </div>
    </div>
  )
}

