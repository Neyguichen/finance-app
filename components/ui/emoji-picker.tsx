'use client'

import { useState } from 'react'

const EMOJI_OPTIONS = [
  // Maison & logement
  '🏠', '🏡', '🏢', '🏘️', '🛋️', '🛏️', '🚿', '🛁', '🚽', '🔑',
  '🔧', '🪛', '🔨', '🧰', '🪚', '🧱', '🏗️', '🪜', '🪟', '🪑',
  '🧹', '🧽', '🧴', '🧺', '🪴', '💡', '🔥', '❄️',

  // Finance, banque & administratif
  '💰', '💳', '🏦', '💵', '💶', '💷', '💸', '🪙', '🧾', '💹',
  '📊', '📈', '📉', '💼', '🏷️', '⚖️', '🛡️', '📄', '📑', '🗂️',
  '📁', '📋', '✉️', '📬', '🧮', '🔒', '🔓', '✅', '❌', '⚠️',

  // Factures, abonnements & services
  '💧', '⚡', '🌐', '📡', '📺', '📱', '☎️', '📞', '💻', '🖥️',
  '⌨️', '🖨️', '🎧', '🔌', '🔋', '🛰️', '☁️', '🔔',

  // Alimentation & courses
  '🛒', '🛍️', '🥖', '🥐', '🍞', '🥩', '🍗', '🥚', '🧀', '🥛',
  '🍎', '🍌', '🍓', '🥕', '🥦', '🥗', '🍝', '🍚', '🍕', '🍔',
  '🌮', '🍣', '🥡', '🫕', '🍰', '🧁', '☕', '🍵', '🥤', '🍷',
  '🍺', '🍿',

  // Transport & véhicule
  '🚗', '🚙', '🚕', '🚌', '🚇', '🚆', '🚲', '🛵', '🏍️', '✈️',
  '🚤', '⛽', '🅿️', '🛞', '🔋', '🛣️', '🚦', '🧳',

  // Santé & bien-être
  '🏥', '⚕️', '💊', '💉', '🩹', '🩺', '🦷', '👓', '🧠', '❤️',
  '🏋️', '🧘', '🏃', '🚶', '💆', '🧴', '🧼', '😴',

  // Enfants & famille
  '👤', '👫', '👨‍👩‍👧‍👦', '👶', '🍼', '🧸', '🎒', '🏫', '📚', '✏️',
  '🎨', '🧩', '🛝', '⚽', '🎂', '🎁', '🎄', '🎃',

  // Loisirs, culture & sorties
  '🎬', '🎮', '🎵', '🎸', '🎭', '🎤', '🎟️', '🎪', '🎳', '🎲',
  '🃏', '🎯', '🎨', '📷', '📖', '📰', '🏟️', '🎣', '⛳', '🎾',
  '🏀', '⚽', '🏊', '🚴',

  // Shopping, mode & beauté
  '👕', '👗', '👖', '🧥', '👟', '👠', '👜', '⌚', '💍', '💄',
  '💅', '✂️', '🧴', '🪞',

  // Animaux
  '🐶', '🐱', '🐰', '🐹', '🐦', '🐟', '🐴', '🐾', '🦴', '🐕',
  '🐈',

  // Éducation & travail
  '🎓', '📝', '📖', '📚', '🧪', '🔬', '🧑‍💻', '💼', '🏭', '🏪',
  '🏬', '🧑‍🏫',

  // Voyage & vacances
  '🏖️', '🏕️', '⛷️', '🏔️', '🗺️', '🌍', '🌴', '🏨', '🧳', '📸',
  '🛫', '🛬',

  // Cadeaux, événements & solidarité
  '🎁', '🎉', '🎊', '🎂', '💐', '❤️', '🤝', '🙏', '🎄', '🎃',
  '💒',

  // Divers
  '📦', '📌', '📎', '🔖', '🔑', '🧲', '🧯', '🛠️', '♻️', '🗑️',
  '🌟', '✨', '💎', '🌈', '🎯', '⭐', '🔵', '🟢', '🟡', '🟠',
]

const UNIQUE_EMOJI_OPTIONS = Array.from(new Set(EMOJI_OPTIONS))

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  compact?: boolean
}

export function EmojiPicker({ value, onChange, compact = false }: EmojiPickerProps) {
  const [showGrid, setShowGrid] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowGrid(!showGrid)}
        className={compact
          ? "flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/40 text-xl transition hover:border-slate-600 hover:bg-slate-800"
          : "btn btn-outline btn-ghost w-full text-2xl h-14 hover:bg-slate-700"}
        aria-label="Choisir une icône"
      >
        {value || '🏠'} {!compact && <span className="text-sm text-slate-400 ml-2">Choisir une icône</span>}
      </button>
      {showGrid && (
        <div className={compact
          ? "absolute z-50 mt-2 grid w-80 max-w-[calc(100vw-4rem)] grid-cols-6 gap-2 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-2xl max-h-64 overflow-y-auto"
          : "mt-2 p-3 bg-slate-800 border border-slate-700 rounded-xl grid grid-cols-8 gap-2 max-h-64 overflow-y-auto"}>
          {UNIQUE_EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setShowGrid(false) }}
              className={`text-2xl w-12 h-12 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors ${
                value === emoji ? 'bg-blue-600/30 ring-2 ring-blue-500' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
