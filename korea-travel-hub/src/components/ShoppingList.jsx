import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import { vibrate } from '../utils/haptics'
import { ListSkeleton } from './Skeletons'
import AmountKeypadField from './AmountKeypadField'

const INITIAL_FORM = {
  item_name: '',
  estimated_price_krw: '',
}

// ── Componente con swipe ────────────────────────────────────────────────────
function SwipeableItem({ item, isChecking, onMoveToExpenses, onDelete }) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const ptr = useRef({ startX: null, startY: null, captured: false })

  const THRESHOLD = 80
  const clamped = Math.max(-130, Math.min(130, offsetX))
  const rightPct = Math.min(1, Math.max(0, clamped / THRESHOLD))
  const leftPct  = Math.min(1, Math.max(0, -clamped / THRESHOLD))

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    ptr.current = { startX: e.clientX, startY: e.clientY, captured: false }
  }

  function onPointerMove(e) {
    const { startX, startY, captured } = ptr.current
    if (startX === null) return

    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!captured) {
      // Si el movimiento vertical gana → dejamos hacer scroll
      if (Math.abs(dy) > Math.abs(dx) + 5) {
        ptr.current.startX = null
        return
      }
      // Si el horizontal supera 8px → capturamos el puntero
      if (Math.abs(dx) > 8) {
        e.currentTarget.setPointerCapture(e.pointerId)
        ptr.current.captured = true
        setDragging(true)
      }
      return
    }

    setOffsetX(dx)
  }

  function onPointerUp(e) {
    const { startX, captured } = ptr.current
    ptr.current = { startX: null, startY: null, captured: false }
    setDragging(false)
    if (!captured || startX === null) return

    const dx = e.clientX - startX
    setOffsetX(0)

    if (dx > THRESHOLD)        onMoveToExpenses(item)
    else if (dx < -THRESHOLD)  onDelete(item.id)
  }

  function onPointerCancel() {
    ptr.current = { startX: null, startY: null, captured: false }
    setDragging(false)
    setOffsetX(0)
  }

  return (
    <li className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700">
      {/* Fondo derecha – mover a gastos */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center gap-2 rounded-xl bg-emerald-500 px-5"
        style={{ opacity: rightPct }}
      >
        <span className="text-lg leading-none text-white">✓</span>
        <span className="text-sm font-bold text-white">A gastos</span>
      </div>

      {/* Fondo izquierda – eliminar */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-end gap-2 rounded-xl bg-red-500 px-5"
        style={{ opacity: leftPct }}
      >
        <span className="text-sm font-bold text-white">Eliminar</span>
        <span className="text-lg leading-none text-white">✕</span>
      </div>

      {/* Contenido deslizable */}
      <div
        className={`relative flex select-none flex-col gap-3 bg-white p-3 dark:bg-zinc-900/80 sm:flex-row sm:items-center${
          !dragging ? ' transition-transform duration-200 ease-out' : ''
        }`}
        style={{ transform: `translateX(${clamped}px)`, touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <button
          type="button"
          onClick={() => onMoveToExpenses(item)}
          disabled={isChecking}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 hover:border-emerald-500 disabled:opacity-50 dark:border-zinc-600"
          title="Tachar y mover a gastos"
        >
          {isChecking && (
            <span className="text-xs text-slate-400 dark:text-zinc-500">…</span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-zinc-50">{item.item_name}</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500">
            {Number(item.estimated_price_krw).toLocaleString('es-ES')} KRW
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="shrink-0 self-end text-lg text-slate-300 hover:text-red-500 dark:hover:text-red-400 sm:self-auto"
          title="Eliminar"
        >
          ×
        </button>
      </div>
    </li>
  )
}

// ── Componente principal ────────────────────────────────────────────────────
export default function ShoppingList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingId, setCheckingId] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)

  useEffect(() => {
    void fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error: e } = await supabase
      .from('shopping_list')
      .select('id, item_name, estimated_price_krw, created_at')
      .eq('is_purchased', false)
      .order('created_at', { ascending: false })

    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }

    setItems(data ?? [])
    setLoading(false)
  }

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError('')
    setInfo('')

    if (!form.item_name.trim()) {
      setError('El nombre del producto es obligatorio.')
      return
    }

    if (!form.estimated_price_krw || Number(form.estimated_price_krw) <= 0) {
      setError('La cantidad estimada debe ser mayor que 0.')
      return
    }

    setSaving(true)

    const payload = {
      item_name: form.item_name.trim(),
      estimated_price_krw: Number(form.estimated_price_krw),
      is_purchased: false,
    }

    const { data, error: e } = await supabase
      .from('shopping_list')
      .insert(payload)
      .select('id, item_name, estimated_price_krw, created_at')
      .single()

    if (e) {
      setError(e.message)
      setSaving(false)
      return
    }

    setItems((prev) => [data, ...prev])
    setForm(INITIAL_FORM)
    setSaving(false)
    toast.success('Producto añadido a la lista')
    vibrate(12)
  }

  async function handleCheckAndMove(item) {
    setError('')
    setInfo('')
    setCheckingId(item.id)

    const amount = Number(item.estimated_price_krw)
    if (!amount || amount <= 0) {
      setError('Ese producto no tiene una cantidad válida para mover a gastos.')
      setCheckingId('')
      return
    }

    const { error: expenseError } = await supabase.from('expenses').insert({
      expense_date: new Date().toISOString().slice(0, 10),
      category: 'Compras',
      amount_krw: amount,
      notes: item.item_name,
      status: 'pending',
    })

    if (expenseError) {
      setError(expenseError.message)
      setCheckingId('')
      return
    }

    const { error: updateError } = await supabase
      .from('shopping_list')
      .update({
        is_purchased: true,
        purchased_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (updateError) {
      setError(updateError.message)
      setCheckingId('')
      return
    }

    setItems((prev) => prev.filter((row) => row.id !== item.id))
    setInfo(`"${item.item_name}" se movió a gastos.`)
    setCheckingId('')
    toast.success(`"${item.item_name}" movido a gastos`)
    vibrate(18)
  }

  async function handleDelete(id) {
    const { error: e } = await supabase.from('shopping_list').delete().eq('id', id)
    if (e) {
      setError(e.message)
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    toast.success('Producto eliminado')
    vibrate(12)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-zinc-50">🛍️ Lista de compras</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-zinc-400">
          Apunta productos pendientes. Desliza{' '}
          <span className="font-medium text-emerald-600">→ derecha</span> para pasar a gastos o{' '}
          <span className="font-medium text-red-500">← izquierda</span> para eliminar.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm text-slate-700 dark:text-zinc-200">Producto</span>
            <input
              type="text"
              name="item_name"
              value={form.item_name}
              onChange={handleChange}
              placeholder="Sunscreen Anessa, labial, etc."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              required
            />
          </label>

          <AmountKeypadField
            name="estimated_price_krw"
            label="Cantidad estimada (KRW)"
            value={form.estimated_price_krw}
            onChange={handleChange}
            placeholder="12.000"
          />

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-lavender-500 px-5 py-2 text-sm font-medium text-white hover:bg-lavender-600 disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Guardando…' : 'Agregar a la lista'}
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
        )}
        {info && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{info}</p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
        {loading ? (
          <ListSkeleton rows={4} />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-zinc-400">No tienes productos pendientes.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <SwipeableItem
                key={item.id}
                item={item}
                isChecking={checkingId === item.id}
                onMoveToExpenses={handleCheckAndMove}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <p className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-300 dark:text-zinc-600">
            <span>← Eliminar</span>
            <span>·</span>
            <span>A gastos →</span>
          </p>
        )}
      </div>
    </div>
  )
}

