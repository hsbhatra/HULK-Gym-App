import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (OFL-licensed) — no third-party font requests
import '@fontsource/big-shoulders-display/latin-700'
import '@fontsource/big-shoulders-display/latin-900'
import '@fontsource/inter-tight/latin-400'
import '@fontsource/inter-tight/latin-500'
import '@fontsource/inter-tight/latin-600'
import '@fontsource/inter-tight/latin-700'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
