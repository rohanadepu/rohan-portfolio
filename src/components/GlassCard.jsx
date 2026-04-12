import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '' }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`rounded-2xl p-6 glass-hover ${className}`}
      style={{
        background: 'rgba(17,17,24,0.85)',
        border: '1px solid rgba(30,30,46,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </motion.div>
  )
}
