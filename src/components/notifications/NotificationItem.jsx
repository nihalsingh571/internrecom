import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react'

const typeStyles = {
  success: {
    container: 'bg-green-100 border-green-500',
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
  },
  error: {
    container: 'bg-red-100 border-red-500',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
  },
  info: {
    container: 'bg-blue-100 border-blue-500',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
  },
  warning: {
    container: 'bg-yellow-100 border-yellow-500',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900',
  },
}

const typeIcon = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

export default function NotificationItem({ notification, onClose }) {
  const { id, type, title, message } = notification
  const styles = typeStyles[type] ?? typeStyles.info
  const Icon = typeIcon[type] ?? Info

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [id, onClose])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, x: 40, y: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0, x: 20, y: -10 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 22,
        duration: 0.45,
      }}
      whileHover={{ scale: 1.02 }}
      className={`pointer-events-auto mb-3 w-80 rounded-xl border shadow-lg ${styles.container}`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`mt-0.5 flex-shrink-0 ${styles.iconColor}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 text-sm">
          {title && (
            <p className={`font-semibold leading-tight ${styles.titleColor}`}>
              {title}
            </p>
          )}
          {message && (
            <p className="mt-0.5 text-[13px] leading-snug text-slate-700">
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onClose(id)}
          className="ml-2 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 hover:bg-white/40 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  )
}

