import './styles/navbar.css';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { IMAGES } from '../config';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markNotificationRead, deleteNotification } from '../services/notifications';
const Navbar = () => {
  const IMAGES_URL = IMAGES.users;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const userRole = useMemo(() => (user?.role || 'user'), [user]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-menu')) {
        setShowProfileMenu(false);
      }
      if (!event.target.closest('.notifications')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Handle scroll effect for navbar
  useEffect(() => {
    // Initialize sidebar state
    const initSidebarState = () => {
      const mainElement = document.querySelector('main');
      
      if (window.innerWidth > 768 && mainElement) {
        // On desktop, ensure sidebar-hidden class is removed
        mainElement.classList.remove('sidebar-hidden');
      }
      // On mobile, we don't need to manage sidebar-hidden class
    };
    
    // Call initialization
    initSidebarState();
    
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    // Handle window resize
    const handleResize = () => {
      const mainElement = document.querySelector('main');
      
      if (window.innerWidth > 768) {
        // Reset mobile-specific styles when returning to desktop
        if (mainElement) {
          // On desktop, remove sidebar-hidden class to restore default layout
          mainElement.classList.remove('sidebar-hidden');
        }
      }
      // On mobile, we don't need to manage sidebar-hidden class anymore
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Poll notifications periodically
  useEffect(() => {
    let intervalId;
    const load = async () => {
      if (!isAuthenticated) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const list = await fetchNotifications();
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    };
    load();
    intervalId = setInterval(load, 30000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, userRole]);

  const handleOpenNotifications = async () => {
    setShowNotifications(!showNotifications);
  };

  const handleItemClick = async (id) => {
    if (!id) return;
    const ok = await markNotificationRead(id);
    if (ok) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = await deleteNotification(id);
    if (ok) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // User data is now provided by auth context

  const handleLogout = () => {
    // Use auth context to logout
    logout();
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
    // Toggle a class on the sidebar element to show/hide it
    const sidebar = document.querySelector('.left');
    
    if (sidebar) {
      sidebar.classList.toggle('active');
    }
    
    // Close other menus when mobile menu is toggled
    setShowNotifications(false);
    setShowProfileMenu(false);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
    const sidebar = document.querySelector('.left');
    
    if (sidebar) {
      sidebar.classList.remove('active');
    }
  };

  return (
    <>
      <header className={scrolled ? 'scrolled' : ''}>
        <Link className="logo" to="/">
          Hajzee
        </Link>
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <i className={`fas ${showMobileMenu ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
        {/* Overlay to close sidebar when clicking outside */}
        <div 
          className={`sidebar-overlay ${showMobileMenu ? 'active' : ''}`} 
          onClick={closeMobileMenu}
        ></div>
        <nav>
          <button
            className={`darkmodeBt ${darkMode && 'active'}`}
            onClick={toggleDarkMode}
            title="Toggle dark mode"
          >
            <span></span>
          </button>
          <span className="notifications">
            <button onClick={handleOpenNotifications} title="Notifications">
              <i className="fas fa-bell"></i>
              {unreadCount > 0 && (
                <span className="badge" aria-label={`${unreadCount} unread notifications`}>{unreadCount}</span>
              )}
            </button>
            <div className="items" style={{ display: showNotifications ? 'flex' : 'none' }}>
              {notifications.length === 0 ? (
                <div className="item" style={{ justifyContent: 'center' }}>
                  <i className="fas fa-inbox"></i>
                  <div className="right">
                    <h5>No Notifications</h5>
                    <p>You're all caught up</p>
                    <div className="time">&nbsp;</div>
                  </div>
                </div>
              ) : (
                
                notifications.slice(0, 6).map((n) => (
                  <div key={n.id} className={`item ${n.read ? 'read' : 'unread'} ${n.type || 'general'}`}>
                    <i className={n.icon}></i>
                    <div className="right">
                      <h5>{n.title}</h5>
                      <p>{n.message}</p>
                      <div className="time">{new Date(n.createdAt).toLocaleString('en-GB', { timeZone: 'UTC' })}</div>
                    </div>
                    <div className="actions">
                      {/* Quick chat open for message notifications if context available */}
                      {(n.type === 'general' || n.type === 'message') && (
                        <button
                          className="notif-action"
                          title="Open Chat"
                          onClick={() => {
                            try {
                              const currentUserId = user?._id || user?.id;
                              const senderObj = n.sender || {};
                              const recipientObj = n.recipient || {};
                              const senderId = typeof senderObj === 'object' ? (senderObj?._id || senderObj?.id) : senderObj;
                              const recipientId = typeof recipientObj === 'object' ? (recipientObj?._id || recipientObj?.id) : recipientObj;
                              const senderRole = typeof senderObj === 'object' ? senderObj?.role : undefined;
                              const recipientRole = typeof recipientObj === 'object' ? recipientObj?.role : undefined;
                              const playgroundId = (n.playground && (n.playground._id || n.playground.id)) || (n.booking && (n.booking.playground?._id || n.booking.playground?.id)) || undefined;
                              let ownerId = (n.owner && (n.owner._id || n.owner.id)) || undefined;
                              if (!ownerId) {
                                if (senderRole === 'owner') ownerId = senderId;
                                else if (recipientRole === 'owner') ownerId = recipientId;
                              }
                              if (!ownerId && senderId && String(senderId) !== String(currentUserId)) ownerId = senderId;
                              const name = (n.owner && n.owner.name) || (senderRole === 'owner' && senderObj?.name) || (recipientRole === 'owner' && recipientObj?.name) || undefined;
                              const detail = { ownerId, playgroundId, name };
                              const evt = new CustomEvent('open-chat', { detail });
                              window.dispatchEvent(evt);
                              setShowNotifications(false);
                            } catch {}
                          }}
                        >
                          <i className="fas fa-comments"></i>
                        </button>
                      )}
                      {!n.read && (
                        <button
                          className="notif-action mark-read"
                          onClick={() => handleItemClick(n.id)}
                          title="Mark as read"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      <button
                        className="notif-action delete"
                        onClick={() => handleDelete(n.id)}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </span>
          <div className="profile-menu">
            {isAuthenticated ? (
              <>
                <button
                  className="profile"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  {user?.photo ? (
                    <img src={`${IMAGES_URL}${user.photo}`} alt="Profile" />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </button>
                <div
                  className="profile-dropdown"
                  style={{ display: showProfileMenu ? 'block' : 'none' }}
                >
                  <Link to="/messages" onClick={() => setShowProfileMenu(false)}>
                    <span><i className="fas fa-comments"></i></span>
                    Messages
                  </Link>
                  <Link to="/profile" onClick={() => setShowProfileMenu(false)}>
                    <span><i className="fas fa-user-circle"></i></span>
                    Profile
                  </Link>
                  <button onClick={handleLogout}>
                    <span><i className="fas fa-sign-out-alt"></i></span>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <Link className="profile-icon" to="/login">
                <i className="fas fa-user"></i>
              </Link>
            )}
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
