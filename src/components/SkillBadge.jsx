export default function SkillBadge({ children }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: 'rgba(124,58,237,0.12)',
        border: '1px solid rgba(124,58,237,0.28)',
        color: '#a78bfa',
      }}
    >
      {children}
    </span>
  )
}
