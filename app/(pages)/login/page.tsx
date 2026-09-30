'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BrandMark from '@/components/brand/BrandMark'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const REDIRECT_URL = 'https://neyguichen-finances.vercel.app/auth/callback'

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: REDIRECT_URL },
      })
      if (error) setMessage(error.message)
      else setMessage('Vérifie ta boîte mail pour confirmer ton compte !')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(99,102,241,.18),transparent_34rem)]" />
      <div className="relative w-full max-w-sm">
        <div className="nf-card nf-glow p-5 sm:p-6">
          <div className="relative">
            <BrandMark className="justify-center" />
            <div className="mt-6 text-center">
              <p className="nf-eyebrow">{isSignUp ? 'Créer ton espace' : 'Bienvenue'}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                {isSignUp ? 'Créer un compte' : 'Se connecter'}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Ton budget, plus lisible. Tes décisions, plus simples.
              </p>
            </div>

            <form onSubmit={handleAuth} className="mt-6 space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Chargement...' : isSignUp ? 'Créer le compte' : 'Se connecter'}
          </Button>
        </form>

            {message && <p className="text-center text-sm text-amber-300">{message}</p>}

            <p className="text-center text-sm text-slate-500">
              {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-medium text-indigo-300 hover:text-indigo-200"
              >
                {isSignUp ? 'Se connecter' : 'Créer un compte'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}