import { useState } from 'react'
import { motion } from 'framer-motion'

export default function CategoryCard({ label, onClick, active = false }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (event) => {
    const { currentTarget, clientX, clientY } = event
    const rect = currentTarget.getBoundingClientRect()
    const relativeX = (clientX - rect.left) / rect.width - 0.5
    const relativeY = (clientY - rect.top) / rect.height - 0.5

    const x = relativeX * 16
    const y = -relativeY * 16

    setTilt({ x, y })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <motion.button
      type="button"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center rounded-2xl px-5 py-3 text-xs font-medium shadow-sm focus:outline-none ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-50 text-slate-700 hover:text-indigo-50'
      }`}
      style={{ transformStyle: 'preserve-3d' }}
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 230, damping: 18 }}
    >
      {/* Glow background on hover */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 via-sky-400/0 to-emerald-400/0 opacity-0 blur-xl transition group-hover:opacity-70 group-hover:from-indigo-500/40 group-hover:via-sky-400/30 group-hover:to-emerald-400/30 ${
          active ? 'opacity-60 from-indigo-500/40 via-sky-400/30 to-emerald-400/30' : ''
        }`}
      />

      <motion.div
        className={`relative flex h-full w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 group-hover:from-indigo-600 group-hover:to-sky-500 ${
          active ? 'from-indigo-600 to-sky-500 text-white' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
        animate={{
          rotateX: tilt.y,
          rotateY: tilt.x,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-slate-400 shadow-sm group-hover:bg-white/95 group-hover:text-indigo-600">
          •
        </span>
        <span className="relative z-10 text-xs font-semibold tracking-wide group-hover:text-white">
          {label}
        </span>
      </motion.div>
    </motion.button>
  )
}
