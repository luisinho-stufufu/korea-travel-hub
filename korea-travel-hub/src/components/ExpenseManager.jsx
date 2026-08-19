import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import { vibrate } from '../utils/haptics'
import AmountKeypadField from './AmountKeypadField'
import ReceiptUploader from './ReceiptUploader'

const CATEGORIES = ['Comida', 'Transporte', 'Compras', 'Ocio', 'Alojamiento', 'Otros']

const CAT_STYLES = {
  Comida:      { pill: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  Transporte:  { pill: 'bg-blue-100   text-blue-700',   dot: 'bg-blue-400'   },
  Compras:     { pill: 'bg-pink-100   text-pink-700',   dot: 'bg-pink-400'   },
  Ocio:        { pill: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  Alojamiento: { pill: 'bg-teal-100   text-teal-700',   dot: 'bg-teal-400'   },
  Otros:       { pill: 'bg-slate-100  text-slate-700',  dot: 'bg-slate-400'  },
}

const EXPENSE_STATUS = {
  pending: {
    label: 'Pendiente',
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  },
  confirmed: {
    label: 'Confirmado',
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
}

function normalizeStatus(value) {
  return value === 'confirmed' ? 'confirmed' : 'pending'
}

const DEFAULT_FORM = {
  expense_date: new Date().toISOString().slice(0, 10),
  category: '',
  amount_krw: '',
  notes: '',
  receipt_url: '',
}

/* ─── Subcomponente: formulario reutilizable en sidebar y modal ─── */
function AddExpenseForm({ form, onChange, onSubmit, saving, error, rates }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-zinc-400">Fecha</label>
        <input
          type="date" name="expense_date" value={form.expense_date} onChange={onChange}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900
                     focus:outline-none focus:ring-2 focus:ring-lavender-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-zinc-400">Categoría</label>
        <select
          name="category" value={form.category} onChange={onChange}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900
                     focus:outline-none focus:ring-2 focus:ring-lavender-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Sin categoría (se guarda como Otros)</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="md:hidden">
        <AmountKeypadField
          name="amount_krw"
          label="Cantidad (₩ KRW)"
          value={form.amount_krw}
          onChange={onChange}
          placeholder="12.000"
          helper={
            form.amount_krw
              ? `≈ ${(Number(form.amount_krw) / rates.eur_krw).toFixed(2)} €`
              : 'Opcional'
          }
        />
      </div>

      <div className="hidden md:block">
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-zinc-400">Cantidad (₩ KRW)</label>
        <input
          type="text"
          inputMode="numeric"
          name="amount_krw"
          value={form.amount_krw}
          onChange={onChange}
          placeholder="12.000"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lavender-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
          {form.amount_krw
            ? `≈ ${(Number(form.amount_krw) / rates.eur_krw).toFixed(2)} €`
            : 'Opcional'}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-zinc-400">Motivo</label>
        <input
          type="text" name="notes" value={form.notes} onChange={onChange}
          placeholder="Bibimbap en Myeongdong"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900
                     focus:outline-none focus:ring-2 focus:ring-lavender-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          required
        />
      </div>

      {!form.amount_krw && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
          Si no indicas cantidad, se guardará como 0 KRW.
        </p>
      )}

      {form.receipt_url && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Ticket adjunto correctamente.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</p>
      )}

      <button
        type="submit" disabled={saving}
        className="w-full rounded-xl bg-lavender-500 py-2.5 text-sm font-semibold text-white
                   transition-colors hover:bg-lavender-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Guardando…' : '+ Añadir gasto'}
      </button>
    </form>
  )
}

/* ─── Skeleton row para loading ─── */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded-full bg-slate-100" />
          <div className="h-3 w-36 rounded bg-slate-50" />
        </div>
        <div className="h-5 w-24 rounded bg-slate-100" />
      </div>
    </div>
  )
}

function SwipeDeleteExpenseCard({ expense, categoryStyle, statusStyle, rates, onConfirm, onViewTicket, onEdit, onDelete }) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ startX: null, startY: null, captured: false })

  const DELETE_THRESHOLD = 90
  const clamped = Math.max(-130, Math.min(0, offsetX))
  const leftPct = Math.min(1, Math.max(0, -clamped / DELETE_THRESHOLD))

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, captured: false }
  }

  function onPointerMove(e) {
    const { startX, startY, captured } = dragRef.current
    if (startX === null) return

    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!captured) {
      if (Math.abs(dy) > Math.abs(dx) + 6) {
        dragRef.current.startX = null
        return
      }
      if (Math.abs(dx) > 8) {
        e.currentTarget.setPointerCapture(e.pointerId)
        dragRef.current.captured = true
        setDragging(true)
      }
      return
    }

    setOffsetX(Math.min(0, dx))
  }

  function onPointerUp(e) {
    const { startX, captured } = dragRef.current
    dragRef.current = { startX: null, startY: null, captured: false }
    setDragging(false)
    if (!captured || startX === null) return

    const dx = e.clientX - startX
    setOffsetX(0)
    if (dx < -DELETE_THRESHOLD) onDelete(expense.id)
  }

  function onPointerCancel() {
    dragRef.current = { startX: null, startY: null, captured: false }
    setDragging(false)
    setOffsetX(0)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-100 dark:ring-zinc-700">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-2xl bg-red-500 px-5"
        style={{ opacity: leftPct }}
      >
        <span className="text-sm font-semibold text-white">Eliminar</span>
      </div>

      <div
        className={`relative bg-white p-4 dark:bg-zinc-900/75${!dragging ? ' transition-transform duration-200 ease-out' : ''}`}
        style={{ transform: `translateX(${clamped}px)`, touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={`inline-flex min-w-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyle.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${categoryStyle.dot}`} />
              {expense.category}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle.pill}`}>
              {statusStyle.label}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {normalizeStatus(expense.status) === 'pending' && (
              <button
                type="button"
                onClick={() => onConfirm(expense.id)}
                className="inline-flex h-7 items-center justify-center rounded-full bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
                title="Confirmar gasto"
              >
                ✅
              </button>
            )}
            {expense.receipt_url && (
              <button
                type="button"
                onClick={() => onViewTicket(expense.receipt_url)}
                className="inline-flex h-7 items-center justify-center rounded-full bg-zinc-100 px-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                title="Ver ticket"
              >
                🧾
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="inline-flex h-7 items-center justify-center rounded-full bg-lavender-50 px-2 text-xs font-semibold text-lavender-700 hover:bg-lavender-100 dark:bg-lavender-950/30 dark:text-lavender-200"
              title="Editar gasto"
            >
              ✏️
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {expense.notes && (
              <p className="text-sm font-medium text-slate-800 wrap-break-word dark:text-zinc-50">{expense.notes}</p>
            )}
            <p className="mt-1 text-xs text-slate-400 dark:text-zinc-400">{expense.expense_date}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold text-slate-900 dark:text-zinc-50">
              {Number(expense.amount_krw).toLocaleString('es-ES')} ₩
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-400">
              {(Number(expense.amount_krw) / rates.eur_krw).toFixed(2)} €
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Componente principal ─── */
export default function ExpenseManager({ rates }) {
  const [expenses, setExpenses]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterCat, setFilterCat]     = useState('all')
  const [showModal, setShowModal]     = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [viewerUrl, setViewerUrl]     = useState('')
  const [editingExpense, setEditingExpense] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [showEditReceipt, setShowEditReceipt] = useState(false)
  const [editForm, setEditForm] = useState({
    expense_date: '',
    category: '',
    amount_krw: '',
    notes: '',
    receipt_url: '',
    status: 'pending',
  })
  const [form, setForm]               = useState(DEFAULT_FORM)

  useEffect(() => { void fetchExpenses() }, [])

  async function fetchExpenses() {
    setLoading(true)
    const { data, error: e } = await supabase
      .from('expenses')
      .select('id, expense_date, category, amount_krw, notes, receipt_url, status, created_at')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (e) { setError(e.message); setLoading(false); return }
    setExpenses((data ?? []).map((row) => ({ ...row, status: normalizeStatus(row.status) })))
    setLoading(false)
  }

  const months = useMemo(() => {
    const set = new Set(expenses.map((e) => e.expense_date.slice(0, 7)))
    return Array.from(set).sort()
  }, [expenses])

  const filtered = useMemo(() =>
    expenses.filter((e) => {
      const sOk = filterStatus === 'all' || normalizeStatus(e.status) === filterStatus
      const mOk = filterMonth === 'all' || e.expense_date.startsWith(filterMonth)
      const cOk = filterCat   === 'all' || e.category === filterCat
      return sOk && mOk && cOk
    }),
    [expenses, filterStatus, filterMonth, filterCat],
  )

  const totalKrw = filtered.reduce((acc, e) => acc + Number(e.amount_krw), 0)
  const totalEur = totalKrw / rates.eur_krw

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  function handleExtractData(extractedData) {
    setForm((prev) => ({
      ...prev,
      ...(extractedData.amount_krw && { amount_krw: extractedData.amount_krw.toString() }),
      ...(extractedData.expense_date && { expense_date: extractedData.expense_date }),
    }))
    setShowReceipt(false)
  }

  function handleReceiptUploaded(payload) {
    if (!payload?.url) return
    setForm((prev) => ({ ...prev, receipt_url: payload.url }))
    toast.success('Ticket adjuntado')
    vibrate(12)
  }

  function handleReceiptSummary(summary) {
    if (!summary) return
    setForm((prev) => ({
      ...prev,
      notes: prev.notes.trim() ? prev.notes : summary,
    }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.notes.trim()) {
      setError('El motivo es obligatorio.')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: e } = await supabase
      .from('expenses')
      .insert({
        expense_date: form.expense_date || new Date().toISOString().slice(0, 10),
        category:     form.category || 'Otros',
        amount_krw:   form.amount_krw ? Number(form.amount_krw) : 0,
        notes:        form.notes.trim(),
        receipt_url:  form.receipt_url || null,
        status:       'pending',
      })
      .select('id, expense_date, category, amount_krw, notes, receipt_url, status, created_at')
      .single()
    if (e) { setError(e.message); setSaving(false); return }
    setExpenses((p) => [data, ...p])
    setForm(DEFAULT_FORM)
    setSaving(false)
    setShowModal(false)
    setShowReceipt(false)
    toast.success('Gasto añadido')
    vibrate(18)
  }

  function openEdit(expense) {
    setEditingExpense(expense)
    setShowEditReceipt(false)
    setEditForm({
      expense_date: expense.expense_date || new Date().toISOString().slice(0, 10),
      category: expense.category || 'Otros',
      amount_krw: expense.amount_krw?.toString?.() ?? '',
      notes: expense.notes || '',
      receipt_url: expense.receipt_url || '',
      status: normalizeStatus(expense.status),
    })
    setError('')
  }

  function handleEditChange(ev) {
    const { name, value } = ev.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleEditReceiptUploaded(payload) {
    if (!payload?.url) return
    setEditForm((prev) => ({ ...prev, receipt_url: payload.url }))
    setShowEditReceipt(false)
  }

  function handleEditExtractData(extractedData) {
    setEditForm((prev) => ({
      ...prev,
      ...(extractedData.amount_krw && { amount_krw: extractedData.amount_krw.toString() }),
      ...(extractedData.expense_date && { expense_date: extractedData.expense_date }),
    }))
  }

  function handleEditReceiptSummary(summary) {
    if (!summary) return
    setEditForm((prev) => ({
      ...prev,
      notes: prev.notes.trim() ? prev.notes : summary,
    }))
  }

  async function handleConfirmExpense(id) {
    const { data, error: updateError } = await supabase
      .from('expenses')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select('id, expense_date, category, amount_krw, notes, receipt_url, status, created_at')
      .single()

    if (updateError) {
      setError(updateError.message)
      return
    }

    setExpenses((prev) => prev.map((row) => (row.id === id ? { ...data, status: normalizeStatus(data.status) } : row)))
    toast.success('Gasto confirmado')
    vibrate(12)
  }

  async function handleUpdateExpense(ev) {
    ev.preventDefault()
    if (!editingExpense) return

    if (!editForm.notes.trim()) {
      setError('El motivo es obligatorio.')
      return
    }

    setUpdating(true)

    const payload = {
      expense_date: editForm.expense_date || new Date().toISOString().slice(0, 10),
      category: editForm.category || 'Otros',
      amount_krw: editForm.amount_krw ? Number(editForm.amount_krw) : 0,
      notes: editForm.notes.trim(),
      receipt_url: editForm.receipt_url || null,
      status: normalizeStatus(editForm.status),
    }

    const { data, error: updateError } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', editingExpense.id)
      .select('id, expense_date, category, amount_krw, notes, receipt_url, status, created_at')
      .single()

    if (updateError) {
      setError(updateError.message)
      setUpdating(false)
      return
    }

    setExpenses((prev) => prev.map((row) => (row.id === data.id ? { ...data, status: normalizeStatus(data.status) } : row)))
    setEditingExpense(null)
    setShowEditReceipt(false)
    setUpdating(false)
    toast.success('Gasto actualizado')
    vibrate(12)
  }

  async function handleDelete(id) {
    const { error: e } = await supabase.from('expenses').delete().eq('id', id)
    if (e) { setError(e.message); return }
    setExpenses((p) => p.filter((ex) => ex.id !== id))
    toast.success('Gasto eliminado')
    vibrate(15)
  }

  function monthLabel(ym, idx) {
    const [y, m] = ym.split('-')
    const raw = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-ES', {
      month: 'long', year: 'numeric',
    })
    return `Mes ${idx + 1} – ${raw.charAt(0).toUpperCase() + raw.slice(1)}`
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ▓▓▓ MOBILE (md:hidden) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ */}
      <div className="space-y-3 pb-28 md:hidden">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-lavender-500 p-4 text-white shadow-sm">
            <p className="text-xs font-medium opacity-75">Total KRW</p>
            <p className="mt-1 text-lg font-bold leading-tight">
              {totalKrw.toLocaleString('es-ES')} ₩
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-zinc-700">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Total EUR</p>
            <p className="mt-1 text-lg font-bold leading-tight text-slate-900 dark:text-zinc-50">
              {totalEur.toFixed(2)} €
            </p>
          </div>
        </div>

        {/* Filter chips row */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['pending', 'confirmed', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition ${
                filterStatus === status
                  ? 'bg-lavender-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-lavender-300 dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:ring-lavender-400'
              }`}
            >
              {status === 'pending' ? 'Pendientes' : status === 'confirmed' ? 'Confirmados' : 'Todos'}
            </button>
          ))}

          {/* Month selector */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2
                       text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-lavender-300"
          >
            <option value="all">Todos los meses</option>
            {months.map((m, i) => (
              <option key={m} value={m}>{monthLabel(m, i)}</option>
            ))}
          </select>

          {/* Category chips */}
          {['all', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition
                          ${filterCat === cat
                            ? 'bg-lavender-500 text-white shadow-sm'
                            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-lavender-300 dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:ring-lavender-400'}`}
            >
              {cat === 'all' ? 'Todas' : cat}
            </button>
          ))}
        </div>

        {/* Card list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl">💸</span>
            <p className="mt-4 font-semibold text-slate-700">Sin gastos</p>
            <p className="mt-1 text-sm text-slate-400">
              {filterStatus !== 'all' || filterCat !== 'all' || filterMonth !== 'all'
                ? 'Prueba a cambiar los filtros.'
                : 'Pulsa + para registrar tu primer gasto.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ex) => {
              const s = CAT_STYLES[ex.category] ?? CAT_STYLES.Otros
              const status = EXPENSE_STATUS[normalizeStatus(ex.status)]
              return (
                <SwipeDeleteExpenseCard
                  key={ex.id}
                  expense={ex}
                  categoryStyle={s}
                  statusStyle={status}
                  rates={rates}
                  onConfirm={handleConfirmExpense}
                  onViewTicket={setViewerUrl}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              )
            })}
            <p className="px-1 text-center text-[11px] text-slate-400 dark:text-zinc-500">
              Desliza cada gasto a la izquierda para eliminarlo.
            </p>
          </div>
        )}
      </div>

      {/* FAB ─ botón flotante */}
      <button
        onClick={() => { setError(''); setShowModal(true) }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center
                   rounded-full bg-lavender-500 text-white shadow-xl
                   hover:bg-lavender-600 active:scale-95 transition-transform md:hidden"
        aria-label="Añadir gasto"
      >
        <span className="text-3xl leading-none">+</span>
      </button>

      {/* Bottom-sheet modal (mobile) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          {/* Sheet */}
          <div className="relative max-h-[calc(100vh-1rem)] overflow-y-auto rounded-t-3xl bg-white px-4 pb-8 pt-5 shadow-2xl dark:bg-zinc-900 sm:px-6">
            {/* Handle bar */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700" />
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-50">Nuevo gasto</h2>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full
                           text-slate-400 hover:bg-slate-100 transition-colors dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                ✕
              </button>
            </div>
            <AddExpenseForm
              form={form}
              onChange={handleChange}
              onSubmit={handleSubmit}
              saving={saving}
              error={error}
              rates={rates}
            />

            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-zinc-700">
              {!showReceipt && (
                <button
                  type="button"
                  onClick={() => setShowReceipt(true)}
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                             text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  📎 Adjuntar o escanear ticket
                </button>
              )}

              {showReceipt && (
                <ReceiptUploader
                  onExtractData={handleExtractData}
                  onUploadSuccess={handleReceiptUploaded}
                  onSummaryGenerated={handleReceiptSummary}
                  rates={rates}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {viewerUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 sm:p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-zinc-700">
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">Ticket adjunto</p>
              <button
                type="button"
                onClick={() => setViewerUrl('')}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Cerrar visor"
              >
                ✕
              </button>
            </div>
            {viewerUrl.toLowerCase().includes('.pdf') ? (
              <iframe src={viewerUrl} title="Ticket PDF" className="h-[75vh] w-full" />
            ) : (
              <img src={viewerUrl} alt="Ticket" className="max-h-[75vh] w-full object-contain" />
            )}
          </div>
        </div>
      )}

      {editingExpense && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">Editar gasto</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null)
                  setShowEditReceipt(false)
                }}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Cerrar editor"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="space-y-3">
              <label className="block text-sm text-slate-700 dark:text-zinc-200">
                Fecha
                <input
                  type="date"
                  name="expense_date"
                  value={editForm.expense_date}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-50"
                />
              </label>

              <label className="block text-sm text-slate-700 dark:text-zinc-200">
                Categoría
                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-50"
                >
                  <option value="">Sin categoría (se guarda como Otros)</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-700 dark:text-zinc-200">
                Estado
                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-50"
                >
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                </select>
              </label>

              <div className="md:hidden">
                <AmountKeypadField
                  name="amount_krw"
                  label="Cantidad (KRW)"
                  value={editForm.amount_krw}
                  onChange={handleEditChange}
                  placeholder="Opcional"
                />
              </div>

              <div className="hidden md:block">
                <label className="mb-1 block text-sm text-slate-700 dark:text-zinc-200">Cantidad (KRW)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="amount_krw"
                  value={editForm.amount_krw}
                  onChange={handleEditChange}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-50"
                />
              </div>

              <label className="block text-sm text-slate-700 dark:text-zinc-200">
                Motivo
                <input
                  type="text"
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditChange}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-50"
                />
              </label>

              <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-zinc-700">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">Ticket</p>
                  <div className="flex items-center gap-2">
                    {editForm.receipt_url && (
                      <button
                        type="button"
                        onClick={() => setViewerUrl(editForm.receipt_url)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Ver adjunto
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowEditReceipt((prev) => !prev)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {showEditReceipt ? 'Ocultar' : 'Adjuntar'}
                    </button>
                  </div>
                </div>

                {editForm.receipt_url && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">Ticket adjunto correctamente.</p>
                )}

                {showEditReceipt && (
                  <ReceiptUploader
                    onUploadSuccess={handleEditReceiptUploaded}
                    onExtractData={handleEditExtractData}
                    onSummaryGenerated={handleEditReceiptSummary}
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-lg bg-lavender-500 px-4 py-2 text-sm font-medium text-white hover:bg-lavender-600 disabled:opacity-50"
                >
                  {updating ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ▓▓▓ DESKTOP (hidden md:flex) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ */}
      <div className="hidden md:flex gap-6 items-start">

        {/* ── Sidebar ── */}
        <aside className="w-72 shrink-0 space-y-4 md:sticky md:top-24 lg:top-[104px]">

          {/* Form panel */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Añadir gasto
            </p>
            <AddExpenseForm
              form={form}
              onChange={handleChange}
              onSubmit={handleSubmit}
              saving={saving}
              error={error}
              rates={rates}
            />

            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-zinc-700">
              {!showReceipt && (
                <button
                  type="button"
                  onClick={() => setShowReceipt(true)}
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  📎 Adjuntar o escanear ticket
                </button>
              )}

              {showReceipt && (
                <ReceiptUploader
                  onExtractData={handleExtractData}
                  onUploadSuccess={handleReceiptUploaded}
                  onSummaryGenerated={handleReceiptSummary}
                  rates={rates}
                />
              )}
            </div>
          </div>

          {/* Filter panel */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4 dark:bg-zinc-900/80 dark:ring-zinc-700">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Filtros</p>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500">Estado</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pending', label: 'Pendientes' },
                  { id: 'confirmed', label: 'Confirmados' },
                  { id: 'all', label: 'Todos' },
                ].map((status) => (
                  <button
                    key={status.id}
                    onClick={() => setFilterStatus(status.id)}
                    className={`rounded-lg px-2 py-2 text-xs transition-colors ${
                      filterStatus === status.id
                        ? 'bg-lavender-50 font-semibold text-lavender-700 dark:bg-lavender-950/30 dark:text-lavender-200'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Mes</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lavender-300 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-50"
              >
                <option value="all">Todos los meses</option>
                {months.map((m, i) => (
                  <option key={m} value={m}>{monthLabel(m, i)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500">Categoría</label>
              <div className="space-y-0.5">
                {['all', ...CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm
                                transition-colors text-left
                                ${filterCat === cat
                                                  ? 'bg-lavender-50 font-semibold text-lavender-700 dark:bg-lavender-950/30 dark:text-lavender-200'
                                                  : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800/70'}`}
                  >
                    {cat !== 'all' && (
                      <span className={`h-2 w-2 rounded-full shrink-0
                                        ${CAT_STYLES[cat]?.dot ?? 'bg-slate-300'}`} />
                    )}
                    {cat === 'all' ? 'Todas las categorías' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary panel */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-3 dark:bg-zinc-900/80 dark:ring-zinc-700">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Resumen</p>
            <div className="rounded-xl bg-lavender-500 p-4 text-white">
              <p className="text-xs font-medium opacity-75">Total KRW</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {totalKrw.toLocaleString('es-ES')} ₩
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-800/60">
                <p className="text-xs text-slate-500 dark:text-zinc-400">Total EUR</p>
                <p className="mt-0.5 text-base font-bold text-slate-900 tabular-nums dark:text-zinc-50">
                  {totalEur.toFixed(2)} €
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-800/60">
                <p className="text-xs text-slate-500 dark:text-zinc-400">Nº gastos</p>
                <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-zinc-50">{filtered.length}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Table ── */}
        <section className="flex-1 min-w-0">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
            {/* Table header bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-zinc-700">
              <h2 className="font-semibold text-slate-900 dark:text-zinc-50">
                Historial de gastos
                {filtered.length > 0 && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-zinc-800/80 dark:text-zinc-300">
                    {filtered.length}
                  </span>
                )}
              </h2>
            </div>

            {loading ? (
              /* Loading state */
              <div className="divide-y divide-slate-50 dark:divide-zinc-800">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex animate-pulse items-center gap-4 px-6 py-4">
                    <div className="h-3 w-20 rounded bg-slate-100" />
                    <div className="h-5 w-16 rounded-full bg-slate-100" />
                    <div className="h-3 flex-1 rounded bg-slate-50" />
                    <div className="h-3 w-24 rounded bg-slate-100" />
                    <div className="h-3 w-12 rounded bg-slate-50" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="text-6xl">💸</span>
                <p className="mt-4 text-base font-semibold text-slate-700">
                  Sin gastos registrados
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {filterStatus !== 'all' || filterCat !== 'all' || filterMonth !== 'all'
                    ? 'Prueba a cambiar los filtros del panel lateral.'
                    : 'Añade tu primer gasto desde el panel de la izquierda.'}
                </p>
              </div>
            ) : (
              /* Table */
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Categoría
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Concepto
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        KRW
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        EUR
                      </th>
                      <th className="w-24 px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((ex) => {
                      const s = CAT_STYLES[ex.category] ?? CAT_STYLES.Otros
                      const status = EXPENSE_STATUS[normalizeStatus(ex.status)]
                      return (
                        <tr
                          key={ex.id}
                          className="group transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/70"
                        >
                          <td className="whitespace-nowrap px-6 py-3.5 text-slate-500 dark:text-zinc-400">
                            {ex.expense_date}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full
                                             px-2.5 py-0.5 text-xs font-medium ${s.pill}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                              {ex.category}
                            </span>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3.5 text-slate-700 dark:text-zinc-200">
                            {ex.notes || (
                              <span className="italic text-slate-300 dark:text-zinc-500">Sin detalle</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.pill}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-zinc-50">
                            {Number(ex.amount_krw).toLocaleString('es-ES')} ₩
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-400 dark:text-zinc-400">
                            {(Number(ex.amount_krw) / rates.eur_krw).toFixed(2)} €
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {normalizeStatus(ex.status) === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmExpense(ex.id)}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                                  title="Confirmar gasto"
                                  aria-label="Confirmar gasto"
                                >
                                  ✅ Confirmar
                                </button>
                              )}
                              {ex.receipt_url && (
                                <button
                                  type="button"
                                  onClick={() => setViewerUrl(ex.receipt_url)}
                                   className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200"
                                  title="Ver ticket"
                                  aria-label="Ver ticket"
                                >
                                  🧾 Ticket
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEdit(ex)}
                                  className="rounded-lg border border-lavender-200 bg-lavender-50 px-2 py-1 text-xs font-semibold text-lavender-700 transition hover:bg-lavender-100 dark:border-lavender-900/60 dark:bg-lavender-950/30 dark:text-lavender-200"
                                title="Editar"
                                aria-label="Editar"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleDelete(ex.id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                                title="Eliminar"
                              >
                                ✕ Borrar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>

                  {/* Footer totals */}
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <td colSpan={4} className="px-6 py-3 text-xs font-semibold
                                                  uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        Total — {filtered.length}{' '}
                        {filtered.length === 1 ? 'gasto' : 'gastos'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-zinc-50">
                        {totalKrw.toLocaleString('es-ES')} ₩
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-600 dark:text-zinc-300">
                        {totalEur.toFixed(2)} €
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

