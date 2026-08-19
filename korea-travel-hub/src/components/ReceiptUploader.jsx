import { useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import { createWorker } from 'tesseract.js'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'
import { vibrate } from '../utils/haptics'

/**
 * Extrae cantidad en KRW y fecha del texto OCR
 */
function extractDataFromOCR(text) {
  const normalized = text.replace(/[\r\t]+/g, ' ').replace(/\s{2,}/g, ' ')
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean)

  // 1) Buscar líneas que suelen contener totales
  const preferredLines = lines.filter((line) =>
    /(total|합계|총액|결제금액|금액|amount|grand total|subtotal)/i.test(line)
  )

  const candidateLines = preferredLines.length > 0 ? preferredLines : lines
  const amounts = []

  for (const line of candidateLines) {
    const hasCurrency = /(₩|krw|won|원)/i.test(line)
    const matches = line.match(/\d{1,3}(?:[,.]\d{3})+|\d{4,}/g) || []
    for (const raw of matches) {
      const parsed = Number(raw.replace(/[,.]/g, ''))
      if (!Number.isNaN(parsed) && parsed > 0 && (hasCurrency || parsed >= 1000)) {
        amounts.push(parsed)
      }
    }
  }

  const amount = amounts.length ? Math.max(...amounts) : null

  // 2) Soportar fechas 2026-07-22 / 2026.07.22 / 2026년 07월 22일
  const datePatterns = [
    /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/i,
    /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/i,
  ]

  let date = null
  for (const re of datePatterns) {
    const match = normalized.match(re)
    if (match) {
      const [, year, month, day] = match
      date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      break
    }
  }

  return { amount, date, lines }
}

function translateLineToSpanish(line) {
  return line
    .replace(/\bTOTAL\b/gi, 'TOTAL')
    .replace(/\bSUBTOTAL\b/gi, 'SUBTOTAL')
    .replace(/\bVAT\b/gi, 'IVA')
    .replace(/\bTAX\b/gi, 'IMPUESTO')
    .replace(/\bCASH\b/gi, 'EFECTIVO')
    .replace(/\bCARD\b/gi, 'TARJETA')
    .replace(/\bRECEIPT\b/gi, 'TICKET')
    .replace(/합계/g, 'TOTAL')
    .replace(/총액/g, 'TOTAL')
    .replace(/부가세/g, 'IVA')
    .replace(/현금/g, 'EFECTIVO')
    .replace(/카드/g, 'TARJETA')
}

function buildReceiptSummaryEs(text, extracted) {
  const lines = extracted.lines || []

  const merchant = lines.find((line) => {
    if (line.length < 3 || line.length > 45) return false
    if (/\d{3,}/.test(line)) return false
    return /[A-Za-z가-힣]/.test(line)
  })

  const detailLines = lines
    .filter((line) => /(total|합계|총액|vat|tax|card|cash|현금|카드|부가세|menu|item)/i.test(line))
    .slice(0, 4)
    .map((line) => `- ${translateLineToSpanish(line)}`)

  const parts = []
  if (merchant) parts.push(`Comercio: ${translateLineToSpanish(merchant)}`)
  if (extracted.date) parts.push(`Fecha: ${extracted.date}`)
  if (extracted.amount) parts.push(`Total estimado: ${extracted.amount.toLocaleString('es-ES')} KRW`)

  const header = parts.length ? parts.join(' | ') : 'No se detectaron datos estructurados del ticket.'
  if (!detailLines.length) return header

  return `${header}\n${detailLines.join('\n')}`
}

/**
 * Genera archivo PDF a partir de una imagen
 */
function generatePDFFromImage(imageDataUrl, filename) {
  try {
    const img = new Image()
    img.onload = () => {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (img.height / img.width) * pdfWidth
      pdf.addImage(imageDataUrl, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()))
      pdf.save(filename || 'receipt.pdf')
    }
    img.src = imageDataUrl
  } catch (err) {
    throw new Error(`Error al generar PDF: ${err.message}`)
  }
}

export default function ReceiptUploader({ onExtractData, onUploadSuccess, onSummaryGenerated }) {
  const [mode, setMode] = useState(null) // 'upload' | 'pdf' | 'ocr'
  const [uploading, setUploading] = useState(false)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [ocrSummary, setOcrSummary] = useState('')
  const fileInputRef = useRef(null)
  const [capturedImage, setCapturedImage] = useState(null)

  async function uploadFileToSupabase(file, fileType) {
    setError('')
    setInfo('')
    setUploading(true)

    try {
      const timestamp = Date.now()
      const filename = `${timestamp}_${file.name}`
      const path = `${filename}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) return setError(`Error al subir: ${uploadError.message}`)

      const { data } = supabase.storage.from('receipts').getPublicUrl(path)
      const publicUrl = data.publicUrl

      setInfo(`${fileType} subido correctamente.`)
      onUploadSuccess?.({ url: publicUrl, path, filename })
      // Notificar al usuario
      try {
        toast.success(`${fileType} subido correctamente`)
        vibrate(12)
      } catch (err) {
        // no-op
      }

      return publicUrl
    } catch (err) {
      setError(`Error al subir: ${err.message}`)
      return null
    } finally {
      setUploading(false)
    }
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setCapturedImage(event.target.result)
      setInfo('Imagen cargada. Elige una acción:')
    }
    reader.readAsDataURL(file)
  }

  async function handleUploadImage() {
    if (!capturedImage) return

    setUploading(true)
    setError('')
    setInfo('')

    try {
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' })

      const publicUrl = await uploadFileToSupabase(file, 'Imagen')
      if (publicUrl) {
        setCapturedImage(null)
        setMode(null)
      }
    } catch (err) {
      setError(`Error: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleConvertToPDF() {
    if (!capturedImage) return

    setError('')
    setInfo('')

    try {
      generatePDFFromImage(capturedImage, 'receipt.pdf')

      // Convertir canvas a blob y subir
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        canvas.toBlob(async () => {
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
          })
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = (img.height / img.width) * pdfWidth
          const imgData = canvas.toDataURL('image/jpeg')
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()))

          const pdfBlob = pdf.output('blob')
          const file = new File([pdfBlob], `receipt_${Date.now()}.pdf`, { type: 'application/pdf' })

          await uploadFileToSupabase(file, 'PDF')
          setCapturedImage(null)
          setMode(null)
        }, 'image/jpeg')
      }

      img.src = capturedImage
    } catch (err) {
      setError(`Error al convertir PDF: ${err.message}`)
    }
  }

  async function handleOCRExtraction() {
    if (!capturedImage) return

    setOcrProcessing(true)
    setError('')
    setInfo('')

    try {
      const worker = await createWorker('kor+eng+spa')

      const { data } = await worker.recognize(capturedImage)
      const extractedText = data.text || ''

      const extracted = extractDataFromOCR(extractedText)
      const summary = buildReceiptSummaryEs(extractedText, extracted)
      setOcrSummary(summary)
      onSummaryGenerated?.(summary)

      await worker.terminate()

      if (!extracted.amount && !extracted.date) {
        setInfo('No se pudo detectar cantidad/fecha con precisión, pero se generó un resumen OCR.')
        try { toast('Resumen OCR generado'); vibrate(10) } catch (err) { }
      } else {
        const extractedData = {}
        if (extracted.amount) {
          extractedData.amount_krw = extracted.amount
        }
        if (extracted.date) {
          extractedData.expense_date = extracted.date
        }
        onExtractData?.(extractedData)
        setInfo(
          `Detectado: ${extracted.amount ? `${extracted.amount.toLocaleString('es-ES')} KRW` : ''} ${extracted.date ? `- Fecha: ${extracted.date}` : ''}`
        )
        try { toast.success('Datos detectados desde OCR'); vibrate(12) } catch (err) { }
      }

      // Subir la imagen también
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const file = new File([blob], `receipt_ocr_${Date.now()}.jpg`, { type: 'image/jpeg' })
      await uploadFileToSupabase(file, 'Imagen (OCR)')

      setCapturedImage(null)
      setMode(null)
    } catch (err) {
      setError(`Error en OCR: ${err.message}`)
    } finally {
      setOcrProcessing(false)
    }
  }

  if (!capturedImage) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-zinc-50">📸 Ticket / Recibo</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 px-4 py-6
                     text-center transition-colors hover:border-lavender-400 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-lavender-500"
        >
          <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">Selecciona una foto de recibo</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">JPG o PNG</p>
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:ring-zinc-700">
      <h3 className="mb-3 font-semibold text-slate-900 dark:text-zinc-50">📸 Ticket / Recibo</h3>

      {/* Preview */}
      <div className="mb-4 overflow-hidden rounded-xl bg-slate-50 dark:bg-zinc-800/60">
        <img src={capturedImage} alt="Recibo" className="aspect-[4/3] h-auto w-full max-h-64 object-contain" />
      </div>

      {/* Mode selector */}
      <div className="mb-4 space-y-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          disabled={uploading}
          className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${mode === 'upload'
                        ? 'bg-lavender-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-700/80'}`}
        >
          {uploading ? '⏳ Subiendo…' : '☁️ Subir imagen'}
        </button>

        <button
          type="button"
          onClick={() => setMode('pdf')}
          disabled={uploading}
          className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${mode === 'pdf'
                        ? 'bg-lavender-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-700/80'}`}
        >
          {uploading ? '⏳ Subiendo…' : '📄 Convertir a PDF'}
        </button>

        <button
          type="button"
          onClick={() => setMode('ocr')}
          disabled={ocrProcessing}
          className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${mode === 'ocr'
                        ? 'bg-lavender-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-700/80'}`}
        >
          {ocrProcessing ? '⏳ Escaneando…' : '🔍 Escanear (OCR)'}
        </button>
      </div>

      {/* Action buttons */}
      {mode === 'upload' && (
        <button
          type="button"
          onClick={handleUploadImage}
          disabled={uploading}
          className="w-full rounded-xl bg-lavender-500 px-4 py-2 text-sm font-medium text-white
                     hover:bg-lavender-600 disabled:opacity-50"
        >
          {uploading ? 'Subiendo…' : 'Confirmar subida'}
        </button>
      )}

      {mode === 'pdf' && (
        <button
          type="button"
          onClick={handleConvertToPDF}
          disabled={uploading}
          className="w-full rounded-xl bg-lavender-500 px-4 py-2 text-sm font-medium text-white
                     hover:bg-lavender-600 disabled:opacity-50"
        >
          {uploading ? 'Convirtiendo…' : 'Convertir y subir PDF'}
        </button>
      )}

      {mode === 'ocr' && (
        <button
          type="button"
          onClick={handleOCRExtraction}
          disabled={ocrProcessing}
          className="w-full rounded-xl bg-lavender-500 px-4 py-2 text-sm font-medium text-white
                     hover:bg-lavender-600 disabled:opacity-50"
        >
          {ocrProcessing ? 'Escaneando…' : 'Escanear e identificar datos'}
        </button>
      )}

      {/* Messages */}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</p>
      )}
      {info && (
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">{info}</p>
      )}

      {ocrSummary && (
        <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200">
          <p className="mb-1 font-semibold">Resumen OCR (español):</p>
          <pre className="whitespace-pre-wrap font-sans">{ocrSummary}</pre>
        </div>
      )}

      {/* Cancel */}
      <button
        type="button"
        onClick={() => {
          setCapturedImage(null)
          setMode(null)
          setError('')
          setInfo('')
          setOcrSummary('')
        }}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                   text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Cancelar
      </button>
    </div>
  )
}

