# Korea Travel Hub 🇰🇷✈️

[🇪🇸 Versión en Español](#versión-en-español) | [🇬🇧 English Version](#english-version)

---

## Versión en Español

### 📱 Descripción del Proyecto

**Korea Travel Hub** es una aplicación web progresiva (PWA) diseñada para ayudarte a organizar y gestionar tu viaje a Corea. Con herramientas intuitivas para controlar gastos, convertir divisas, planificar lugares a visitar y mucho más, esta app te acompañará en cada momento de tu aventura coreana.

### ✨ Características Principales

- 💰 **Gestor de Gastos**: Registra y categoriza todos tus gastos durante el viaje
- 💱 **Conversor de Divisas**: Convierte monedas en tiempo real (Won coreano ↔ tu moneda local)
- 📍 **Lugares a Visitar**: Crea y gestiona una lista de destinos que no te quieres perder
- 🛒 **Lista de Compras**: Planifica tus compras y no olvides nada
- 🧾 **Gestor de Recibos**: Sube y organiza fotos de tus recibos
- 🌙 **Modo Oscuro/Claro**: Interfaz que se adapta a tus preferencias
- 📲 **Instalable en Móvil**: Usa como una app nativa en tu teléfono
- 🔄 **Sincronización en la Nube**: Todos tus datos se sincronizan con Supabase

### 🛠️ Tecnología Utilizada

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL)
- **PWA**: vite-plugin-pwa
- **Notificaciones**: Sonner (shim local)
- **Moneda**: API de conversión en tiempo real

### 🚀 Instalación

#### Requisitos Previos
- Node.js 16+ 
- npm o yarn

#### Pasos

1. **Clona el repositorio**
```bash
git clone https://github.com/tu-usuario/korea-travel-hub.git
cd korea-travel-hub
```

2. **Instala las dependencias**
```bash
npm install --legacy-peer-deps
```

3. **Configura las variables de entorno**
Crea un archivo `.env` en la raíz del proyecto:
```
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

4. **Inicia el servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 📦 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Crea una versión optimizada para producción
- `npm run preview` - Vista previa de la versión de producción
- `npm run lint` - Ejecuta el linter de código

### 📲 Instalación como PWA

1. Abre la aplicación en tu navegador
2. Busca el icono "Instalar" o "Agregar a pantalla de inicio"
3. ¡Listo! Tendrás la app como si fuera una aplicación nativa

### 📁 Estructura del Proyecto

```
korea-travel-hub/
├── src/
│   ├── components/       # Componentes React reutilizables
│   ├── libs/            # Librerías locales (ej: sonner-shim.js)
│   ├── utils/           # Funciones utilitarias
│   ├── App.jsx          # Componente principal
│   └── main.jsx         # Punto de entrada
├── public/              # Archivos estáticos (iconos, manifest)
├── scripts/             # Scripts de diagnóstico
├── vite.config.js       # Configuración de Vite
└── package.json         # Dependencias del proyecto
```

### 🤝 Contribuir

¿Tienes ideas para mejorar la app? ¡Las contribuciones son bienvenidas!

### 📄 Licencia

Este proyecto es personal y está disponible bajo licencia MIT.

---

## English Version

### 📱 Project Description

**Korea Travel Hub** is a Progressive Web App (PWA) designed to help you organize and manage your trip to Korea. With intuitive tools to control expenses, convert currencies, plan places to visit, and much more, this app will accompany you at every moment of your Korean adventure.

### ✨ Key Features

- 💰 **Expense Manager**: Track and categorize all your travel expenses
- 💱 **Currency Converter**: Convert currencies in real-time (Korean Won ↔ your local currency)
- 📍 **Places to Visit**: Create and manage a list of destinations you don't want to miss
- 🛒 **Shopping List**: Plan your shopping and don't forget anything
- 🧾 **Receipt Manager**: Upload and organize photos of your receipts
- 🌙 **Dark/Light Mode**: Interface that adapts to your preferences
- 📲 **Mobile Installable**: Use as a native app on your phone
- 🔄 **Cloud Synchronization**: All your data syncs with Supabase

### 🛠️ Technology Stack

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL)
- **PWA**: vite-plugin-pwa
- **Notifications**: Sonner (local shim)
- **Currency**: Real-time conversion API

### 🚀 Installation

#### Prerequisites
- Node.js 16+
- npm or yarn

#### Steps

1. **Clone the repository**
```bash
git clone https://github.com/your-username/korea-travel-hub.git
cd korea-travel-hub
```

2. **Install dependencies**
```bash
npm install --legacy-peer-deps
```

3. **Set up environment variables**
Create a `.env` file in the project root:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anonymous_key
```

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 📦 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Create an optimized production build
- `npm run preview` - Preview the production build
- `npm run lint` - Run code linter

### 📲 Install as PWA

1. Open the application in your browser
2. Look for the "Install" or "Add to home screen" icon
3. Done! You'll have the app as if it were a native application

### 📁 Project Structure

```
korea-travel-hub/
├── src/
│   ├── components/       # Reusable React components
│   ├── libs/            # Local libraries (e.g., sonner-shim.js)
│   ├── utils/           # Utility functions
│   ├── App.jsx          # Main component
│   └── main.jsx         # Entry point
├── public/              # Static files (icons, manifest)
├── scripts/             # Diagnostic scripts
├── vite.config.js       # Vite configuration
└── package.json         # Project dependencies
```

### 🤝 Contributing

Have ideas to improve the app? Contributions are welcome!

### 📄 License

This project is personal and available under the MIT License.

---

**Last Updated**: August 2026

