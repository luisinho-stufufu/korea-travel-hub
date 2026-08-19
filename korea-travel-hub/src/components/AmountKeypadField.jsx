import { useId, useMemo, useState } from 'react'

const DEFAULT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫']

export default function AmountKeypadField({
  name = 'amount_krw',
  label,
  value,
  onChange,
  placeholder = '0',
  unit = 'KRW',
  keys = DEFAULT_KEYS,
  helper,
  labelClassName = '',
  triggerClassName = '',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const inputId = useId()

  const formattedValue = useMemo(() => {
    if (!value) return ''
    const raw = String(value)
    const normalized = raw.replace(',', '.')

    if (!normalized.includes('.')) {
      const numeric = Number(normalized)
      if (Number.isNaN(numeric)) return raw
      return numeric.toLocaleString('es-ES')
    }

    const [intPartRaw, decPartRaw = ''] = normalized.split('.')
    const intPart = Number(intPartRaw || '0').toLocaleString('es-ES')
    const hasTrailingDot = normalized.endsWith('.')
    if (hasTrailingDot) return `${intPart}.`
    return `${intPart}.${decPartRaw}`
  }, [value])

  function setRawValue(next) {
    onChange({ target: { name, value: next } })
  }

  function handleKeyPress(key) {
    if (key === '⌫') {
      setRawValue(String(value || '').slice(0, -1))
      return
    }

    if (key === '.' || key === ',') {
      const current = String(value || '')
      if (current.includes('.') || current.includes(',')) return
      setRawValue(current ? `${current}.` : '0.')
      return
    }

    const nextValue = `${value || ''}${key}`.replace(/^0+(?=\d)/, '')
    setRawValue(nextValue)
  }

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={inputId} className={`block text-sm text-slate-700 dark:text-zinc-200 ${labelClassName}`}>
          {label}
        </label>
      </div>

      <button
        id={inputId}
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-slate-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-50 ${triggerClassName}`}
      >
        <span className={formattedValue ? '' : 'text-slate-400 dark:text-zinc-500'}>
          {formattedValue || placeholder}
        </span>
        <span className="text-xs text-slate-400 dark:text-zinc-500">{unit}</span>
      </button>

      {helper && <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">{helper}</p>}

      {open && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70">
          <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:bg-zinc-800/70 dark:text-zinc-50 sm:flex-row sm:items-center sm:justify-between">
            <span>{formattedValue || '0'}</span>
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setRawValue('')}
                className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-700/80"
                aria-label="Limpiar cantidad"
                title="Limpiar"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-700/80"
                aria-label="Cerrar teclado"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="min-h-11 rounded-xl bg-white px-3 py-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 dark:bg-zinc-800/70 dark:text-zinc-50 dark:hover:bg-zinc-700/80 sm:min-h-12 sm:text-sm"
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

