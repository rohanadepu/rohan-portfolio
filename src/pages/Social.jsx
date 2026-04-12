import { motion } from 'framer-motion'
import SocialCard from '../components/SocialCard'

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="#a78bfa" className="w-6 h-6">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="#a78bfa" className="w-6 h-6">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
)

const profiles = [
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/rohan-adepu/',
    icon: <LinkedInIcon />,
    description:
      'My LinkedIn showcases my professional journey — internships at Empower, published research at ICDCN 2025, and leadership at Boulder Launchpad. It supports my personal brand by presenting me as a motivated, career-focused engineer. Visitors can explore my background, see endorsements from collaborators, and connect for opportunities in tech and startups.',
  },
  {
    name: 'GitHub',
    url: 'https://github.com/rohanadepu',
    icon: <GitHubIcon />,
    description:
      'My GitHub hosts the source code for projects ranging from real-time event streaming platforms and AI-powered data aggregators to mobile applications. It demonstrates technical depth, engineering consistency, and a hands-on approach to building. Visitors can explore my code, understand my thinking, and see real examples of what I ship.',
  },
]

export default function Social() {
  return (
    <div className="page-wrapper pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-12"
        >
          <p className="section-label mb-3">// connect with me</p>
          <h1
            className="font-bold mb-4"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              color: '#f1f5f9',
            }}
          >
            Social &amp; <span className="gradient-text">Links</span>
          </h1>
          <p
            className="max-w-2xl leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#64748b', fontSize: '0.95rem' }}
          >
            Find me across the web. Whether you&apos;re a recruiter, collaborator, or fellow
            builder — I&apos;m always open to meaningful conversations.
          </p>
        </motion.div>

        {/* Social cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {profiles.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
            >
              <SocialCard {...p} />
            </motion.div>
          ))}
        </div>

        {/* Email CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 rounded-2xl p-8 text-center max-w-2xl"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          <p className="section-label mb-3">// say hello</p>
          <h2
            className="font-bold text-white text-2xl mb-3"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Let&apos;s Build Something Together
          </h2>
          <p
            className="text-sm mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#64748b' }}
          >
            Open to internships, research collaborations, and startup conversations.
          </p>
          <a
            href="mailto:adepurohan@gmail.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            }}
          >
            adepurohan@gmail.com
          </a>
        </motion.div>

      </div>
    </div>
  )
}
