import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import { vibrate } from '../utils/haptics'
import CardSkeleton from './Skeletons'

const PLACE_CATEGORIES = ['Cultura', 'Cafés', 'Vistas', 'Compras', 'Restaurantes', 'Ocio', 'Otro']
const ZONES = [
  'Hongdae',
  'Anguk',
  'Insadong',
  'Myeongdong',
  'Gangnam',
  'Itaewon',
  'Dongdaemun',
  'Busan',
  'Gyeongju',
  'Otro',
]

const CAT_COLORS = {
  Cultura: 'bg-amber-100 text-amber-700',
  Cafés: 'bg-brown-100 text-yellow-800',
  Vistas: 'bg-sky-100 text-sky-700',
  Compras: 'bg-pink-100 text-pink-700',
  Restaurantes: 'bg-orange-100 text-orange-700',
  Ocio: 'bg-purple-100 text-purple-700',
  Otro: 'bg-slate-100 text-slate-700',
}

export default function PlacesToVisit() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterZone, setFilterZone] = useState('all')
  const [filterCat, setFilterCat] = useState('all')

  const [form, setForm] = useState({ name: '', district: '', category: '', notes: '' })

  useEffect(() => {
    void fetchPlaces()
  }, [])

  async function fetchPlaces() {
    setLoading(true)
    const { data, error: e } = await supabase
      .from('places')
      .select('id, name, district, category, status, notes, created_at')
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }
    setPlaces(data ?? [])
    setLoading(false)
  }

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre del lugar es obligatorio.')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: e } = await supabase
      .from('places')
      .insert({
        name: form.name.trim(),
        city: 'Korea',
        district: form.district || null,
        category: form.category || null,
        notes: form.notes.trim() || null,
        status: 'pendiente',
      })
      .select('id, name, district, category, status, notes, created_at')
      .single()
    if (e) {
      setError(e.message)
      setSaving(false)
      return
    }
    setPlaces((p) => [data, ...p])
    setForm({ name: '', district: '', category: '', notes: '' })
    setSaving(false)
    toast.success('Lugar añadido')
    vibrate(15)
  }

  async function toggleVisited(place) {
    const newStatus = place.status === 'visitado' ? 'pendiente' : 'visitado'
    const { error: e } = await supabase
      .from('places')
      .update({ status: newStatus })
      .eq('id', place.id)
    if (e) {
      setError(e.message)
      return
    }
    setPlaces((p) => p.map((pl) => (pl.id === place.id ? { ...pl, status: newStatus } : pl)))
    toast.success(newStatus === 'visitado' ? 'Marcado como visitado' : 'Marcado como pendiente')
    vibrate(10)
  }

  async function handleDelete(id) {
    const { error: e } = await supabase.from('places').delete().eq('id', id)
    if (e) {
      setError(e.message)
      return
    }
    setPlaces((p) => p.filter((pl) => pl.id !== id))
    toast.success('Lugar eliminado')
    vibrate(15)
  }

  const visited = places.filter((p) => p.status === 'visitado').length

  // Dynamic filter options from actual data
  const availableZones = useMemo(
    () => [...new Set(places.map((p) => p.district).filter(Boolean))],
    [places],
  )
  const availableCats = useMemo(
    () => [...new Set(places.map((p) => p.category).filter(Boolean))],
    [places],
  )

  const filtered = places.filter((pl) => {
    const statusMatch = filterStatus === 'all' || pl.status === filterStatus
    const zoneMatch = filterZone === 'all' || pl.district === filterZone
    const catMatch = filterCat === 'all' || pl.category === filterCat
    return statusMatch && zoneMatch && catMatch
  })

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-zinc-50">📍 Añadir lugar</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700 dark:text-zinc-200 sm:col-span-2">
            Nombre del lugar
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Gyeongbokgung Palace, Blue Bottle Coffee…"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-50"
              required
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-zinc-200">
            Barrio / Zona
            <select
              name="district"
              value={form.district}
              onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-50"
            >
              <option value="">Selecciona…</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-zinc-200">
            Categoría
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-50"
            >
              <option value="">Selecciona…</option>
              {PLACE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-zinc-200 sm:col-span-2">
            Nota
            <input
              type="text"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Abrir desde las 9:00, entrada gratuita…"
               className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-lavender-500 px-5 py-2 text-sm font-medium text-white hover:bg-lavender-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Guardando…' : 'Añadir lugar'}
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
        )}
      </div>

      {/* Progress bar */}
      {places.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl bg-white px-5 py-3 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700 sm:flex-row sm:items-center">
          <span className="text-slate-500">{places.length - visited} por visitar</span>
          <span className="font-medium text-emerald-600">{visited} visitados</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${places.length ? (visited / places.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-50"
        >
          <option value="all">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="visitado">Visitados</option>
        </select>

        {availableZones.length > 0 && (
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-50"
          >
            <option value="all">Todas las zonas</option>
            {availableZones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        )}

        {availableCats.length > 0 && (
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-50"
          >
            <option value="all">Todas las categorías</option>
            {availableCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Places list */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
        {loading ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay lugares para los filtros seleccionados.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((pl) => (
              <li
                key={pl.id}
                className={`flex flex-col gap-3 rounded-xl border p-3 transition-colors sm:flex-row sm:items-start ${
                  pl.status === 'visitado'
                    ? 'border-slate-100 bg-slate-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40'
                    : 'border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/60'
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleVisited(pl)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    pl.status === 'visitado'
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-slate-300 hover:border-lavender-400 dark:border-zinc-600 dark:hover:border-lavender-400'
                  }`}
                >
                  {pl.status === 'visitado' && <span className="text-xs text-white">✓</span>}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      pl.status === 'visitado'
                        ? 'text-slate-400 line-through dark:text-zinc-500'
                        : 'text-slate-900 dark:text-zinc-50'
                    }`}
                  >
                    {pl.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pl.district && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
                        {pl.district}
                      </span>
                    )}
                    {pl.category && (
                      <span
                          className={`rounded-full px-2 py-0.5 text-xs ${CAT_COLORS[pl.category] ?? 'bg-slate-100 text-slate-700 dark:bg-zinc-800/80 dark:text-zinc-200'}`}
                      >
                        {pl.category}
                      </span>
                    )}
                  </div>
                  {pl.notes && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-zinc-400">{pl.notes}</p>
                  )}
                </div>

                <button onClick={() => handleDelete(pl.id)} className="self-end shrink-0 text-lg text-slate-300 hover:text-red-500 dark:hover:text-red-400 sm:self-auto">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

