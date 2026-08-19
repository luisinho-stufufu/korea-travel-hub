import { useCallback, useEffect, useState } from 'react'
import CurrencyConverter from './components/CurrencyConverter'
import ExpenseManager from './components/ExpenseManager'
import ShoppingList from './components/ShoppingList'
import PlacesToVisit from './components/PlacesToVisit'

const TABS = [
  { id: 'converter', emoji: '💱', label: 'Divisas' },
  { id: 'expenses', emoji: '💸', label: 'Gastos' },
  { id: 'shopping', emoji: '🛍️', label: 'Compras' },
  { id: 'places', emoji: '📍', label: 'Lugares' },
]

const DEFAULT_RATES = {
  eur_krw: 1560,
  usd_krw: 1430,
  lastUpdated: null,
  source: 'manual',
}

function buildRatesFromFrankfurter(data) {
  const eurKrw = Number(data?.rates?.KRW)
  const eurUsd = Number(data?.rates?.USD)

  if (!eurKrw) return null

  return {
    eur_krw: Number(eurKrw.toFixed(2)),
    usd_krw: eurUsd ? Number((eurKrw / eurUsd).toFixed(2)) : 0,
    lastUpdated: new Date().toISOString(),
    source: 'Frankfurter',
  }
}

function buildRatesFromExchangeRateApi(data) {
  const eurKrw = Number(data?.rates?.KRW)
  const eurUsd = Number(data?.rates?.USD)

  if (!eurKrw) return null

  return {
    eur_krw: Number(eurKrw.toFixed(2)),
    usd_krw: eurUsd ? Number((eurKrw / eurUsd).toFixed(2)) : 0,
    lastUpdated: new Date().toISOString(),
    source: 'ExchangeRate API',
  }
}

async function fetchRatesWithFallback() {
  const providers = [
    {
      url: 'https://api.frankfurter.app/latest?from=EUR&to=KRW,USD',
      parser: buildRatesFromFrankfurter,
    },
    {
      url: 'https://open.er-api.com/v6/latest/EUR',
      parser: buildRatesFromExchangeRateApi,
    },
  ]

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url)
      if (!response.ok) continue

      const data = await response.json()
      const parsed = provider.parser(data)
      if (parsed) return parsed
    } catch {
      // probar siguiente proveedor
    }
  }

  throw new Error('No se pudo actualizar el cambio automáticamente. Se usan las tasas guardadas.')
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeRates(value) {
  if (!value || typeof value !== 'object') return DEFAULT_RATES

  return {
    eur_krw: Number(value.eur_krw) || DEFAULT_RATES.eur_krw,
    usd_krw: Number(value.usd_krw) || DEFAULT_RATES.usd_krw,
    lastUpdated: value.lastUpdated || null,
    source: value.source || 'manual',
  }
}

function loadTheme() {
  try {
    return localStorage.getItem('kr_theme') || 'light'
  } catch {
    return 'light'
  }
}

function loadRates() {
  try {
    return normalizeRates(JSON.parse(localStorage.getItem('kr_rates')))
  } catch {
    return DEFAULT_RATES
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('converter')
  const [rates, setRates] = useState(loadRates)
  const [theme, setTheme] = useState(loadTheme)
  const [ratesStatus, setRatesStatus] = useState({ loading: false, error: '' })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('kr_theme', theme)
  }, [theme])

  const refreshRates = useCallback(async () => {
    setRatesStatus({ loading: true, error: '' })

    try {
      const nextRates = await fetchRatesWithFallback()

      setRates(nextRates)
      localStorage.setItem('kr_rates', JSON.stringify(nextRates))
      setRatesStatus({ loading: false, error: '' })
    } catch {
      setRatesStatus({
        loading: false,
        error: 'No se pudo actualizar el cambio automáticamente. Se usan las tasas guardadas.',
      })
    }
  }, [])

  useEffect(() => {
    // Auto-refrescar solo si no se ha actualizado hoy
    if (rates.lastUpdated && rates.lastUpdated.slice(0, 10) === todayString()) return
    void refreshRates()
  }, [rates.lastUpdated, refreshRates])

  function handleUpdateRates(newRates) {
    const normalized = {
      eur_krw: Number(newRates.eur_krw) || DEFAULT_RATES.eur_krw,
      usd_krw: Number(newRates.usd_krw) || DEFAULT_RATES.usd_krw,
      lastUpdated: new Date().toISOString(),
      source: 'manual',
    }

    setRates(normalized)
    localStorage.setItem('kr_rates', JSON.stringify(normalized))
    setRatesStatus({ loading: false, error: '' })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-900">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-3 sm:px-4">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-2xl">🇰🇷</span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-none text-slate-900 dark:text-zinc-50">Korea Travel Hub</h1>
                <p className="text-xs text-slate-400 dark:text-zinc-500">Tu compañero de viaje digital</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800 sm:px-3 sm:py-2"
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              <span className="text-base sm:hidden">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline">{theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}</span>
            </button>
          </div>

          {/* Tab bar */}
          <nav className="-mb-px flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 ${
                  activeTab === tab.id
                    ? 'border-lavender-500 text-lavender-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
        {activeTab === 'converter' && (
          <CurrencyConverter
            rates={rates}
            onUpdateRates={handleUpdateRates}
            onRefreshRates={refreshRates}
            ratesStatus={ratesStatus}
          />
        )}
        {activeTab === 'expenses' && <ExpenseManager rates={rates} />}
        {activeTab === 'shopping' && <ShoppingList />}
        {activeTab === 'places' && <PlacesToVisit />}
      </main>
    </div>
  )
}
