'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLang, LangCode } from '@/lib/i18n';

export default function RegistrationPage() {
  const router = useRouter();
  const { t, lang } = useLang();

  const [form, setForm] = useState({
    username: '',
    email: '',
    user_firstName: '',
    user_lastName: '',
    user_address1: '',
    city: '',
    province: '',
    password: '',
    preferred_lang: lang as string,
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError(t('agree_terms'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) router.push('/login');
      else setError(data.error || t('server_error'));
    } catch {
      setError(t('server_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container form-container" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <div className="row">
          <div className="col-md-8 col-md-offset-2">
            <div className="panel panel-login panel-default">
              <div className="panel-heading">{t('reg_title')}</div>
              <div className="panel-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit} className="form-horizontal">

                  <div className="row">
                    <div className="col-sm-6 form-group">
                      <label htmlFor="user_firstName">{t('first_name')}</label>
                      <input type="text" className="form-control" id="user_firstName" name="user_firstName"
                        required value={form.user_firstName} onChange={handleChange} />
                    </div>
                    <div className="col-sm-6 form-group">
                      <label htmlFor="user_lastName">{t('last_name')}</label>
                      <input type="text" className="form-control" id="user_lastName" name="user_lastName"
                        required value={form.user_lastName} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-sm-6 form-group">
                      <label htmlFor="username">{t('username_label')}</label>
                      <input type="text" className="form-control" id="username" name="username"
                        placeholder={t('username_ph')} required minLength={3}
                        value={form.username} onChange={handleChange} />
                    </div>
                    <div className="col-sm-6 form-group">
                      <label htmlFor="password">{t('password_label')}</label>
                      <input type="password" className="form-control" id="password" name="password"
                        placeholder={t('password_ph')} required
                        value={form.password} onChange={handleChange} />
                    </div>
                    <div className="col-sm-6 form-group">
                      <label htmlFor="email">{t('email_label')}</label>
                      <input type="email" className="form-control" id="email" name="email"
                        required value={form.email} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="user_address1">{t('address_label')}</label>
                    <input type="text" className="form-control" id="user_address1" name="user_address1"
                      placeholder={t('address_ph')} value={form.user_address1} onChange={handleChange} />
                  </div>

                  <div className="row">
                    <div className="col-sm-6 form-group">
                      <label htmlFor="city">{t('city_label')}</label>
                      <input type="text" className="form-control" id="city" name="city"
                        value={form.city} onChange={handleChange} />
                    </div>
                    <div className="col-sm-6 form-group">
                      <label htmlFor="province">{t('province_label')}</label>
                      <input type="text" className="form-control" id="province" name="province"
                        value={form.province} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="col-sm-6 form-group">
                    <label htmlFor="preferred_lang">{t('preferred_lang')}</label>
                    <select className="form-control" id="preferred_lang" name="preferred_lang"
                      value={form.preferred_lang} onChange={handleChange}>
                      <option value="en">{t('lang_en')}</option>
                      <option value="fr">{t('lang_fr')}</option>
                      <option value="ar">{t('lang_ar')}</option>
                    </select>
                  </div>

                  <div className="col-sm-12 form-group">
                    <div className="checkbox" style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="agree" 
                        checked={agreed} 
                        onChange={(e) => setAgreed(e.target.checked)} 
                        style={{ marginTop: '4px' }}
                      />
                      <label htmlFor="agree" style={{ fontWeight: 'normal', fontSize: '0.85rem' }}>
                        {t('agree_terms')}
                        <br />
                        <a href="/terms" target="_blank" style={{ color: '#3498db' }}>{t('terms')}</a> | <a href="/privacy" target="_blank" style={{ color: '#3498db' }}>{t('privacy')}</a>
                      </label>
                    </div>
                  </div>

                  <div className="form-group mt-3">
                    <button type="submit" className="btn btn-primary w-100" disabled={loading || !agreed}>
                      {loading ? t('registering') : t('register_btn')}
                    </button>
                  </div>
                </form>
                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
                  {t('already_have_acct')} <a href="/login">{t('login_link')}</a>
                </p>
              </div>
            </div>
          </div>
        </div >
      </div >
      <Footer />
    </>
  );
}