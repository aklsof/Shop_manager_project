'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function RegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    user_firstName: '',
    user_lastName: '',
    user_address1: '',
    city: '',
    province: '',
    password: '',
    preferred_lang: 'en'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      else setError(data.error || 'Registration failed.');
    } catch {
      setError('Server error. Please try again.');
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
              <div className="panel-heading">Create an Account</div>
              <div className="panel-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit} className="form-horizontal">

                  <div className="row">
                    <div className="col-sm-6 form-group">
                      <label htmlFor="user_firstName">First Name *</label>
                      <input type="text" className="form-control" id="user_firstName" name="user_firstName"
                        required value={form.user_firstName} onChange={handleChange} />
                    </div>
                    <div className="col-sm-6 form-group">
                      <label htmlFor="user_lastName">Last Name *</label>
                      <input type="text" className="form-control" id="user_lastName" name="user_lastName"
                        required value={form.user_lastName} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-sm-6 form-group">
                      <label htmlFor="username">Username *</label>
                      <input type="text" className="form-control" id="username" name="username"
                        placeholder="Choose a username" required minLength={3} value={form.username} onChange={handleChange} />
                    </div>
                    <div className="col-sm-6 form-group">
                      <label htmlFor="password">Password *</label>
                      <input type="password" className="form-control" id="password" name="password"
                        placeholder="Min 8 chars, 1 upper, 1 lower, 1 number" required value={form.password} onChange={handleChange} />
                    </div>
                    <div className="col-sm-6 form-group">
                      <label htmlFor="email">Email Address *</label>
                      <input type="email" className="form-control" id="email" name="email"
                        required value={form.email} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="user_address1">Address</label>
                    <input type="text" className="form-control" id="user_address1" name="user_address1"
                      placeholder="123 Main St" value={form.user_address1} onChange={handleChange} />
                  </div>

                  <div className="row">
                    <div className="col-sm-6 form-group">
                      <label htmlFor="city">City</label>
                      <input type="text" className="form-control" id="city" name="city"
                        value={form.city} onChange={handleChange} />
                    </div>
                    <div className="col-sm-6 form-group">
                      <label htmlFor="province">Province/State</label>
                      <input type="text" className="form-control" id="province" name="province"
                        value={form.province} onChange={handleChange} />
                    </div>
                  </div>


                  <div className="col-sm-6 form-group">
                    <label htmlFor="preferred_lang">Preferred Language</label>
                    <select className="form-control" id="preferred_lang" name="preferred_lang" value={form.preferred_lang} onChange={handleChange}>
                      <option value="en">English</option>
                      <option value="fr">Français (French)</option>
                      <option value="ar">العربية (Arabic)</option>
                    </select>
                  </div>


                  <div className="form-group mt-3">
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                      {loading ? 'Registering…' : 'Register'}
                    </button>
                  </div>
                </form>
                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
                  Already have an account? <a href="/login">Login</a>
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