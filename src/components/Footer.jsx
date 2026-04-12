export default function Footer() {
  return (
    <footer
      className="py-8 text-center"
      style={{ borderTop: '1px solid rgba(30,30,46,0.8)' }}
    >
      <p
        className="text-sm"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: '#64748b' }}
      >
        <span style={{ color: '#7c3aed' }}>©</span> {new Date().getFullYear()}{' '}
        Rohan Adepu — Built with React &amp; Vite
      </p>
    </footer>
  )
}
