import { motion } from 'framer-motion'

export default function Resume() {
  const embedUrl = 'https://drive.google.com/file/d/1i5PjdlxktI9xKadB-VG18GdApZRyKNcu/preview'
  const downloadUrl = 'https://drive.google.com/uc?export=download&id=1i5PjdlxktI9xKadB-VG18GdApZRyKNcu'

  return (
    <div className="page-wrapper pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-10"
        >
          <p className="section-label mb-3">// resume &amp; cv</p>
          <h1
            className="font-bold mb-4"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              color: '#f1f5f9',
            }}
          >
            My <span className="gradient-text">Resume</span>
          </h1>
          <p
            className="max-w-2xl leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#64748b', fontSize: '0.95rem' }}
          >
            Below is an overview of my education, experience, projects, and technical skills.
            This resume provides a structured snapshot of my qualifications and highlights
            my work across software engineering, research, and entrepreneurship.
          </p>
        </motion.div>

        {/* Download button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 flex gap-3"
        >
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </a>
        </motion.div>

        {/* Embed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-2xl overflow-hidden"
          style={{
            border: '1px solid rgba(124,58,237,0.2)',
            boxShadow: '0 0 40px rgba(124,58,237,0.08)',
          }}
        >
          <iframe
            src={embedUrl}
            title="Rohan Adepu Resume"
            width="100%"
            height="900"
            style={{ display: 'block', border: 'none', background: '#111118' }}
            allow="autoplay"
          />
        </motion.div>

      </div>
    </div>
  )
}
