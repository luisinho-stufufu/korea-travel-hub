# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## PWA & icons (added)

This project includes basic PWA support and helper scripts to generate compatible icons for mobile platforms.

- To install dependencies:

```powershell
npm install
```

- To generate PNG icons (from `public/favicon.svg`) run:

```powershell
npm run generate:icons
```

This will create `public/icon-192.png`, `public/icon-512.png` and `public/apple-touch-icon.png` for use in the web manifest and as `apple-touch-icon` on iOS.

- Start dev server:

```powershell
npm run dev
```

Notes:
- iOS requires PNG `apple-touch-icon` for best results. After generating icons, the manifest and `index.html` are already configured to prefer the PNGs.
- For full PWA behavior (service worker, install prompt) build and deploy over HTTPS and test with `npm run build` + `npm run preview` or on a hosting platform that serves HTTPS.

