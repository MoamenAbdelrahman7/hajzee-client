import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import './styles/admin.css';
import AdCreateForm from '../components/AdCreateForm';
import AdList from '../components/AdList';
import { useTheme } from '../context/ThemeContext';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [playgrounds, setPlaygrounds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user'
  });
  const [clearDataLoading, setClearDataLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  // New state for admin UX features
  const [userSearch, setUserSearch] = useState('');
  const [playgroundSearch, setPlaygroundSearch] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingDateFrom, setBookingDateFrom] = useState('');
  const [bookingDateTo, setBookingDateTo] = useState('');
  const [userSort, setUserSort] = useState({ key: 'name', dir: 'asc' });
  const [pgSort, setPgSort] = useState({ key: 'name', dir: 'asc' });
  const [bookingSort, setBookingSort] = useState({ key: 'start', dir: 'desc' });
  const [userPage, setUserPage] = useState(1);
  const [pgPage, setPgPage] = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const [pageSizeUsers, setPageSizeUsers] = useState(10);
  const [pageSizePgs, setPageSizePgs] = useState(10);
  const [pageSizeBookings, setPageSizeBookings] = useState(10);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedPgIds, setSelectedPgIds] = useState([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const API_URL = config.API_URL;

  // Check if user is admin and fetch users on component mount
  useEffect(() => {
    const checkAdminAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!token || !storedUser) {
        navigate('/admin/login', { replace: true });
        return;
      }
      
      try {
        const user = JSON.parse(storedUser);
        if (user.role !== 'admin') {
          navigate('/admin/login', { replace: true });
          return;
        }
        
        // If user is admin, fetch all data
        fetchUsers();
        fetchPlaygrounds();
        fetchBookings();
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/admin/login', { replace: true });
      }
    };
    
    checkAdminAuth();
  }, [navigate]);

  // Cleanup effect to handle component unmounting
  useEffect(() => {
    return () => {
      // Cleanup function to prevent memory leaks
      setUsers([]);
      setPlaygrounds([]);
      setBookings([]);
      setError('');
      setSuccess('');
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'user' });
      setActiveTab('users');
      setLoading(false);
      setClearDataLoading(false);
    };
  }, []);

  const normalizeText = (value) => (String(value || '').toLowerCase());

  const sortArray = useCallback((arr, cfg) => {
    const { key, dir } = cfg || {};
    const factor = dir === 'desc' ? -1 : 1;
    return [...arr].sort((a, b) => {
      const av = key?.includes('.') ? key.split('.').reduce((o, k) => (o ? o[k] : undefined), a) : a[key];
      const bv = key?.includes('.') ? key.split('.').reduce((o, k) => (o ? o[k] : undefined), b) : b[key];
      const as = typeof av === 'number' ? av : String(av || '').toLowerCase();
      const bs = typeof bv === 'number' ? bv : String(bv || '').toLowerCase();
      if (as < bs) return -1 * factor;
      if (as > bs) return 1 * factor;
      return 0;
    });
  }, []);

  const toggleSort = (current, key) => {
    if (current.key === key) {
      return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
    }
    return { key, dir: 'asc' };
  };

  // Derived filtered, sorted, paginated data
  const filteredUsers = useMemo(() => {
    const q = normalizeText(userSearch);
    let list = users.filter(u => {
      const roleOk = userRoleFilter === 'all' || (u.role || 'user') === userRoleFilter;
      const matches = !q || normalizeText(`${u.name} ${u.email} ${u.role}`).includes(q);
      return roleOk && matches;
    });
    list = sortArray(list, userSort);
    return list;
  }, [users, userSearch, userRoleFilter, userSort, sortArray]);

  const filteredPlaygrounds = useMemo(() => {
    const q = normalizeText(playgroundSearch);
    let list = playgrounds.filter(p => {
      const matches = !q || normalizeText(`${p.name} ${p.location} ${p.owner?.name || ''}`).includes(q);
      return matches;
    });
    list = sortArray(list, pgSort);
    return list;
  }, [playgrounds, playgroundSearch, pgSort, sortArray]);

  const filteredBookings = useMemo(() => {
    const q = normalizeText(bookingSearch);
    let list = bookings.filter(b => {
      const status = b.status || (typeof b.confirmed === 'boolean' ? (b.confirmed ? 'confirmed' : 'pending') : 'unknown');
      const statusOk = bookingStatusFilter === 'all' || status === bookingStatusFilter;
      const time = new Date(b.start).getTime();
      const fromOk = bookingDateFrom ? time >= new Date(bookingDateFrom).getTime() : true;
      const toOk = bookingDateTo ? time <= new Date(bookingDateTo).getTime() + 86399999 : true;
      const matches = !q || normalizeText(`${b.playground?.name || ''} ${b.user?.name || ''}`).includes(q);
      return statusOk && fromOk && toOk && matches;
    });
    list = sortArray(list, bookingSort);
    return list;
  }, [bookings, bookingSearch, bookingStatusFilter, bookingDateFrom, bookingDateTo, bookingSort, sortArray]);

  const paginate = (list, page, size) => {
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  };

  const usersPageData = useMemo(() => paginate(filteredUsers, userPage, pageSizeUsers), [filteredUsers, userPage, pageSizeUsers]);
  const pgsPageData = useMemo(() => paginate(filteredPlaygrounds, pgPage, pageSizePgs), [filteredPlaygrounds, pgPage, pageSizePgs]);
  const bookingsPageData = useMemo(() => paginate(filteredBookings, bookingPage, pageSizeBookings), [filteredBookings, bookingPage, pageSizeBookings]);

  const totalRevenue = useMemo(() => {
    return bookings.reduce((sum, b) => (['confirmed', 'completed'].includes(b.status) ? sum + (Number(b.cost) || 0) : sum), 0);
  }, [bookings]);

  const downloadCSV = (rows, filename) => {
    if (!rows || rows.length === 0) return;
    const escape = (v) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const csv = rows.map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportUsersCSV = () => {
    const header = ['Name', 'Email', 'Role'];
    const data = filteredUsers.map(u => [u.name, u.email, u.role || 'user']);
    downloadCSV([header, ...data], 'users.csv');
  };

  const exportPlaygroundsCSV = () => {
    const header = ['Name', 'Location', 'Size', 'Cost/Hour', 'Owner'];
    const data = filteredPlaygrounds.map(p => [p.name, p.location, `${p.size}x${p.size}`, p.costPerHour, p.owner?.name || '']);
    downloadCSV([header, ...data], 'playgrounds.csv');
  };

  const exportBookingsCSV = () => {
    const header = ['Playground', 'User', 'Start', 'End', 'Duration(h)', 'Cost', 'Status'];
    const data = filteredBookings.map(b => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      const diffMs = end - start;
      const diffHours = diffMs > 0 ? (diffMs / (1000 * 60 * 60)) : 0;
      return [
        b.playground?.name || '',
        b.user?.name || '',
        start.toISOString(),
        end instanceof Date && !isNaN(end) ? end.toISOString() : '',
        diffHours.toFixed(2),
        b.cost || 0,
        b.status || ''
      ];
    });
    downloadCSV([header, ...data], 'bookings.csv');
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}users`, {
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data || []);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching users');
      setLoading(false);
    }
  };

  const fetchPlaygrounds = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await fetch(`${API_URL}playgrounds`, {
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playgrounds');
      }

      const data = await response.json();
      setPlaygrounds(data.data || data.result.data || []);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching playgrounds');
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await fetch(`${API_URL}bookings`, {
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data.data || []);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching bookings');
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('⚠️ WARNING: This action will permanently delete ALL data including users, playgrounds, and bookings. This action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    if (!window.confirm('🚨 FINAL CONFIRMATION: You are about to delete ALL data from the system. This will remove all users, playgrounds, and bookings permanently. Type "DELETE ALL" to confirm.')) {
      return;
    }

    const confirmation = prompt('Type "DELETE ALL" to confirm this action:');
    if (confirmation !== 'DELETE ALL') {
      const evt = new CustomEvent('app-alert', { detail: { type: 'info', message: 'Action cancelled. Data remains safe.' } });
      window.dispatchEvent(evt);
      return;
    }

    try {
      setClearDataLoading(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}admin/clear-data`, {
        method: 'DELETE',
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear data');
      }

      const data = await response.json();
      setSuccess('All data has been successfully cleared from the system.');
      
      // Clear local state
      setUsers([]);
      setPlaygrounds([]);
      setBookings([]);
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to admin login
      setTimeout(() => {
        navigate('/admin/login');
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'An error occurred while clearing data');
    } finally {
      setClearDataLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Remove the deleted user from state
      setUsers(users.filter(user => user._id !== userId));
      setSuccess('User deleted successfully');
    } catch (err) {
      setError(err.message || 'An error occurred while deleting the user');
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedUserIds.length} selected user(s)?`)) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: token };
      await Promise.all(selectedUserIds.map(id => fetch(`${API_URL}users/${id}`, { method: 'DELETE', headers })));
      setUsers(prev => prev.filter(u => !selectedUserIds.includes(u._id)));
      setSelectedUserIds([]);
      setSuccess('Selected users deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to bulk delete users');
    }
  };

  const handleDeletePlayground = async (playgroundId) => {
    if (!window.confirm('Are you sure you want to delete this playground? This will also delete all associated bookings.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}playgrounds/${playgroundId}`, {
        method: 'DELETE',
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete playground');
      }

      // Remove the deleted playground from state
      setPlaygrounds(playgrounds.filter(playground => playground._id !== playgroundId));
      setSuccess('Playground deleted successfully');
    } catch (err) {
      setError(err.message || 'An error occurred while deleting the playground');
    }
  };

  const handleBulkDeletePlaygrounds = async () => {
    if (selectedPgIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedPgIds.length} selected playground(s)? This will remove related bookings.`)) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: token };
      await Promise.all(selectedPgIds.map(id => fetch(`${API_URL}playgrounds/${id}`, { method: 'DELETE', headers })));
      setPlaygrounds(prev => prev.filter(p => !selectedPgIds.includes(p._id)));
      setSelectedPgIds([]);
      setSuccess('Selected playgrounds deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to bulk delete playgrounds');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }

      // Remove the deleted booking from state
      setBookings(bookings.filter(booking => booking._id !== bookingId));
      setSuccess('Booking deleted successfully');
    } catch (err) {
      setError(err.message || 'An error occurred while deleting the booking');
    }
  };

  const handleBulkDeleteBookings = async () => {
    if (selectedBookingIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedBookingIds.length} selected booking(s)?`)) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: token };
      await Promise.all(selectedBookingIds.map(id => fetch(`${API_URL}bookings/${id}`, { method: 'DELETE', headers })));
      setBookings(prev => prev.filter(b => !selectedBookingIds.includes(b._id)));
      setSelectedBookingIds([]);
      setSuccess('Selected bookings deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to bulk delete bookings');
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update booking status');
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus, confirmed: newStatus === 'confirmed' } : b));
    } catch (err) {
      setError(err.message || 'An error occurred while updating booking');
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role || 'user'
    });
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}users/${editingUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      
      // Update the user in state
      setUsers(users.map(user => 
        user._id === editingUser._id ? {...user, ...updatedUser.data} : user
      ));
      
      // Reset editing state
      setEditingUser(null);
      setSuccess('User updated successfully');
    } catch (err) {
      setError(err.message || 'An error occurred while updating the user');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: 'Pending', class: 'admin-status-pending' },
      confirmed: { text: 'Confirmed', class: 'admin-status-confirmed' },
      completed: { text: 'Completed', class: 'admin-status-completed' },
      canceled: { text: 'Canceled', class: 'admin-status-canceled' }
    };
    
    const config = statusConfig[status] || { text: status, class: 'admin-status-unknown' };
    return <span className={`admin-status-badge ${config.class}`}>{config.text}</span>;
  };

  const cancelEdit = () => {
    setEditingUser(null);
  };
  
  const handleLogout = () => {
    if (logoutLoading) return; // Prevent multiple clicks
    
    setLogoutLoading(true);
    
    try {
      // Clear all state to prevent any lingering data
      setUsers([]);
      setPlaygrounds([]);
      setBookings([]);
      setError('');
      setSuccess('');
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'user' });
      setActiveTab('users');
      setLoading(false);
      setClearDataLoading(false);
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Navigate to admin login with replace to prevent back button issues
      // navigate('/admin/login', { replace: true });
      window.location.href = '/admin/login';

    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect even if there's an error
      window.location.href = '/admin/login';
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="admin-panel-layout">
      <header className="admin-panel-header">
        <h1>Admin Control Panel</h1>
        <div className="admin-panel-header-actions">
          <button 
            className="admin-clear-data-btn" 
            onClick={clearAllData}
            disabled={clearDataLoading}
          >
            {clearDataLoading ? 'Clearing Data...' : '🗑️ Clear All Data'}
          </button>
          <button 
            className="admin-logout-btn" 
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </header>

      <main className="admin-panel-main">
        {/* Overview metrics */}
        <div className="admin-metrics-grid">
          <div className="admin-metric-card">
            <div className="metric-title">Users</div>
            <div className="metric-value">{users.length}</div>
          </div>
          <div className="admin-metric-card">
            <div className="metric-title">Playgrounds</div>
            <div className="metric-value">{playgrounds.length}</div>
          </div>
          <div className="admin-metric-card">
            <div className="metric-title">Bookings</div>
            <div className="metric-value">{bookings.length}</div>
          </div>
          <div className="admin-metric-card">
            <div className="metric-title">Revenue (JOD)</div>
            <div className="metric-value">{totalRevenue}</div>
          </div>
        </div>
        <div className="admin-panel-tabs">
          <button 
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users ({users.length})
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'playgrounds' ? 'active' : ''}`}
            onClick={() => setActiveTab('playgrounds')}
          >
            ⚽ Playgrounds ({playgrounds.length})
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📅 Bookings ({bookings.length})
          </button>
            <button 
              className={`admin-tab-btn ${activeTab === 'ads' ? 'active' : ''}`}
              onClick={() => setActiveTab('ads')}
            >
              🖼️ Ads
            </button>
        </div>

        <div className="admin-panel-container">
          {error && <div className="admin-error-message">{error}</div>}
          {success && <div className="admin-success-message">{success}</div>}
          
          {loading ? (
            <div className="admin-loading">Loading data...</div>
          ) : (
            <>
              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="admin-tab-content">
                  <h2>User Management</h2>
                  <div className="admin-toolbar">
                    <input
                      className="search-input"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    />
                    <select className="filter-select" value={userRoleFilter} onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}>
                      <option value="all">All Roles</option>
                      <option value="user">User</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="toolbar-spacer" />
                    <button className="export-btn" onClick={exportUsersCSV}>Export CSV</button>
                    {selectedUserIds.length > 0 && (
                      <button className="bulk-delete-btn" onClick={handleBulkDeleteUsers}>Delete Selected</button>
                    )}
                    <select className="page-size-select" value={pageSizeUsers} onChange={(e) => { setPageSizeUsers(Number(e.target.value)); setUserPage(1); }}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={usersPageData.length > 0 && usersPageData.every(u => selectedUserIds.includes(u._id))}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                  const ids = usersPageData.map(u => u._id);
                                  setSelectedUserIds(prev => Array.from(new Set([...prev, ...ids])));
                                } else {
                                  const ids = usersPageData.map(u => u._id);
                                  setSelectedUserIds(prev => prev.filter(id => !ids.includes(id)));
                                }
                              }}
                            />
                          </th>
                          <th>Name</th>
                          <th>Email</th>
                          <th onClick={() => setUserSort(toggleSort(userSort, 'role'))} style={{ cursor: 'pointer' }}>
                            Role {userSort.key === 'role' ? (userSort.dir === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="4">No users found</td>
                          </tr>
                        ) : (
                          usersPageData.map(user => (
                            <tr key={user._id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedUserIds.includes(user._id)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedUserIds(prev => checked ? [...prev, user._id] : prev.filter(id => id !== user._id));
                                  }}
                                />
                              </td>
                              <td onClick={() => setUserSort(toggleSort(userSort, 'name'))} style={{ cursor: 'pointer' }}>
                                {user.name} {userSort.key === 'name' ? (userSort.dir === 'asc' ? '▲' : '▼') : ''}
                              </td>
                              <td onClick={() => setUserSort(toggleSort(userSort, 'email'))} style={{ cursor: 'pointer' }}>
                                {user.email} {userSort.key === 'email' ? (userSort.dir === 'asc' ? '▲' : '▼') : ''}
                              </td>
                              <td>{user.role || 'user'}</td>
                              <td className="admin-actions">
                                <button 
                                  className="admin-edit-btn" 
                                  onClick={() => handleEditClick(user)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="admin-delete-btn" 
                                  onClick={() => handleDeleteUser(user._id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="admin-pagination">
                      <button disabled={userPage === 1} onClick={() => setUserPage(p => Math.max(1, p - 1))}>Prev</button>
                      <span>
                        Page {userPage} of {Math.max(1, Math.ceil(filteredUsers.length / pageSizeUsers))}
                      </span>
                      <button
                        disabled={userPage >= Math.ceil(filteredUsers.length / pageSizeUsers)}
                        onClick={() => setUserPage(p => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Playgrounds Tab */}
              {activeTab === 'playgrounds' && (
                <div className="admin-tab-content">
                  <h2>Playground Management</h2>
                  <div className="admin-toolbar">
                    <input
                      className="search-input"
                      placeholder="Search playgrounds..."
                      value={playgroundSearch}
                      onChange={(e) => { setPlaygroundSearch(e.target.value); setPgPage(1); }}
                    />
                    <div className="toolbar-spacer" />
                    <button className="export-btn" onClick={exportPlaygroundsCSV}>Export CSV</button>
                    {selectedPgIds.length > 0 && (
                      <button className="bulk-delete-btn" onClick={handleBulkDeletePlaygrounds}>Delete Selected</button>
                    )}
                    <select className="page-size-select" value={pageSizePgs} onChange={(e) => { setPageSizePgs(Number(e.target.value)); setPgPage(1); }}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={pgsPageData.length > 0 && pgsPageData.every(p => selectedPgIds.includes(p._id))}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                  const ids = pgsPageData.map(p => p._id);
                                  setSelectedPgIds(prev => Array.from(new Set([...prev, ...ids])));
                                } else {
                                  const ids = pgsPageData.map(p => p._id);
                                  setSelectedPgIds(prev => prev.filter(id => !ids.includes(id)));
                                }
                              }}
                            />
                          </th>
                          <th>Name</th>
                          <th>Location</th>
                          <th>Size</th>
                          <th onClick={() => setPgSort(toggleSort(pgSort, 'costPerHour'))} style={{ cursor: 'pointer' }}>
                            Cost/Hour {pgSort.key === 'costPerHour' ? (pgSort.dir === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th onClick={() => setPgSort(toggleSort(pgSort, 'owner.name'))} style={{ cursor: 'pointer' }}>
                            Owner {pgSort.key === 'owner.name' ? (pgSort.dir === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlaygrounds.length === 0 ? (
                          <tr>
                            <td colSpan="6">No playgrounds found</td>
                          </tr>
                        ) : (
                          pgsPageData.map(playground => (
                            <tr key={playground._id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedPgIds.includes(playground._id)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedPgIds(prev => checked ? [...prev, playground._id] : prev.filter(id => id !== playground._id));
                                  }}
                                />
                              </td>
                              <td onClick={() => setPgSort(toggleSort(pgSort, 'name'))} style={{ cursor: 'pointer' }}>
                                {playground.name} {pgSort.key === 'name' ? (pgSort.dir === 'asc' ? '▲' : '▼') : ''}
                              </td>
                              <td onClick={() => setPgSort(toggleSort(pgSort, 'location'))} style={{ cursor: 'pointer' }}>
                                {playground.location} {pgSort.key === 'location' ? (pgSort.dir === 'asc' ? '▲' : '▼') : ''}
                              </td>
                              <td>{playground.size} x {playground.size}</td>
                              <td>{playground.costPerHour} JOD</td>
                              <td>{playground.owner?.name || 'Unknown'}</td>
                              <td className="admin-actions">
                                <button 
                                  className="admin-delete-btn" 
                                  onClick={() => handleDeletePlayground(playground._id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="admin-pagination">
                      <button disabled={pgPage === 1} onClick={() => setPgPage(p => Math.max(1, p - 1))}>Prev</button>
                      <span>
                        Page {pgPage} of {Math.max(1, Math.ceil(filteredPlaygrounds.length / pageSizePgs))}
                      </span>
                      <button
                        disabled={pgPage >= Math.ceil(filteredPlaygrounds.length / pageSizePgs)}
                        onClick={() => setPgPage(p => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div className="admin-tab-content">
                  <h2>Booking Management</h2>
                  <div className="admin-toolbar">
                    <input
                      className="search-input"
                      placeholder="Search by playground or user..."
                      value={bookingSearch}
                      onChange={(e) => { setBookingSearch(e.target.value); setBookingPage(1); }}
                    />
                    <select className="filter-select" value={bookingStatusFilter} onChange={(e) => { setBookingStatusFilter(e.target.value); setBookingPage(1); }}>
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="canceled">Canceled</option>
                    </select>
                    <input
                      type="date"
                      className="date-input"
                      value={bookingDateFrom}
                      onChange={(e) => { setBookingDateFrom(e.target.value); setBookingPage(1); }}
                    />
                    <input
                      type="date"
                      className="date-input"
                      value={bookingDateTo}
                      onChange={(e) => { setBookingDateTo(e.target.value); setBookingPage(1); }}
                    />
                    <div className="toolbar-spacer" />
                    <button className="export-btn" onClick={exportBookingsCSV}>Export CSV</button>
                    {selectedBookingIds.length > 0 && (
                      <button className="bulk-delete-btn" onClick={handleBulkDeleteBookings}>Delete Selected</button>
                    )}
                    <select className="page-size-select" value={pageSizeBookings} onChange={(e) => { setPageSizeBookings(Number(e.target.value)); setBookingPage(1); }}>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={bookingsPageData.length > 0 && bookingsPageData.every(b => selectedBookingIds.includes(b._id))}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                  const ids = bookingsPageData.map(b => b._id);
                                  setSelectedBookingIds(prev => Array.from(new Set([...prev, ...ids])));
                                } else {
                                  const ids = bookingsPageData.map(b => b._id);
                                  setSelectedBookingIds(prev => prev.filter(id => !ids.includes(id)));
                                }
                              }}
                            />
                          </th>
                          <th onClick={() => setBookingSort(toggleSort(bookingSort, 'playground.name'))} style={{ cursor: 'pointer' }}>
                            Playground {bookingSort.key === 'playground.name' ? (bookingSort.dir === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th onClick={() => setBookingSort(toggleSort(bookingSort, 'user.name'))} style={{ cursor: 'pointer' }}>
                            User {bookingSort.key === 'user.name' ? (bookingSort.dir === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th onClick={() => setBookingSort(toggleSort(bookingSort, 'start'))} style={{ cursor: 'pointer' }}>
                            Date & Time {bookingSort.key === 'start' ? (bookingSort.dir === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th>Duration</th>
                          <th onClick={() => setBookingSort(toggleSort(bookingSort, 'cost'))} style={{ cursor: 'pointer' }}>
                            Cost {bookingSort.key === 'cost' ? (bookingSort.dir === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan="7">No bookings found</td>
                          </tr>
                        ) : (
                          bookingsPageData.map(booking => (
                            <tr key={booking._id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedBookingIds.includes(booking._id)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedBookingIds(prev => checked ? [...prev, booking._id] : prev.filter(id => id !== booking._id));
                                  }}
                                />
                              </td>
                              <td>{booking.playground?.name || 'Unknown'}</td>
                              <td>{booking.user?.name || 'Unknown'}</td>
                              <td>{formatDate(booking.start)}</td>
                              <td>{(() => {
                                const s = new Date(booking.start);
                                const e = new Date(booking.end);
                                const ms = e - s;
                                if (isNaN(ms) || ms <= 0) return 'N/A';
                                return (ms / (1000 * 60 * 60)).toFixed(2) + ' hours';
                              })()}</td>
                              <td>{booking.cost || 0} JOD</td>
                              <td>{getStatusBadge(booking.status)}</td>
                              <td className="admin-actions">
                                <button 
                                  className="admin-delete-btn" 
                                  onClick={() => handleDeleteBooking(booking._id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="admin-pagination">
                      <button disabled={bookingPage === 1} onClick={() => setBookingPage(p => Math.max(1, p - 1))}>Prev</button>
                      <span>
                        Page {bookingPage} of {Math.max(1, Math.ceil(filteredBookings.length / pageSizeBookings))}
                      </span>
                      <button
                        disabled={bookingPage >= Math.ceil(filteredBookings.length / pageSizeBookings)}
                        onClick={() => setBookingPage(p => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ads Tab */}
              {activeTab === 'ads' && (
                <div className="admin-tab-content">
                  <h2>Create New Ad</h2>
                  <AdCreateForm />
                  <h2 style={{ marginTop: '20px' }}>Existing Ads</h2>
                  <AdList />
                </div>
              )}
            </>
          )}
          
          {/* Edit User Modal */}
          {editingUser && (
            <div className="admin-edit-user-modal">
              <div className="admin-modal-content">
                <h3>Edit User</h3>
                <form onSubmit={handleUpdateUser}>
                  <div className="admin-form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  
                  <div className="admin-form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  
                  <div className="admin-form-group">
                    <label htmlFor="role">Role</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleFormChange}
                    >
                      <option value="user">User</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="admin-form-actions">
                    <button type="button" className="admin-cancel-btn" onClick={cancelEdit}>
                      Cancel
                    </button>
                    <button type="submit" className="admin-save-btn">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
