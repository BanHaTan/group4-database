import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import api from './api';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TaskBoard from './pages/TaskBoard';
import Notifications from './pages/Notifications';

export const AuthContext = createContext();
export function useAuth() { return useContext(AuthContext); }

function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetchUnread = () => {
      api.get('/notifications/unread-count')
        .then(r => setUnread(r.data.count))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>📋 PM System</h2>
        <p>Quản Lý Dự Án Phần Mềm</p>
      </div>
      <nav className="sidebar-nav">
      
        <Link to="/projects" className={isActive('/projects') ? 'active' : ''}>
          📁 Dự Án
        </Link>
        <Link to="/notifications" className={isActive('/notifications') ? 'active' : ''}>
          🔔 Thông Báo
          {unread > 0 && <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{unread}</span>}
        </Link>
      </nav>
      <div className="sidebar-user">
        <span>👤 {user?.username}</span>
        <button onClick={logout}>Đăng xuất</button>
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/board" element={<TaskBoard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="*" element={<Navigate to="/projects" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#818cf8', fontSize: '18px' }}>
      Đang tải...
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter basename={import.meta.env.PROD ? '/group4-database' : '/'}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/projects" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/projects" /> : <Register />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}