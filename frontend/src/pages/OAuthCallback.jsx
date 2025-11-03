import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')

  useEffect(() => {
    const sessionId = searchParams.get('session')
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      console.error('OAuth error:', error)
      // Redirect to home after showing error
      setTimeout(() => navigate('/'), 3000)
      return
    }

    if (success && sessionId) {
      // Store session in localStorage
      localStorage.setItem('yahoo_session', sessionId)
      setStatus('success')

      // Redirect to home after successful authentication
      setTimeout(() => navigate('/'), 2000)
    } else {
      setStatus('error')
      setTimeout(() => navigate('/'), 3000)
    }
  }, [searchParams, navigate])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      {status === 'processing' && (
        <>
          <h2>Processing Yahoo Authentication...</h2>
          <div className="spinner" style={{ marginTop: '1rem' }}>⏳</div>
        </>
      )}

      {status === 'success' && (
        <>
          <h2 style={{ color: '#28a745' }}>✓ Successfully Connected!</h2>
          <p>Redirecting you back to the home page...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <h2 style={{ color: '#dc3545' }}>Authentication Failed</h2>
          <p>There was a problem connecting your Yahoo account.</p>
          <p>Redirecting you back to try again...</p>
        </>
      )}
    </div>
  )
}

export default OAuthCallback
