'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, Eye, EyeOff } from 'lucide-react'

type Props = {
  userEmail: string | null
}

export default function ProfilSection({ userEmail }: Props) {
  const supabase = createClient()

  // --- Email ---
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleEditEmail = () => {
    setNewEmail(userEmail || '')
    setEditingEmail(true)
    setEmailMsg(null)
  }

  const handleSaveEmail = async () => {
    if (!newEmail.trim() || newEmail === userEmail) {
      setEditingEmail(false)
      return
    }
    setEmailLoading(true)
    setEmailMsg(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailLoading(false)
    if (error) {
      setEmailMsg({ type: 'error', text: error.message })
    } else {
      setEmailMsg({ type: 'success', text: 'Un email de confirmation a été envoyé à la nouvelle adresse.' })
      setEditingEmail(false)
    }
  }

  // --- Mot de passe (2 étapes) ---
  const [pwStep, setPwStep] = useState<'closed' | 'verify' | 'change'>('closed')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const resetPasswordForm = () => {
    setPwStep('closed')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setPasswordMsg(null)
  }

  // Étape 1 : vérifier le mot de passe actuel
  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword || !userEmail) return
    setPasswordLoading(true)
    setPasswordMsg(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })
    setPasswordLoading(false)
    if (error) {
      setPasswordMsg({ type: 'error', text: 'Mot de passe actuel incorrect.' })
    } else {
      setPwStep('change')
      setPasswordMsg(null)
    }
  }

  // Étape 2 : enregistrer le nouveau mot de passe
  const handleSavePassword = async () => {
    setPasswordMsg(null)
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: '6 caractères minimum.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: 'Mot de passe modifié avec succès.' })
      setTimeout(resetPasswordForm, 2000)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Email */}
      <div className="bg-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Email</span>
          {!editingEmail ? (
            <div className="flex items-center gap-2">
              <span className="text-white">{userEmail || '—'}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={handleEditEmail}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="h-8 w-48 text-sm bg-slate-700 border-slate-600"
                type="email"
                placeholder="nouvel@email.com"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" onClick={handleSaveEmail} disabled={emailLoading}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={() => { setEditingEmail(false); setEmailMsg(null) }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        {emailMsg && (
          <p className={`text-xs mt-2 ${emailMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {emailMsg.text}
          </p>
        )}
      </div>

      {/* Mot de passe */}
      <div className="bg-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Mot de passe</span>
          {pwStep === 'closed' ? (
            <Button variant="ghost" size="sm" className="text-slate-400 text-xs h-7" onClick={() => { setPwStep('verify'); setPasswordMsg(null) }}>
              Modifier
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={resetPasswordForm}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Étape 1 : vérification mot de passe actuel */}
        {pwStep === 'verify' && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500">Entrez votre mot de passe actuel pour continuer</p>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Mot de passe actuel"
                className="h-9 text-sm bg-slate-700 border-slate-600 pr-10"
                onKeyDown={e => e.key === 'Enter' && handleVerifyCurrentPassword()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleVerifyCurrentPassword}
              disabled={passwordLoading || !currentPassword}
            >
              {passwordLoading ? 'Vérification...' : 'Vérifier'}
            </Button>
          </div>
        )}

        {/* Étape 2 : nouveau mot de passe */}
        {pwStep === 'change' && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-emerald-400">✓ Mot de passe vérifié</p>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="h-9 text-sm bg-slate-700 border-slate-600 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirmer le nouveau mot de passe"
              className="h-9 text-sm bg-slate-700 border-slate-600"
            />
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleSavePassword}
              disabled={passwordLoading || !newPassword || !confirmPassword}
            >
              {passwordLoading ? 'Modification...' : 'Valider le nouveau mot de passe'}
            </Button>
          </div>
        )}

        {passwordMsg && (
          <p className={`text-xs mt-2 ${passwordMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {passwordMsg.text}
          </p>
        )}
      </div>
    </div>
  )
}