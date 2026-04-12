import GlassCard from './GlassCard'

export default function SocialCard({ name, url, description, icon }) {
  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(124,58,237,0.12)',
            border: '1px solid rgba(124,58,237,0.28)',
          }}
        >
          {icon}
        </div>
        <h3
          className="text-xl font-bold text-white"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {name}
        </h3>
      </div>

      <p
        className="text-sm mb-6 leading-relaxed flex-1"
        style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
      >
        {description}
      </p>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 self-start"
        style={{
          fontFamily: "'Syne', sans-serif",
          background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
        }}
      >
        Visit Profile →
      </a>
    </GlassCard>
  )
}
