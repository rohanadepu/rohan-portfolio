import { motion } from 'framer-motion'
import GlassCard from '../components/GlassCard'

const RocketIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
)

const CodeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const highlights = [
  {
    icon: <RocketIcon />,
    title: 'Entrepreneurship & Startup Work',
    body: `I'm actively building Ribbn, a nonprofit mobile platform connecting cancer patients and survivors for peer-to-peer emotional support. Using matching based on diagnosis, stage, and personal factors, the app helps users find others who truly understand their experience. This work has deepened my skills in product design, mobile development, and execution — teaching me how to move quickly, validate ideas, and build something meaningful from scratch. I also serve as Director of Operations at Boulder Launchpad, where I lead a 15-member team, coordinate meetings and events, maintain our organization website (100+ monthly visitors), and connect students with local startup ecosystems and accelerators.`,
  },
  {
    icon: <CodeIcon />,
    title: 'Technology & Development',
    body: `I spend significant time building real systems — from a real-time streaming pipeline handling 5,000+ events per second (Kafka, Flink, Kubernetes) to AI-powered financial forecasting platforms and mobile applications. I enjoy the full engineering stack: designing architecture, writing clean code, and shipping to production. My technical interests span mobile development, data engineering, machine learning, and cloud infrastructure. I believe the best engineers aren't just good at coding — they understand systems holistically and know how to make tradeoffs. I'm continuously learning and applying new technologies to problems that matter.`,
  },
  {
    icon: <UsersIcon />,
    title: 'Collaboration & Teamwork',
    body: `At the University of Missouri, I worked with a team of 11 researchers and co-authored a paper on federated learning-enabled anomaly detection for drone swarms, accepted at ICDCN 2025. With Edvise, I coordinated with university stakeholders at CU Boulder and CU Denver to align product features with real student needs. Through Boulder Launchpad, I've mentored peers, facilitated workshops, and secured guest speakers from local startups and accelerators. Whether leading a research team, coordinating a product launch, or running daily operations, I've learned that great outcomes come from clear communication, shared accountability, and a culture where everyone moves together.`,
  },
]

export default function Interests() {
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
          <p className="section-label mb-3">// extracurricular</p>
          <h1
            className="font-bold mb-4"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              color: '#f1f5f9',
            }}
          >
            Interests &amp; <span className="gradient-text">Highlights</span>
          </h1>
          <p
            className="max-w-2xl leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#64748b', fontSize: '0.95rem' }}
          >
            Beyond the code, I&apos;m driven by community, entrepreneurship, and the belief that
            technology is most powerful when it&apos;s built with real people in mind.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <motion.div
              key={h.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
            >
              <GlassCard className="h-full flex flex-col">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  {h.icon}
                </div>

                {/* Title */}
                <h3
                  className="text-lg font-bold text-white mb-3"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {h.title}
                </h3>

                {/* Body */}
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: '#94a3b8' }}
                >
                  {h.body}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  )
}
