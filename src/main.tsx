import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.tsx'
import Registration from './Components/Registrations/Registration'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Registration />
  </StrictMode>,
)
