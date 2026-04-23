'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://finance-app-seven-blush.vercel.app/auth/callback',
        },
      })
      if (error) setMessage(error.message)
      else setMessage('Vérifie tes emails pour confirmer ton compte !')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/dashboard'
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <Card className="w-full max-w-sm bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            💰 Finance App
          </CardTitle>
          <p className="text-center text-slate-400 text-sm">
            {isSignUp ? 'Créer un compte' : 'Se connecter'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {message && (
              <p className="text-sm text-center text-yellow-400">{message}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : isSignUp ? "S'inscrire" : 'Se connecter'}
            </Button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-4 w-full text-sm text-slate-400 hover:text-white transition"
          >
            {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}