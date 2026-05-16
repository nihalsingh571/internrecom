import React, { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const styles = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-emerald-400/50 bg-emerald-500/10 text-emerald-50',
    accent: 'from-emerald-500/30 to-cyan-500/10',
  },
  error: {
    icon: AlertTriangle,
    ring: 'ring-rose-400/50 bg-rose-500/10 text-rose-50',
    accent: 'from-rose-500/30 to-orange-500/10',
  },
  info: {
    icon: Info,
    ring: 'ring-indigo-400/40 bg-indigo-500/10 text-indigo-50',
    accent: 'from-indigo-500/30 to-purple-500/10',
  },
}

export default function FeedbackToast({ feedback, onClose }) {
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => onClose?.(), feedback.type === 'success' ? 2400 : 4200)
    return () => clearTimeout(timer)
  }, [feedback, onClose])

  return (
    <AnimatePresence>
      {feedback ? (
        <motion.div
          key="feedback-toast"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed left-1/2 top-6 z-50 -translate-x-1/2 px-4 sm:px-0"
        >
          <div
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 px-4 py-3 shadow-[0_20px_60px_rgba(2,4,16,0.5)] ring ${styles[feedback.type].ring}`}
          >
            <span className={`rounded-xl bg-gradient-to-br ${styles[feedback.type].accent} p-2`}>
              {(() => {
                const Icon = styles[feedback.type].icon
                return <Icon size={20} />
              })()}
            </span>
            <div className="max-w-xs text-sm leading-relaxed">{feedback.message}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-white/70 transition hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
