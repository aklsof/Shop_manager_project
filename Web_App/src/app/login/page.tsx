'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        // Redirect admin to admin panel, others to shop
        if (data.role === 'Administrator') router.push('/admin');
        else router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch { setError('Server error. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Navbar />
      <div className="container form-container">
        <div className="row">
          <div className="col-md-6 col-md-offset-3">
            <div className="panel panel-login panel-default">
              <div className="panel-heading" style={{ textAlign: 'center' }}>Login to AKLI Shopping</div>
              <div className="panel-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit} className="form-horizontal">
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text" className="form-control" id="username"
                      placeholder="Enter username" required
                      value={username} onChange={e => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password" className="form-control" id="password"
                      placeholder="Password" required
                      value={password} onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                      {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                  </div>
                </form>
                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
                  No account? <a href="/registration">Register here</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
