import './assets/theme.css';
import './App.css';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/home';
import Profile from './pages/profile';
import Navbar from './components/Navbar';
import Favourites from './pages/favourites';
import ActivityLogs from './pages/ActivityLogs';
import Messages from './pages/messages';
import Login from './pages/login';
import SignUp from './pages/signup';
import AdminPanel from './pages/admin';
import OwnerDashboard from './pages/owner';
import AdminLogin from './pages/adminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ChatLauncher from './components/ChatLauncher';

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <ThemeProvider>
      <AuthProvider>
        {!isAuthPage && !isAdminPage && <Navbar />}
        <div className="page-container" style={{paddingTop: isAdminPage || isAuthPage ? '0px' : '60px'}}> 
          {/*  */}
          <ChatLauncher />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Protected routes for regular users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/favourites" element={<Favourites />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/activity-logs" element={<ActivityLogs />} />
            </Route>
            
            {/* Protected routes for admin users */}
            <Route element={<ProtectedRoute requiredRole="admin" redirectPath="/admin/login" />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>

            {/* Protected routes for owners */}
            <Route element={<ProtectedRoute allowedRoles={["owner"]} /> }>
              <Route path="/owner" element={<OwnerDashboard />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
