'use client';

import { useEffect, useState } from 'react';
import { IUser } from '@/lib/user';
import { useLang, LangCode } from '@/lib/i18n';

const LANG_OPTIONS: { code: LangCode; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
];

export default function Navbar() {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const { t, lang, setLang } = useLang();

  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <>
      {/* Bootstrap 5 CSS */}
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <nav className="navbar navbar-expand-lg">
        <div className="container-fluid">
          <a className="navbar-brand" href="/">AKLI shopping website</a>
          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setNavOpen(!navOpen)}
            aria-controls="navbarNavDropdown"
            aria-expanded={navOpen}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className={`collapse navbar-collapse${navOpen ? ' show' : ''}`} id="navbarNavDropdown">
            <ul className="navbar-nav">
              <li className="nav-item">
                <a className="nav-link active" aria-current="page" href="/">{t('nav_shop')}</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/cart">{t('nav_cart')}</a>
              </li>
              {user && (
                <li className="nav-item">
                  <a className="nav-link" href="/orders">{t('nav_my_orders')}</a>
                </li>
              )}
              {user && (user.role === 'Administrator') && (
                <li className="nav-item">
                  <a className="nav-link" href="/admin">{t('nav_admin')}</a>
                </li>
              )}
            </ul>

            {/* Auth links + language switcher */}
            <ul className="navbar-nav ms-auto align-items-center">
              {/* Language switcher */}
              <li className="nav-item d-flex gap-1 me-2">
                {LANG_OPTIONS.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => setLang(code)}
                    className="btn btn-sm"
                    style={{
                      fontWeight: lang === code ? 700 : 400,
                      textDecoration: lang === code ? 'underline' : 'none',
                      padding: '2px 6px',
                      fontSize: '0.8rem',
                    }}
                    aria-label={`Switch to ${code}`}
                  >
                    {label}
                  </button>
                ))}
              </li>

              {!loading && (
                user ? (
                  <>
                    <li className="nav-item">
                      <a className="nav-link" href="/profile">{user.username}</a>
                    </li>
                    <li className="nav-item">
                      <button
                        className="nav-link btn btn-link"
                        onClick={handleLogout}
                        style={{ cursor: 'pointer' }}
                      >
                        {t('nav_logout')}
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="nav-item">
                      <a className="nav-link" href="/login">{t('nav_login')}</a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="/registration">{t('nav_register')}</a>
                    </li>
                  </>
                )
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Bootstrap JS */}
      <script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        crossOrigin="anonymous"
        async
      ></script>
    </>
  );
}
