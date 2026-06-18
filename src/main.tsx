import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Prevent iOS Safari rubber-band / page drag on non-scrollable elements.
document.addEventListener('touchmove', (e) => {
  const target = e.target as HTMLElement
  // Allow scroll only inside elements that explicitly overflow-scroll/auto.
  if (!target.closest('[data-scroll]')) {
    e.preventDefault()
  }
}, { passive: false })

// Prevent double-tap zoom.
let lastTap = 0
document.addEventListener('touchend', (e) => {
  const now = Date.now()
  if (now - lastTap < 300) e.preventDefault()
  lastTap = now
}, { passive: false })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
