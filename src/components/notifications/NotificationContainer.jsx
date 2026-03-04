import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import NotificationItem from './NotificationItem'

const NotificationContext = createContext(null)

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return ctx
}

function NotificationViewport({ notifications, removeNotification }) {
  if (!notifications.length) return null

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[60] flex flex-col items-end">
      <AnimatePresence initial={false}>
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onClose={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const showNotification = useCallback((partial) => {
    const id = generateId()
    const notification = {
      id,
      type: partial.type ?? 'info',
      title: partial.title ?? '',
      message: partial.message ?? '',
    }
    setNotifications((prev) => [...prev, notification])
    return id
  }, [])

  const api = useMemo(
    () => ({
      show: showNotification,
      success: (title, message) =>
        showNotification({ type: 'success', title, message }),
      error: (title, message) =>
        showNotification({ type: 'error', title, message }),
      info: (title, message) =>
        showNotification({ type: 'info', title, message }),
      warning: (title, message) =>
        showNotification({ type: 'warning', title, message }),
    }),
    [showNotification],
  )

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <NotificationViewport
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </NotificationContext.Provider>
  )
}

