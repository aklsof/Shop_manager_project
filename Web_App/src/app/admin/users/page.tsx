'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { IUser } from '@/lib/user';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<IUser[]>([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'Store Associate', user_type: 'staff', preferred_lang: 'en' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = () => fetch('/api/admin/users').then(r => r.json()).then(setUsers);

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => { if (!d.user || d.user.role !== 'Administrator') router.push('/login'); else loadUsers(); });
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { setSuccess(`User "${form.username}" created!`); setForm({ username: '', password: '', role: 'Store Associate', user_type: 'staff', preferred_lang: 'en' }); loadUsers(); }
    else setError(data.error);
  }

  async function toggleActive(user: IUser) {
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.user_id, is_active: !user.is_active }) });
    loadUsers();
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">User Management</h1>
        <div className="admin-form-card">
          <h2>Create User Account</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleCreate} className="admin-form">
            <div className="form-row">
              <div className="form-group"><label>Username</label><input className="form-control" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
              <div className="form-group"><label>Password</label><input type="password" className="form-control" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Role</label>
                <select className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option>Store Associate</option>
                  <option>Administrator</option>
                </select>
              </div>
              <div className="form-group"><label>User Type</label>
                <select className="form-control" value={form.user_type} onChange={e => setForm({...form, user_type: e.target.value})}>
                  <option value="staff">Staff</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div className="form-group"><label>Language</label>
                <select className="form-control" value={form.preferred_lang} onChange={e => setForm({...form, preferred_lang: e.target.value})}>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create User</button>
          </form>
        </div>
        <h2 className="section-title">All Users ({users.length})</h2>
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Type</th><th>Lang</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {users.map((u: IUser & { created_at?: string }) => (
              <tr key={u.user_id}>
                <td>{u.user_id}</td><td>{u.username}</td><td>{u.role}</td><td>{u.user_type}</td><td>{u.preferred_lang}</td>
                <td><span style={{ color: u.is_active ? '#27ae60' : '#c0392b' }}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td><button className="btn-action" onClick={() => toggleActive(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );
}
