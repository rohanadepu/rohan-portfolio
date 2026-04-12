import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { label: 'Home',      path: '/',          end: true },
  { label: 'Resume',    path: '/resume',    end: false },
  { label: 'Interests', path: '/interests', end: false },
  { label: 'Projects',  path: '/projects',  end: false },
  { label: 'Social',    path: '/social',    end: false },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(10,10,15,0.75)',
          borderBottom: '1px solid rgba(124,58,237,0.18)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex-shrink-0">
            <span
              className="text-2xl font-bold"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              RA
            </span>
          </NavLink>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className="relative py-1 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, #a855f7, #7c3aed)' }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg"
            style={{ color: '#a78bfa' }}
            aria-label="Toggle menu"
          >
            <motion.span
              animate={{ rotate: open ? 45 : 0, y: open ? 8 : 0 }}
              className="block w-5 h-px bg-current origin-center"
            />
            <motion.span
              animate={{ opacity: open ? 0 : 1 }}
              className="block w-5 h-px bg-current"
            />
            <motion.span
              animate={{ rotate: open ? -45 : 0, y: open ? -8 : 0 }}
              className="block w-5 h-px bg-current origin-center"
            />
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden"
              style={{ borderTop: '1px solid rgba(124,58,237,0.12)' }}
            >
              <div className="px-6 py-4 flex flex-col gap-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className="text-sm font-medium"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {({ isActive }) => (
                      <span style={{ color: isActive ? '#a78bfa' : '#9ca3af' }}>
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}
