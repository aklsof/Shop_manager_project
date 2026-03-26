'use client';

import { useEffect, useState } from 'react';
import { IUser } from '@/lib/user';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ProfilePage() {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />

      {loading ? (
        <div className="container profile-container">
          <p className="text-center">Loading...</p>
        </div>
      ) : user ? (
        <div className="container profile-container">
          <div className="row">
            <div className="col-md-8 col-md-offset-2 col-sm-10 col-sm-offset-1">
              <div className="panel panel-profile panel-default">
                <div className="panel-heading">My Account</div>
                <div className="panel-body profile-details">
                  <div>
                    <strong>Username:</strong> {user.username}
                  </div>
                  <div>
                    <strong>Role:</strong> {user.user_type === 'client' ? 'Customer' : user.role}
                  </div>
                  <div>
                    <strong>Preferred Language:</strong> {user.preferred_lang === 'ar' ? 'Arabic' : 'English'}
                  </div>
                  <div>
                    <strong>Account Status:</strong>{' '}
                    <span style={{ color: user.is_active ? 'green' : 'red' }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
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
                <div className="panel-heading">Access Denied</div>
                <div className="panel-body profile-details">
                  <div>
                    <strong>Please <a href="/login">login</a></strong> to view your account.
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
