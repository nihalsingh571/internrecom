import { useState } from 'react'
import { motion } from 'framer-motion'
import indiaMap from '../../assets/india-map.svg'

export default function GlowingIndiaMap() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (event) => {
    const { currentTarget, clientX, clientY } = event
    const rect = currentTarget.getBoundingClientRect()
    const relativeX = (clientX - rect.left) / rect.width - 0.5
    const relativeY = (clientY - rect.top) / rect.height - 0.5

    const x = relativeX * 20 // -10deg..10deg
    const y = -relativeY * 20

    setTilt({ x, y })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <div
      className="relative h-64 w-full flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative rounded-3xl bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-400 p-6 shadow-2xl"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{
          rotateX: tilt.y,
          rotateY: tilt.x,
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
      >
        {/* Outer glow */}
        <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-blue-400/40 blur-2xl opacity-60" />

        {/* Inner glass card */}
        <div className="relative rounded-2xl bg-slate-950/40 backdrop-blur-sm border border-white/20 px-4 py-3 flex flex-col items-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-100/80 mb-1">
            Opportunities across India
          </p>
          <img
            src={indiaMap}
            alt="Map of India"
            className="h-36 drop-shadow-[0_0_30px_rgba(59,130,246,0.95)] transition duration-200 ease-out hover:brightness-125"
          />
        </div>
      </motion.div>
    </div>
  )
}

