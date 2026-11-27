import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/Focus/inputModality'
import { Preview } from '../preview/Preview'
import { config } from './preview.config'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview config={config} />
  </StrictMode>,
)
