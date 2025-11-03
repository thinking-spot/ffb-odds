import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Matchups from './pages/Matchups'
import Rankings from './pages/Rankings'
import OAuthCallback from './pages/OAuthCallback'

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-brand">
            <Link to="/">🏈 Fantasy Football Vegas Odds</Link>
          </div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/matchups">Matchups</Link>
            <Link to="/rankings">Rankings</Link>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/matchups" element={<Matchups />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>
            Powered by <a href="https://the-odds-api.com/" target="_blank" rel="noreferrer">The Odds API</a>
            {' • '}
            Data updates daily at 10am ET
          </p>
        </footer>
      </div>
    </Router>
  )
}

export default App
