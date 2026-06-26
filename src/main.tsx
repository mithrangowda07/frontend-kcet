import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { checkAndInvalidateCache } from './utils/cacheInvalidator'

// Invalidate stale caches at application bootstrap
checkAndInvalidateCache()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

