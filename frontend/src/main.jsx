import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/react'
import AuthSessionBridge from './auth/AuthSessionBridge.jsx'
import { AuthProfileProvider } from './auth/AuthProfileProvider.jsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey} signInUrl="/login" signUpUrl="/register" signInFallbackRedirectUrl="/auth/redirect" signUpFallbackRedirectUrl="/auth/onboarding">
      <AuthSessionBridge>
        <AuthProfileProvider><App /></AuthProfileProvider>
      </AuthSessionBridge>
    </ClerkProvider>
  </StrictMode>,
)
