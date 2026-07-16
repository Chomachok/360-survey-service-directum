import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SurveyMatrix from "./MatrixGrid"
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />/*App*/
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              maxWidth: '500px',
              wordBreak: 'break-all',
            },
            success: {
              style: {
                background: '#22c55e',
                color: '#fff',
                wordBreak: 'break-all',
              },
            },
            error: {
              style: {
                background: '#ef4444',
                color: '#fff',
                wordBreak: 'break-all',
              },
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)