import { applyStoredBrand } from './theme/brand';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './theme/dark.css'
import { applyTheme } from './theme/theme'
import { initAnalytics } from './utils/analytics'

applyStoredBrand(); // last saved brand colours, before the first paint

applyTheme()
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
