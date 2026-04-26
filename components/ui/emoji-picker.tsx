'use client'

import { useState } from 'react'

const EMOJI_OPTIONS = [
  // Maison & Vie
  '🏠', '🏡', '🏢', '👤', '👫', '👨‍👩‍👧‍👦',
  // Finance
  '💰', '💳', '🏦', '💵', '📊', '📈',
  // Alimentation
  '🛒', '🍔', '☕', '🍕', '🥗', '🍷',
  '🧁', '🥐', '🍣', '🍺', '🥡', '🫕',
  // Transport
  '🚗', '⛽', '🚌', '🚲', '✈️', '🛵',
  '🚇', '🅿️', '🛞', '⚡',
  // Santé & Bien-être
  '🏥', '💊', '🏋️', '🧘', '🦷', '👓',
  // Loisirs & Culture
  '🎬', '🎮', '🎵', '📚', '🎭', '🎨',
  '🎪', '🎳', '🎲', '🍿',
  // Shopping & Mode
  '👕', '👗', '👟', '💄', '🛍️', '💍',
  // Tech & Digital
  '📱', '💻', '🖥️', '🎧', '📷', '🔌',
  // Animaux
  '🐶', '🐱', '🐟', '🐴', '🐦', '🐹',
  // Éducation
  '🎓', '📝', '📖', '🧪', '🎒',
  // Maison & Travaux
  '🔧', '🪑', '🧹', '🪴', '💡', '🏗️',
  // Enfants & Famille
  '👶', '🧸', '🎁', '🎂', '🎄', '🎃',
  // Voyages
  '🏖️', '⛷️', '🏕️', '🗺️', '🧳', '🌍',
  // Divers
  '📦', '📬', '🔑', '🏷️', '⚖️', '🛡️',
  // Nature & Fun
  '🌟', '🔥', '❤️', '💎', '🌈', '🎯',
]

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [showGrid, setShowGrid] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowGrid(!showGrid)}
        className="btn btn-outline btn-ghost w-full text-2xl h-14 hover:bg-slate-700"
      >
        {value || '🏠'} <span className="text-sm text-slate-400 ml-2">Choisir une icône</span>
      </button>
      {showGrid && (
        <div className="mt-2 p-3 bg-slate-800 border border-slate-700 rounded-xl grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setShowGrid(false) }}
              className={`text-2xl p-2 rounded-lg hover:bg-slate-700 transition-colors ${
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