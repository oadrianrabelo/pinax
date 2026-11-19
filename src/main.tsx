import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './prefs' // aplica tema e fontes antes do primeiro desenho
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
