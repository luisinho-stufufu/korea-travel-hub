import React, { useEffect, useState } from 'react'

// Lightweight visual Toaster shim for development.
// Exports a `toast` API (success/error) and a `Toaster` React component that
// renders transient notifications in the app. This replaces the non-visual
// shim so you can see toasts during development without installing `sonner`.

const listeners = new Set()

function notify(payload) {
  for (const l of listeners) l(payload)
}

export const toast = {
  success: (message, opts = {}) => notify({ id: String(Date.now()) + Math.random(), type: 'success', message, duration: opts.duration ?? 3500 }),
  error: (message, opts = {}) => notify({ id: String(Date.now()) + Math.random(), type: 'error', message, duration: opts.duration ?? 4500 }),
  // generic
  raw: (payload) => notify({ id: String(Date.now()) + Math.random(), ...payload }),
}

function containerPositionStyle(position) {
  // support 'bottom-center' only for now; can extend later
  if (position === 'bottom-center') {
    return {
      position: 'fixed',
      left: '50%',
      bottom: '24px',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 9999,
      pointerEvents: 'none',
    }
  }
  return { position: 'fixed', right: '16px', top: '16px', zIndex: 9999 }
}

const toastStyleBase = {
  pointerEvents: 'auto',
  minWidth: '200px',
  maxWidth: '420px',
  padding: '10px 14px',
  borderRadius: '10px',
  boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
  color: '#0f172a',
  fontSize: '14px',
}

function ToastItem({ t, onClose }) {
  const bg = t.type === 'success' ? '#ecfdf5' : t.type === 'error' ? '#fee2e2' : '#f8fafc'
  const border = t.type === 'success' ? '1px solid #34d399' : t.type === 'error' ? '1px solid #f87171' : '1px solid #e2e8f0'
  return (
    React.createElement('div', {
      role: 'status',
      style: { ...toastStyleBase, background: bg, border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }
    },
      React.createElement('div', { style: { flex: 1 } },
        React.createElement('div', { style: { fontWeight: 600, marginBottom: 4 } }, t.type === 'success' ? '✔️' : t.type === 'error' ? '⚠️' : ''),
        React.createElement('div', null, t.message)
      ),
      React.createElement('button', {
        onClick: onClose,
        style: { marginLeft: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 16 }
      }, '✕')
    )
  )
}

export function Toaster({ position = 'bottom-center' }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const handler = (t) => {
      setItems((prev) => [...prev, t])
    }
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [])

  useEffect(() => {
    if (!items.length) return
    const timers = items.map((t) => {
      const id = t.id
      const timeout = setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id))
      }, t.duration ?? 3500)
      return () => clearTimeout(timeout)
    })
    return () => timers.forEach((fn) => fn())
  }, [items])

  function handleClose(id) {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    React.createElement('div', { style: containerPositionStyle(position) },
      items.map((t) => React.createElement(ToastItem, { key: t.id, t, onClose: () => handleClose(t.id) }))
    )
  )
}

export default Toaster


