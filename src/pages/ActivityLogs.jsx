import { useState, useEffect } from 'react';
import config from '../config';
import './styles/activityLogs.css';
import Alert from '../components/Alert';

const ActivityLogs = () => {
  const API_URL = config.API_URL;
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
  };

  const closeAlert = () => {
    setAlert(null);
  };

  const fetchActivityLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}bookings/my-bookings`, {
        headers: {
          'Authorization': token,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        // Support multiple response shapes
        const allBookings = (
          data?.result?.data ||
          data?.result ||
          data?.data?.bookings ||
          data?.bookings ||
          []
        );
        console.log('Fetched bookings (normalized):', allBookings);
        setActivities(Array.isArray(allBookings) ? allBookings : []);
      } else {
        showAlert(data.message || 'Failed to fetch activity logs', 'error');
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      showAlert('An error occurred while fetching activity logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodeData = (booking) => {
    const formattedDate = formatDate(booking.start);
    const formattedStartTime = formatTime(booking.start);
    const formattedEndTime = formatTime(booking.end);

    const lines = [
      `Booking ID: ${booking._id}`,
      `Playground: ${booking.playground?.name}`,
      `Date: ${formattedDate}`,
      `Time: ${formattedStartTime} - ${formattedEndTime}`,
      `Price: JOD${booking.cost}`,
      `User: ${booking.user?.email}`,
      `Status: ${booking.status}`
    ];
    return lines.join('\\n');
  };

  const generateQRCodeURL = (data) => {
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
  };

  // Determine if a booking is confirmed (supports both status string and legacy boolean)
  const isBookingConfirmed = (booking) => {
    if (!booking) return false;
    return booking.status === 'confirmed' || booking.confirmed === true;
  };

  // Get status icon based on booking status
  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return 'fas fa-check-circle';
      case 'pending': return 'fas fa-clock';
      case 'canceled': return 'fas fa-times-circle';
      case 'completed': return 'fas fa-check-double';
      default: return 'fas fa-info-circle';
    }
  };

  // Get status display text
  const getStatusText = (status) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleShowQRCode = (activity) => {
    if (isBookingConfirmed(activity)) {
      setSelectedActivity(activity);
    } else {
      showAlert('QR code is available once the booking is confirmed.', 'info');
    }
  };

  const handleCloseQRCode = () => {
    setSelectedActivity(null);
  };

  const handleOpenChat = (activity) => {
    try {
      const detail = {
        ownerId:
          activity.playground?.owner?._id ||
          activity.owner?._id ||
          activity.playground?.owner ||
          activity.owner,
        playgroundId:
          activity.playground?._id ||
          activity.playground ||
          activity.playgroundId,
        userId: activity.user?._id || activity.user || undefined,
        name: activity.playground?.owner?.name || activity.owner?.name,
      };
      const evt = new CustomEvent('open-chat', { detail });
      window.dispatchEvent(evt);
    } catch (e) {
      showAlert('Unable to open chat for this booking', 'error');
    }
  };

  if (loading) {
    return (
      <div className="activity-logs-container">
        <div className="activity-logs-header">
          <h1>Activity Logs</h1>
          <p>Your bookings</p>
        </div>
        <div className="activity-loading">
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p>Loading your activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-logs-container">
      <div className="activity-logs-header">
        <h1>
          <i className="fas fa-history"></i>
          Activity Logs
        </h1>
        <p>All your bookings (QR code available for confirmed bookings)</p>
      </div>

      {activities.length === 0 ? (
        <div className="activity-empty">
          <i className="fas fa-calendar-times fa-3x"></i>
          <h3>No Activity Yet</h3>
          <p>Your bookings will appear here</p>
        </div>
      ) : (
        <div className="activities-grid">
          {activities.map((activity) => (
            <div key={activity._id} className="activity-card">
              <div className="activity-header">
                <h3>{activity.playground?.name}</h3>
                {activity.status && (
                  <span className={`activity-status ${activity.status}`}>
                    <i className={getStatusIcon(activity.status)}></i>
                    {getStatusText(activity.status)}
                  </span>
                )}
              </div>

              <div className="activity-details">
                <div className="activity-info">
                  <div className="info-item">
                    <i className="fas fa-calendar-alt"></i>
                    <span>{formatDate(activity.start)}</span>
                    {console.log('activity.start, ', activity.start)}
                  </div>
                  <div className="info-item">
                    <i className="fas fa-clock"></i>
                    <span>{`${formatTime(activity.start)} - ${formatTime(activity.end)}`}</span>
                    {console.log("start, end, ", activity.start, activity.end)}
                    
                  </div>
                  <div className="info-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{activity.playground?.location}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-dollar-sign"></i>
                    <span>JOD{activity.cost}</span>
                  </div>
                </div>

              {isBookingConfirmed(activity) ? (
                <div className="activity-qr-section">
                  <img
                    src={generateQRCodeURL(generateQRCodeData(activity))}
                    alt="Booking QR Code"
                    className="qr-code-small"
                    onClick={() => handleShowQRCode(activity)}
                  />
                  <button 
                    className="qr-btn"
                    onClick={() => handleShowQRCode(activity)}
                  >
                    <i className="fas fa-qrcode"></i>
                    View QR Code
                  </button>
                  <button 
                    className="qr-btn"
                    style={{ backgroundColor: 'var(--color-green)' }}
                    onClick={() => handleOpenChat(activity)}
                  >
                    <i className="fas fa-comments"></i>
                    Chat
                  </button>
                </div>
              ) : activity.status === 'pending' ? (
                <div className="activity-qr-section qr-pending">
                  <div className="qr-placeholder">
                    <i className="fas fa-qrcode"></i>
                  </div>
                  <span className="qr-pending-text">
                    <i className="fas fa-lock"></i>
                    QR code will be available once confirmed
                  </span>
                  <button 
                    className="qr-btn"
                    style={{ backgroundColor: 'var(--color-green)', marginTop: '8px', color: 'var(--color-white)' }}
                    onClick={() => handleOpenChat(activity)}
                  >
                    <i className="fas fa-comments"></i>
                    Chat
                  </button>
                </div>
              ) : null}
              </div>

              <div className="activity-footer">
                <small>
                  <i className="fas fa-clock"></i>
                  Booked on {formatDate(activity.createdAt)}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {selectedActivity && isBookingConfirmed(selectedActivity) && (
        <div className="qr-modal-overlay" onClick={handleCloseQRCode}>
          <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h3>Booking QR Code</h3>
              <button className="qr-modal-close" onClick={handleCloseQRCode}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="qr-modal-body">
              <div className="qr-code-large">
                <img
                  src={generateQRCodeURL(generateQRCodeData(selectedActivity))}
                  alt="Booking QR Code"
                />
              </div>
              
              <div className="qr-booking-info">
                <h4>{selectedActivity.playground?.name}</h4>
                <p><strong>Date:</strong> {formatDate(selectedActivity.start)}</p>
                <p><strong>Time:</strong> {`${formatTime(selectedActivity.start)} - ${formatTime(selectedActivity.end)}`}</p>
                <p><strong>Location:</strong> {selectedActivity.playground?.location}</p>
                <p><strong>Price:</strong> {selectedActivity.cost} JOD</p>
              </div>
            </div>
            
            <div className="qr-modal-footer">
              <p>Show this QR code at the playground for verification</p>
            </div>
          </div>
        </div>
      )}

      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={closeAlert}
        />
      )}
    </div>
  );
};

export default ActivityLogs; 