import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import SkillBadge from '../components/SkillBadge'

const BASE = import.meta.env.BASE_URL

const skills = [
  'Java', 'Python', 'TypeScript', 'React', 'Node.js',
  'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'PyTorch',
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay },
})

export default function Home() {
  return (
    <div className="page-wrapper relative overflow-x-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="aurora-blob-1" />
        <div className="aurora-blob-2" />
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — text */}
            <div>
              <motion.p {...fadeUp(0)} className="section-label mb-4">
                // welcome
              </motion.p>

              <motion.h1
                {...fadeUp(0.08)}
                className="font-bold leading-none mb-4"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                  color: '#f1f5f9',
                }}
              >
                Rohan{' '}
                <span className="gradient-text">Adepu</span>
              </motion.h1>

              <motion.p
                {...fadeUp(0.16)}
                className="text-lg mb-6 tracking-wide"
                style={{ fontFamily: "'Syne', sans-serif", color: '#64748b' }}
              >
                Software Engineer · Entrepreneur · Builder
              </motion.p>

              <motion.p
                {...fadeUp(0.24)}
                className="leading-relaxed mb-8 max-w-lg"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.975rem',
                  color: '#94a3b8',
                }}
              >
                Welcome to my digital portfolio. I&apos;m passionate about building
                technology that creates real-world impact — especially in startups,
                product development, and using software to solve meaningful problems.
                What sets me apart is my focus on <span style={{ color: '#a78bfa' }}>execution</span>: rather
                than just learning concepts, I actively apply them by building projects
                that grow into real products. This portfolio is a window into my work,
                my thinking, and my ongoing journey as an engineer and entrepreneur.
              </motion.p>

              <motion.div {...fadeUp(0.32)} className="flex flex-wrap gap-2 mb-8">
                {skills.map((s) => <SkillBadge key={s}>{s}</SkillBadge>)}
              </motion.div>

              <motion.div {...fadeUp(0.4)} className="flex flex-wrap gap-3">
                <Link
                  to="/projects"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                  }}
                >
                  View Projects
                </Link>
                <a
                  href="https://github.com/rohanadepu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    color: '#a78bfa',
                    border: '1px solid rgba(124,58,237,0.35)',
                    background: 'rgba(124,58,237,0.08)',
                  }}
                >
                  GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/rohan-adepu/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    color: '#93c5fd',
                    border: '1px solid rgba(59,130,246,0.3)',
                    background: 'rgba(59,130,246,0.07)',
                  }}
                >
                  LinkedIn
                </a>
              </motion.div>
            </div>

            {/* Right — images */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="flex flex-col items-center gap-8 lg:items-end"
            >
              {/* Headshot */}
              <div className="relative">
                {/* Outer glow ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: '0 0 60px 8px rgba(124,58,237,0.25)',
                    borderRadius: '50%',
                  }}
                />
                <motion.div
                  animate={{ boxShadow: ['0 0 30px 4px rgba(124,58,237,0.2)', '0 0 50px 10px rgba(124,58,237,0.35)', '0 0 30px 4px rgba(124,58,237,0.2)'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-48 h-48 md:w-60 md:h-60 rounded-full overflow-hidden"
                  style={{ border: '2.5px solid rgba(124,58,237,0.5)' }}
                >
                  <img
                    src={`${BASE}assets/headshot.jpg`}
                    alt="Rohan Adepu"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </div>

              {/* Ribbn phone mockup */}
              <div className="flex flex-col items-center gap-3">
                <p className="section-label">// currently building</p>
                <motion.div
                  className="phone-frame"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img
                    src={`${BASE}assets/ribbn-screenshot.png`}
                    alt="Ribbn App — peer support for cancer patients"
                  />
                </motion.div>
                <p
                  className="text-xs text-center max-w-xs"
                  style={{ color: '#475569', fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span style={{ color: '#a78bfa' }}>Ribbn</span> — nonprofit peer support for cancer patients &amp; survivors
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick stats bar */}
      <section
        className="relative py-10"
        style={{ borderTop: '1px solid rgba(30,30,46,0.8)', borderBottom: '1px solid rgba(30,30,46,0.8)' }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { value: '4.0', label: 'GPA at CU Boulder' },
              { value: '2025', label: 'Empower Internship' },
              { value: 'ICDCN', label: "Published Research '25" },
              { value: '15+', label: 'Members Led at Launchpad' },
            ].map((stat) => (
              <div key={stat.label}>
                <p
                  className="text-3xl font-bold mb-1 gradient-text"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {stat.value}
                </p>
                <p className="text-xs" style={{ color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
