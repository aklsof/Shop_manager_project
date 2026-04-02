'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLang } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLang();

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
        setError(data.error || t('server_error'));
      }
    } catch { setError(t('server_error')); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Navbar />
      <div className="container form-container">
        <div className="row">
          <div className="col-md-6 col-md-offset-3">
            <div className="panel panel-login panel-default">
              <div className="panel-heading" style={{ textAlign: 'center' }}>{t('login_title')}</div>
              <div className="panel-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit} className="form-horizontal">
                  <div className="form-group">
                    <label htmlFor="username">{t('username')}</label>
                    <input
                      type="text" className="form-control" id="username"
                      placeholder={t('enter_username')} required
                      value={username} onChange={e => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">{t('password')}</label>
                    <input
                      type="password" className="form-control" id="password"
                      placeholder={t('password')} required
                      value={password} onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                      {loading ? t('signing_in') : t('sign_in')}
                    </button>
                  </div>
                </form>
                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
                  {t('no_account')} <a href="/registration">{t('register_here')}</a>
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
