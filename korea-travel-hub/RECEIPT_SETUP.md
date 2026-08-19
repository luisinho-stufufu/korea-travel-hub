# 📸 Gestión de Recibos / Tickets - Guía de Configuración

## 1️⃣ Crear bucket `receipts` en Supabase Storage

### Pasos:

1. Accede a tu proyecto en [Supabase](https://supabase.com/dashboard)
2. Ve a **Storage** en el menú izquierdo
3. Haz clic en **Create a new bucket**
4. Nombre: `receipts`
5. **Desmarca** "Private bucket" (debes dejar público para obtener URLs públicas)
6. Haz clic en **Create bucket**

### Configurar política CORS (si es necesario):

Si obtienes errores de CORS al subir desde el navegador:

1. Ve a **Storage** → Selecciona el bucket `receipts`
2. Haz clic en **Policies** (o ve a **SQL Editor**)
3. Ejecuta este SQL para permitir uploads sin autenticación (modo desarrollo):

```sql
create policy "Allow public uploads" on storage.objects
  for insert
  with (bucket_id = 'receipts')
  to public
  using (true);

create policy "Allow public read" on storage.objects
  for select
  with (bucket_id = 'receipts')
  to public
  using (true);
```

---

## 2️⃣ Funcionalidades del componente `ReceiptUploader`

### 📤 Subir imagen
- Selecciona una foto JPG o PNG del recibo
- Se sube automáticamente a `receipts` bucket
- Obtiene una URL pública para guardar en el gasto

### 📄 Convertir a PDF
- Toma la imagen capturada
- La convierte a PDF usando jsPDF
- Sube el PDF al bucket `receipts`

### 🔍 Escanear (OCR)
- Usa **tesseract.js** para reconocer texto en la imagen
- **Detecta automáticamente:**
  - Precio total en KRW (busca patrones: `12000 원`, `12,000 KRW`, `₩12000`)
  - Fecha (busca formatos: YYYY-MM-DD, YYYY/MM/DD, etc.)
- **Rellena automáticamente** los campos del formulario de gastos
- Sube la imagen al bucket

---

## 3️⃣ Uso en la app

### En móvil:
1. Pulsa el botón `+` flotante (abajo derecha)
2. En el modal, abre la sección **"▶ Escanear recibo"**
3. Selecciona una foto
4. Elige una opción:
   - **☁️ Subir imagen** → Solo guarda la foto
   - **📄 Convertir a PDF** → Convierte y guarda como PDF
   - **🔍 Escanear (OCR)** → Lee el recibo y rellena precio/fecha

### En escritorio:
Próxima fase: Agregar el componente al sidebar izquierdo

---

## 4️⃣ Dependencias instaladas

```bash
npm install jspdf tesseract.js
```

- **jspdf** (v2.x): Convierte imágenes a PDF
- **tesseract.js** (v5.x): OCR en el navegador (sin servidor)

---

## 5️⃣ Variables de entorno

No se requieren variables adicionales. El componente usa:
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ya configuradas en `.env`)

---

## 6️⃣ Notas técnicas

### Performance OCR
- **Primera ejecución**: Descarga modelos (~80MB) → Puede tomar 10-30 segundos
- **Ejecuciones siguientes**: Más rápido (usa caché)
- Se ejecuta en **Web Worker** para no bloquear UI

### Formato esperado en recibos
- **Precio**: `12000`, `12,000`, `12.000,00` (reconoce separadores)
- **Moneda**: 원, KRW, ₩
- **Fecha**: 2026-07-21, 2026/07/21, 21-07-2026

---

## 7️⃣ Troubleshooting

### Error: "No se pudieron detectar cantidad ni fecha"
- El OCR no reconoció números ni fechas
- **Solución**: Rellena manualmente después de escanear

### Error: "Error al subir"
- Verifica que el bucket `receipts` existe y es público
- Comprueba las políticas CORS

### Tesseract demora mucho
- Primera vez: Es normal (descarga modelos)
- Usa idioma español (`'spa'`) para mejor reconocimiento en recibos coreanos con precios

---

## 8️⃣ Futuras mejoras

- [ ] Soporte para múltiples idiomas (coreano, inglés, español)
- [ ] Editar/corregir texto OCR manualmente antes de confirmar
- [ ] Galería de recibos con visor de PDFs
- [ ] Análisis de desglose de recibos (itemización)

