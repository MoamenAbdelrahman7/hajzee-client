import { useState, useEffect } from 'react';
import './styles/sidebar.css';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import config from '../config';

const Sidebar = () => {
  const [role, setRole] = useState('user');
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const { darkMode } = useTheme();
  
  const API_URL = config.API_URL;
  
  // Check user role from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user.role) {
          setRole(user.role);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Fetch user bookings
  useEffect(() => {
    const fetchUserBookings = async () => {
      if (role !== 'user') return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}bookings/my-bookings`, {
          headers: { Authorization: token },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("bookings", data.result);
          
          // Keep all bookings including canceled ones for filtering
          setUserBookings(data.result || []);
        } else {
          console.error('Failed to fetch user bookings');
        }
      } catch (error) {
        console.error('Error fetching user bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBookings();
  }, [role]);

  // Cancel booking function
  const cancelBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      });

      if (response.ok) {
        // Update the booking status to canceled instead of removing it
        setUserBookings(prev => prev.map(booking => 
          booking._id === bookingId 
            ? { ...booking, status: 'canceled' }
            : booking
        ));
        console.log('Booking canceled successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to cancel booking:', errorData.message);
      }
    } catch (error) {
      console.error('Error canceling booking:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Calculate remaining time
  const getRemainingTime = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diffMs = start - now;
    
    if (diffMs < 0) return 'Expired';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    } else {
      return 'Less than 1 hour left';
    }
  };

  // Calculate booking cost
  const getBookingCost = (booking) => {
    if (!booking.start || !booking.end || !booking.playground?.costPerHour) {
      return 0;
    }
    
    const start = new Date(booking.start);
    const end = new Date(booking.end);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return (diffHours * booking.playground.costPerHour).toFixed(2);
  };

  // Get status badge configuration
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        text: 'Pending', 
        color: '#f57c00',
        bgColor: 'rgba(245, 124, 0, 0.1)',
        borderColor: 'rgba(245, 124, 0, 0.3)'
      },
      confirmed: { 
        text: 'Confirmed', 
        color: '#43a047',
        bgColor: 'rgba(67, 160, 71, 0.1)',
        borderColor: 'rgba(67, 160, 71, 0.3)'
      },
      completed: { 
        text: 'Completed', 
        color: '#1976d2',
        bgColor: 'rgba(25, 118, 210, 0.1)',
        borderColor: 'rgba(25, 118, 210, 0.3)'
      },
      canceled: { 
        text: 'Canceled', 
        color: '#e53935',
        bgColor: 'rgba(229, 57, 53, 0.1)',
        borderColor: 'rgba(229, 57, 53, 0.3)'
      }
    };
    
    return statusConfig[status] || { 
      text: status, 
      color: '#666',
      bgColor: 'rgba(102, 102, 102, 0.1)',
      borderColor: 'rgba(102, 102, 102, 0.3)'
    };
  };
  
  // CDN URLs for icons
  const icons = {
    calendar: {
      light: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/calendar.svg",
      dark: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/calendar-fill.svg"
    },
    chevronRight: {
      light: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-right.svg",
      dark: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-right.svg"
    },
    chevronDown: {
      light: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-down.svg",
      dark: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/chevron-down.svg"
    },
    time: {
      light: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/clock.svg",
      dark: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/clock-fill.svg"
    },
    qrCode: {
      light: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/qr-code.svg",
      dark: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/qr-code.svg"
    },
    favorite: {
      light: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/heart.svg",
      dark: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/heart-fill.svg"
    },
    admin: {
      light: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/person-gear.svg",
      dark: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/person-gear-fill.svg"
    },
    owner: {
      light: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/speedometer2.svg",
      dark: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/speedometer2.svg"
    }
  };

  // Normalize booking status for mixed shapes
  const resolveStatus = (booking) => (booking?.status ? booking.status : (booking?.confirmed ? 'confirmed' : 'pending'));

  // Derived bookings for sidebar preview: show recent 3 of pending or confirmed
  const previewBookings = userBookings
    .filter((booking) => {
      const status = resolveStatus(booking);
      return status === 'pending' || status === 'confirmed';
    })
    .slice()
    .sort((a, b) => {
      const aStart = new Date(a.start).getTime() || 0;
      const bStart = new Date(b.start).getTime() || 0;
      // Recent first
      return bStart - aStart;
    })
    .slice(0, 3);

  // REMOVE duplicated legacy derivations (replaced with resolveStatus-aware block above)
  return (
    <>
      <aside className="left">
        <section className="activitiesList">
          <span className="activityLog">
            <img 
              src={darkMode ? icons.calendar.dark : icons.calendar.light} 
              alt="calendar icon" 
              style={{ 
                width: "20px", 
                height: "20px",
                filter: darkMode ? "invert(1) brightness(2)" : "none"
              }}
            />
            <button onClick={() => setShowActivityLogs(!showActivityLogs)}>Activities Log</button>
            <Link 
              to="/activity-logs"
              className="open-activity-logs-btn"
              style={{
                marginLeft: "8px",
                padding: "4px 10px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.3px",
                color: "var(--color-green)",
                backgroundColor: "rgba(76, 175, 80, 0.08)",
                border: "1px solid rgba(76, 175, 80, 0.25)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <i className="fas fa-external-link-alt" style={{ fontSize: "11px" }}></i>
              Open
            </Link>
            <img
              src={showActivityLogs ? (darkMode ? icons.chevronDown.dark : icons.chevronDown.light) : (darkMode ? icons.chevronRight.dark : icons.chevronRight.light)}
              className="arrow"
              alt=""
              style={{ 
                width: "16px", 
                height: "16px",
                filter: darkMode ? "invert(1) brightness(2)" : "none"
              }}
            />
          </span>
          <div className="items" style={{ 
            display: showActivityLogs ? 'flex' : 'none',
            flexDirection: 'column',
            gap: '12px',
            margin: '15px 5px',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '5px'
          }}>
            {role === 'owner' ? (
              <>
                <div className="item owner" style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "12px 15px",
                    backgroundColor: darkMode ? "var(--color-grey-100)" : "var(--color-grey-100)",
                    borderLeft: "3px solid var(--color-green)"
                  }}>
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "4px 0",
                    width: "100%",
                    marginBottom: "5px"
                  }}>
                    <img 
                      src={darkMode ? icons.time.dark : icons.time.light} 
                      alt="time" 
                      style={{ 
                        width: "22px", 
                        height: "22px",
                        padding: "4px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(76, 175, 80, 0.1)",
                        filter: darkMode ? "invert(1) brightness(2)" : "none"
                      }} 
                    />
                    <h4 className="client" style={{
                      fontWeight: "600",
                      fontSize: "0.95rem",
                      letterSpacing: "0.2px",
                      whiteSpace: "nowrap",
                      color: "var(--color-text)",
                      margin: "0"
                    }}>Moamen Abdelrahman</h4>
                  </span>
                  <div className="info" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    width: "100%",
                    backgroundColor: "rgba(76, 175, 80, 0.05)",
                    borderRadius: "6px"
                  }}>
                    <h4 className="playgroundName" style={{
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "var(--color-text)",
                      margin: "0"
                    }}>Amman Sport</h4>
                    <p className="appointment" style={{
                      fontSize: "0.7rem",
                      whiteSpace: "nowrap",
                      color: "var(--color-green)",
                      fontWeight: "500",
                      margin: "0"
                    }}>20 Sep - 8:00pm</p>
                  </div>
                </div>
                <div className="item owner" style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "12px 15px",
                    backgroundColor: darkMode ? "var(--color-grey-100)" : "var(--color-grey-100)",
                    borderLeft: "3px solid var(--color-green)"
                  }}>
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "4px 0",
                    width: "100%",
                    marginBottom: "5px"
                  }}>
                    <img 
                      src={darkMode ? icons.time.dark : icons.time.light} 
                      alt="time" 
                      style={{ 
                        width: "22px", 
                        height: "22px",
                        padding: "4px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(76, 175, 80, 0.1)",
                        filter: darkMode ? "invert(1) brightness(2)" : "none"
                      }} 
                    />
                    <h4 className="client" style={{
                      fontWeight: "600",
                      fontSize: "0.95rem",
                      letterSpacing: "0.2px",
                      whiteSpace: "nowrap",
                      color: "var(--color-text)",
                      margin: "0"
                    }}>Moamen Abdelrahman</h4>
                  </span>
                  <div className="info" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    width: "100%",
                    backgroundColor: "rgba(76, 175, 80, 0.05)",
                    borderRadius: "6px"
                  }}>
                    <h4 className="playgroundName" style={{
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "var(--color-text)",
                      margin: "0"
                    }}>Amman Sport</h4>
                    <p className="appointment" style={{
                      fontSize: "0.7rem",
                      whiteSpace: "nowrap",
                      color: "var(--color-green)",
                      fontWeight: "500",
                      margin: "0"
                    }}>20 Sep - 8:00pm</p>
                  </div>
                </div>
                <div className="item owner" style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "12px 15px",
                    backgroundColor: darkMode ? "var(--color-grey-100)" : "var(--color-grey-100)",
                    borderLeft: "3px solid var(--color-green)"
                  }}>
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "4px 0",
                    width: "100%",
                    marginBottom: "5px"
                  }}>
                    <img 
                      src={darkMode ? icons.time.dark : icons.time.light} 
                      alt="time" 
                      style={{ 
                        width: "22px", 
                        height: "22px",
                        padding: "4px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(76, 175, 80, 0.1)",
                        filter: darkMode ? "invert(1) brightness(2)" : "none"
                      }} 
                    />
                    <h4 className="client" style={{
                      fontWeight: "600",
                      fontSize: "0.95rem",
                      letterSpacing: "0.2px",
                      whiteSpace: "nowrap",
                      color: "var(--color-text)",
                      margin: "0"
                    }}>Moamen Abdelrahman</h4>
                  </span>
                  <div className="info" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    width: "100%",
                    backgroundColor: "rgba(76, 175, 80, 0.05)",
                    borderRadius: "6px"
                  }}>
                    <h4 className="playgroundName" style={{
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "var(--color-text)",
                      margin: "0"
                    }}>Amman Sport</h4>
                    <p className="appointment" style={{
                      fontSize: "0.7rem",
                      whiteSpace: "nowrap",
                      color: "var(--color-green)",
                      fontWeight: "500",
                      margin: "0"
                    }}>20 Sep - 8:00pm</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {loading ? (
                  <div style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "var(--color-text-secondary)",
                    fontSize: "14px"
                  }}>
                    Loading bookings...
                  </div>
                ) : previewBookings.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "var(--color-text-secondary)",
                    fontSize: "14px"
                  }}>
                    No active bookings found
                  </div>
                ) : (
                  <>
                  {previewBookings.map((booking) => (
                    <div key={booking._id} className="item">
                      <span>
                        <img 
                          src={darkMode ? icons.qrCode.dark : icons.qrCode.light} 
                          alt="QR code" 
                          style={{ 
                            filter: darkMode ? "invert(1) brightness(1.2)" : "brightness(0.8)"
                          }} 
                        />
                        <div className="info">
                          <h3 className="name">{booking.playground?.name || 'Unknown Playground'}</h3>
                          <p className="appointment">{formatTime(booking.start)} - {formatDate(booking.start)}</p>
                          <p className="cost" style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "var(--color-green)",
                            margin: "3px 0 0 0",
                            lineHeight: "1.3"
                          }}>
                            {getBookingCost(booking)} JOD
                          </p>
                          {(booking.status !== 'canceled' && booking.status !== 'completed') && (
                            <p className="remainingTime">{getRemainingTime(booking.start)}</p>
                          )}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            marginTop: "6px"
                          }}>
                             <span style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "10px",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                               backgroundColor: getStatusBadge(resolveStatus(booking)).bgColor,
                               color: getStatusBadge(resolveStatus(booking)).color,
                               border: `1px solid ${getStatusBadge(resolveStatus(booking)).borderColor}`
                            }}>
                               {getStatusBadge(resolveStatus(booking)).text}
                            </span>
                          </div>
                        </div>
                      </span>

                    </div>
                  ))}
                  {userBookings.filter((b)=>{ const s=resolveStatus(b); return s==='pending'||s==='confirmed';}).length > 3 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <Link to={'/activity-logs'} style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-green)'
                      }}>
                        View all
                      </Link>
                    </div>
                  )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
        <hr />

        {role === 'admin' && (
          <>
            <section className="adminSection">
              <span className="favourite">
                <img 
                  src={darkMode ? icons.admin.dark : icons.admin.light} 
                  alt="admin" 
                  style={{ 
                    width: "20px", 
                    height: "20px",
                    filter: darkMode ? "invert(1) brightness(2)" : "none"
                  }} 
                />
                <Link to={'/admin'}>Admin Panel</Link>
                <img 
                  src={darkMode ? icons.chevronRight.dark : icons.chevronRight.light} 
                  alt="chevron" 
                  className="arrow" 
                  style={{ 
                    width: "16px", 
                    height: "16px",
                    filter: darkMode ? "invert(1) brightness(2)" : "none"
                  }} 
                />
              </span>
            </section>
            <hr />
          </>
        )}

        {role === 'owner' && (
          <>
            <section className="ownerSection">
              <span className="favourite">
                <img 
                  src={darkMode ? icons.owner.dark : icons.owner.light} 
                  alt="owner" 
                  style={{ 
                    width: "20px", 
                    height: "20px",
                    filter: darkMode ? "invert(1) brightness(2)" : "none"
                  }} 
                />
                <Link to={'/owner'}>Owner Dashboard</Link>
                <img 
                  src={darkMode ? icons.chevronRight.dark : icons.chevronRight.light} 
                  alt="chevron" 
                  className="arrow" 
                  style={{ 
                    width: "16px", 
                    height: "16px",
                    filter: darkMode ? "invert(1) brightness(2)" : "none"
                  }} 
                />
              </span>
            </section>
            <hr />
          </>
        )}

        {role !== 'owner' && (
          <>
            <section className="favouritesList">
              <span className="favourite">
                <img 
                  src={darkMode ? icons.favorite.dark : icons.favorite.light} 
                  alt="favorite" 
                  style={{ 
                    width: "20px", 
                    height: "20px",
                    filter: darkMode ? "invert(1) brightness(2)" : "none"
                  }} 
                />
                <Link to={'/favourites'}>Favourites</Link>
                <img 
                  src={darkMode ? icons.chevronRight.dark : icons.chevronRight.light} 
                  alt="chevron" 
                  className="arrow" 
                  style={{ 
                    width: "16px", 
                    height: "16px",
                    filter: darkMode ? "invert(1) brightness(2)" : "none"
                  }} 
                />
              </span>
              <div className="items">
                <div className="item"></div>
              </div>
            </section>
            <hr />
            {/* Activity Logs link moved inside Activities Log as "View all" */}
          </>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
