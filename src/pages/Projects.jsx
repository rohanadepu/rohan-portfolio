import { motion } from 'framer-motion'
import ProjectCard from '../components/ProjectCard'

const projects = [
  {
    title: 'Real-Time Event Streaming & Analytics Platform',
    description:
      'A production-grade real-time data platform engineered for high throughput, low latency, and operational resilience.',
    bullets: [
      'Handles 5,000+ events/sec using Apache Kafka, Flink/Spark Streaming, Redis/Elasticsearch for hot storage, and TimescaleDB for historical queries.',
      'Anomaly detection (z-score, MAD) and API endpoints (FastAPI/Node) for KPIs and alerts — p95 latency ≤ 150ms with zero-loss crash recovery.',
      'Full observability with Prometheus, Grafana, and Alertmanager; containerized with Docker, deployed on Kubernetes (Helm), and load-tested via k6.',
    ],
    tags: ['Kafka', 'Flink', 'Kubernetes', 'Redis', 'FastAPI', 'Prometheus', 'Docker', 'TimescaleDB'],
    link: 'https://github.com/rohanadepu',
  },
  {
    title: 'Edvise — Academic Planning Platform',
    description:
      'A course-planning web application that brings degree visualization and schedule intelligence to university students — adopted by CU Boulder and CU Denver.',
    bullets: [
      'Degree visualization, schedule optimization, and progress tracking for students across multiple CU campuses.',
      'Frontend built in React with secure authentication and interactive D3-powered visualizations; backend in Node.js with Express.',
      'Led product design and stakeholder coordination with university registrars for feature alignment and pilot deployment.',
    ],
    tags: ['React', 'Node.js', 'Express', 'PostgreSQL', 'D3.js', 'JWT'],
    link: 'https://github.com/rohanadepu',
  },
  {
    title: 'Personal Finance Data Aggregator',
    description:
      'An end-to-end ML-powered data platform that aggregates financial transactions and delivers intelligent spend insights and forecasts.',
    bullets: [
      'Built with Airflow (Cloud Composer), Spark (Databricks), Great Expectations, and DuckDB/PostgreSQL for scalable ETL.',
      'Anomaly detection and cashflow forecasting using scikit-learn, Prophet, ARIMA, and LSTM tracked in MLflow — F1 ≥ 0.70, MAPE ≤ 15%.',
      'Interactive dashboards in Streamlit/Superset for spend insights and alerts; automated pipelines with Docker & GitHub Actions.',
    ],
    tags: ['Airflow', 'Spark', 'scikit-learn', 'Prophet', 'MLflow', 'DuckDB', 'Docker', 'LSTM'],
    link: 'https://github.com/rohanadepu',
  },
]

const experiences = [
  {
    company: 'Empower',
    role: 'Software Engineering Intern',
    period: 'May – Aug 2025',
    bullets: [
      'Built an interactive API dependency graph (React, Vis.js, Neo4j) to visualize inter-service relationships, reducing incident resolution time by 30%.',
      'Collaborated with backend engineers to integrate service metadata and automate graph updates into internal portals.',
    ],
    tags: ['React', 'Vis.js', 'Neo4j', 'TypeScript', 'AWS'],
  },
  {
    company: 'University of Missouri',
    role: 'AI & Cybersecurity Researcher',
    period: 'May – Jul 2024',
    bullets: [
      'Co-authored a paper on federated learning-enabled network anomaly detection for drone swarms — accepted at ICDCN 2025.',
      'Led implementation of network security attack and defense strategies using Flower, TensorFlow, and PyTorch.',
    ],
    tags: ['Python', 'Flower', 'TensorFlow', 'PyTorch', 'Pandas'],
  },
]

export default function Projects() {
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
          <p className="section-label mb-3">// projects & experience</p>
          <h1
            className="font-bold mb-4"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              color: '#f1f5f9',
            }}
          >
            What I&apos;ve <span className="gradient-text">Built</span>
          </h1>
          <p
            className="max-w-2xl leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#64748b', fontSize: '0.95rem' }}
          >
            A selection of projects that demonstrate my ability to design, build, and ship
            systems across data engineering, machine learning, and full-stack development.
          </p>
        </motion.div>

        {/* Project cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {projects.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
            >
              <ProjectCard {...p} />
            </motion.div>
          ))}
        </div>

        {/* Experience section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <p className="section-label mb-3">// work experience</p>
          <h2
            className="font-bold mb-8"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              color: '#f1f5f9',
            }}
          >
            Professional <span className="gradient-text">Experience</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {experiences.map((exp, i) => (
            <motion.div
              key={exp.company}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl p-6 glass-hover"
              style={{
                background: 'rgba(17,17,24,0.85)',
                border: '1px solid rgba(30,30,46,0.9)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3
                    className="font-bold text-white text-base"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {exp.company}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: '#a78bfa', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {exp.role}
                  </p>
                </div>
                <span
                  className="text-xs flex-shrink-0 ml-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: '#475569' }}
                >
                  {exp.period}
                </span>
              </div>

              <ul className="space-y-1.5 my-4">
                {exp.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm" style={{ color: '#94a3b8' }}>
                    <span style={{ color: '#7c3aed', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>›</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif" }}>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                {exp.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.22)',
                      color: '#93c5fd',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  )
}
