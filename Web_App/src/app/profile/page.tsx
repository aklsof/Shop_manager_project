'use client';

import { useEffect, useState } from 'react';
import { IUser } from '@/lib/user';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLang, LangCode } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { THEME_CATALOGUE, UserVisualPrefs } from '@/lib/settings';

const LANG_NAMES: Record<LangCode, Record<LangCode, string>> = {
  en: { en: 'English', fr: 'Anglais', ar: 'الإنجليزية' },
  fr: { en: 'French', fr: 'Français', ar: 'الفرنسية' },
  ar: { en: 'Arabic', fr: 'Arabe', ar: 'العربية' },
};

export default function ProfilePage() {
  const [user, setUser] = useState<IUser | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { t, lang } = useLang();
  const { userPrefs, setUserPrefs, theme: activeTheme } = useTheme();

  const [formData, setFormData] = useState({
    email: '',
    user_firstName: '',
    user_lastName: '',
    user_address1: '',
    city: '',
    province: '',
    password: ''
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          fetch('/api/user/profile')
            .then(pr => pr.json())
            .then(res => {
              if (res.profile) {
                setProfileData(res.profile);
                setFormData({
                  email: res.profile.email || '',
                  user_firstName: res.profile.user_firstName || '',
                  user_lastName: res.profile.user_lastName || '',
                  user_address1: res.profile.user_address1 || '',
                  city: res.profile.city || '',
                  province: res.profile.province || '',
                  password: ''
                });
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const prefLang = user?.preferred_lang as LangCode | undefined;
  const langName = prefLang ? (LANG_NAMES[prefLang]?.[lang] ?? prefLang) : '—';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');

    try {
      const resp = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await resp.json();
      if (data.success) {
        setSaveStatus('success');
        setProfileData({ ...profileData, ...formData });
        setFormData(prev => ({ ...prev, password: '' }));
        setTimeout(() => {
          setIsEditing(false);
          setSaveStatus('idle');
        }, 1500);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <>
      <Navbar />

      {loading ? (
        <div className="container profile-container">
          <p className="text-center">{t('loading') || 'Loading...'}</p>
        </div>
      ) : user ? (
        <div className="container profile-container">
          <div className="row">
            <div className="col-md-8 col-md-offset-2 col-sm-10 col-sm-offset-1">
              <div className="panel panel-profile panel-default">
                <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ margin: 0 }}>{t('profile_title') || 'Your Profile'}</span>
                  {!isEditing && (
                    <button className="btn btn-default btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', color: '#fff' }} onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </button>
                  )}
                </div>

                <div className={isEditing ? "panel-body" : "panel-body profile-details"}>
                  {isEditing ? (
                    <form onSubmit={handleSave} className="form-horizontal">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>First Name</label>
                            <input type="text" name="user_firstName" className="form-control" value={formData.user_firstName} onChange={handleInputChange} />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Last Name</label>
                            <input type="text" name="user_lastName" className="form-control" value={formData.user_lastName} onChange={handleInputChange} />
                          </div>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Address</label>
                        <input type="text" name="user_address1" className="form-control" value={formData.user_address1} onChange={handleInputChange} />
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>City</label>
                            <input type="text" name="city" className="form-control" value={formData.city} onChange={handleInputChange} />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-group">
                            <label>Province / State</label>
                            <input type="text" name="province" className="form-control" value={formData.province} onChange={handleInputChange} />
                          </div>
                        </div>
                      </div>

                      <hr style={{ margin: '1.5rem 0', borderColor: 'var(--slate-100)' }} />

                      <div className="form-group">
                        <label>New Password (leave blank to keep current)</label>
                        <input type="password" name="password" className="form-control" value={formData.password} onChange={handleInputChange} placeholder="Enter new password to change" />
                      </div>

                      {saveStatus === 'success' && <div className="alert alert-success mt-4">Profile updated successfully!</div>}
                      {saveStatus === 'error' && <div className="alert alert-danger mt-4">Error updating profile.</div>}

                      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={saveStatus === 'saving'}>
                          {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" className="btn btn-action" onClick={() => setIsEditing(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{t('username') || 'Username'}:</strong> <span>{user.username}</span>
                      </div>
                      <div>
                        <strong>Full Name:</strong> <span>{profileData ? `${profileData.user_firstName} ${profileData.user_lastName}`.trim() : '—'}</span>
                      </div>
                      <div>
                        <strong>Email:</strong> <span>{profileData?.email || '—'}</span>
                      </div>
                      <div>
                        <strong>Address:</strong>
                        <span>
                          {profileData?.user_address1 || '—'}
                          {profileData?.city ? `, ${profileData.city}` : ''}
                          {profileData?.province ? `, ${profileData.province}` : ''}
                        </span>
                      </div>
                      <div>
                        <strong>Role:</strong> <span>{user.user_type === 'client' ? 'Customer' : user.role}</span>
                      </div>
                      <div>
                        <strong>{t('preferred_lang') || 'Preferred Language'}:</strong> <span>{langName}</span>
                      </div>
                      <div>
                        <strong>Account Status:</strong>{' '}
                        <span style={{ color: user.is_active ? 'var(--green)' : 'var(--red)' }}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Visual Preferences Panel ── */}
              <div className="panel panel-profile panel-default" style={{ marginTop: '1.5rem' }}>
                <div className="panel-heading">🎨 Visual Preferences</div>
                <div className="panel-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Personalize how the site looks for you. These settings are saved locally in your browser.
                  </p>

                  <div className="settings-section" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '0.95rem' }}>Theme</h2>
                    <div className="theme-grid">
                      {THEME_CATALOGUE.map((t) => {
                        const accentColor = t.vars['--accent'];
                        const bgColor = t.vars['--bg'];
                        const isActive = (userPrefs.theme || activeTheme.key) === t.key;
                        return (
                          <button
                            key={t.key}
                            className={`theme-card${isActive ? ' active' : ''}`}
                            onClick={() => setUserPrefs({ theme: t.key })}
                            style={{
                              background: bgColor,
                              borderColor: isActive ? accentColor : undefined,
                              color: t.vars['--text'],
                            }}
                          >
                            <span style={{
                              display: 'inline-block', width: 12, height: 12,
                              borderRadius: '50%', background: accentColor,
                              marginRight: 6, verticalAlign: 'middle',
                            }} />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="settings-section" style={{ marginBottom: 0 }}>
                    <h2 style={{ fontSize: '0.95rem' }}>Text Size</h2>
                    <div className="font-size-group">
                      {([
                        { key: 'sm' as UserVisualPrefs['fontSize'], label: 'A', title: 'Small' },
                        { key: 'md' as UserVisualPrefs['fontSize'], label: 'A', title: 'Medium', style: { fontSize: '1.1em' } },
                        { key: 'lg' as UserVisualPrefs['fontSize'], label: 'A', title: 'Large', style: { fontSize: '1.25em' } },
                      ]).map(({ key, label, title, style }) => (
                        <button
                          key={key}
                          title={title}
                          className={`font-size-btn${userPrefs.fontSize === key ? ' active' : ''}`}
                          onClick={() => setUserPrefs({ fontSize: key })}
                          style={style}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="container profile-container">
          <div className="row">
            <div className="col-md-8 col-md-offset-2">
              <div className="panel panel-profile panel-default">
                <div className="panel-heading">
                  Access Denied
                </div>
                <div className="panel-body profile-details">
                  <div>
                    <strong>Please <a href="/login">{t('nav_login') || 'Login'}</a></strong> to view your account.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
