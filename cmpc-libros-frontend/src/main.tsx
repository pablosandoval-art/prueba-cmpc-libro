import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { restoreSession } from './features/auth/auth.store'
import './index.css'

// La sesión vive en una cookie HttpOnly: se pregunta al backend si sigue vigente.
void restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
