import { HashRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Resume from './pages/Resume'
import Interests from './pages/Interests'
import Projects from './pages/Projects'
import Social from './pages/Social'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/interests" element={<Interests />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/social" element={<Social />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}
