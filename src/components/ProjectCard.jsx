import GlassCard from './GlassCard'
import SkillBadge from './SkillBadge'

export default function ProjectCard({ title, description, bullets, tags, link }) {
  return (
    <GlassCard className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <h3
          className="text-lg font-bold text-white leading-snug"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </h3>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 flex-shrink-0 text-xs font-medium transition-colors hover:text-purple-300"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: '#a78bfa',
            }}
          >
            GitHub →
          </a>
        )}
      </div>

      <p className="text-sm mb-4" style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>
        {description}
      </p>

      <ul className="space-y-1.5 mb-5 flex-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#cbd5e1' }}>
            <span style={{ color: '#7c3aed', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>›</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif" }}>{b}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <SkillBadge key={tag}>{tag}</SkillBadge>
        ))}
      </div>
    </GlassCard>
  )
}
