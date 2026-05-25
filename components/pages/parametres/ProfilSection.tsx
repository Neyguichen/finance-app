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

  // --- Mot de passe ---
  const [editingPassword, setEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
      setEditingPassword(false)
      setNewPassword('')
      setConfirmPassword('')
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
          {!editingPassword ? (
            <Button variant="ghost" size="sm" className="text-slate-400 text-xs h-7" onClick={() => { setEditingPassword(true); setPasswordMsg(null) }}>
              Modifier
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={() => { setEditingPassword(false); setPasswordMsg(null); setNewPassword(''); setConfirmPassword('') }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        {editingPassword && (
          <div className="mt-3 space-y-2">
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
              placeholder="Confirmer le mot de passe"
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