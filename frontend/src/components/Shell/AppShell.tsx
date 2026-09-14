import React, { useEffect } from 'react';
import { useAuth, isEcaaUser } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    document.body.classList.remove('login-mode');
    document.body.classList.add('authenticated-mode');
    document.body.classList.toggle('role-ecaa', isEcaaUser(user));
  }, [user]);

  return (
    <div id="appShell" style={{ display: 'flex' }}>
      <Sidebar />
      <main className="ui-main">
        <Header />
        {children}
      </main>
    </div>
  );
}
