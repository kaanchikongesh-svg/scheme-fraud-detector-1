import { useLocation, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content">
        <Header pathname={location.pathname} />
        <main className="page-wrapper">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
