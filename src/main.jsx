import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ToastProvider from './components/ToastProvider'
import ContentCreationProvider from './context/ContentCreationStore'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ContentCreationProvider>
        <App />
      </ContentCreationProvider>
    </ToastProvider>
  </StrictMode>,
)
