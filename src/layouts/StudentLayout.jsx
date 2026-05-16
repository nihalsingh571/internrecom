import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Bell, Command, LogOut, Sparkles, UserCircle2 } from 'lucide-react'

const navLinks = [
  { name: 'Dashboard', href: '/student/dashboard' },
  { name: 'Skills', href: '/student/skills' },
  { name: 'Discovery', href: '/student/internships' },
  { name: 'Applications', href: '/student/applications' },
  { name: 'Profile', href: '/student/profile' },
]

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#030616] to-[#090f2a] text-white">
      <aside className="hidden min-h-screen w-[260px] flex-col border-r border-white/5 bg-[#050b1f]/95 px-6 py-8 md:flex">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">CareerLite</p>
          <h1 className="mt-2 text-2xl font-semibold">Student Hub</h1>
        </div>
        <nav className="mt-10 space-y-1 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className={`flex items-center justify-between rounded-xl px-4 py-3 transition ${
                isActive(link.href)
                  ? 'bg-gradient-to-r from-indigo-500/40 to-fuchsia-500/30 text-white shadow-[0_15px_45px_rgba(99,102,241,0.25)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{link.name}</span>
              {isActive(link.href) ? <span className="text-xs text-white/80">●</span> : null}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Signed in</p>
          <p className="mt-1 text-base font-semibold text-white">{user?.first_name || 'Student'}</p>
          <p className="text-xs text-white/60">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-col gap-4 border-b border-white/5 bg-[#040818] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Student Hub</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Control Center</h2>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <button className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 md:flex">
              <Command size={16} />
              Quick Actions
            </button>
            <span className="hidden items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100 sm:inline-flex">
              <Sparkles size={14} />
              Premium
            </span>
            <button className="relative rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 transition hover:text-white" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pink-400" />
            </button>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              <div className="text-right text-xs leading-tight">
                <p className="font-semibold text-white">
                  {user?.first_name || 'Student'} {user?.last_name || ''}
                </p>
                <p className="text-white/60">Premium Plan</p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 p-2">
                <UserCircle2 className="h-6 w-6 text-white" />
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
