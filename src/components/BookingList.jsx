import { useState, useEffect } from 'react';
import './styles/bookingList.css';
import config from '../config';

const BookingList = ({ playground, onClose }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, upcoming, past, pending

  const API_URL = config.API_URL;

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}bookings/playground/${playground._id}`, {
          headers: { Authorization: token },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch bookings');
        setBookings(data.result || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (playground._id) {
      fetchBookings();
    }
  }, [playground._id]);

  const getBookingStatus = (booking) => {
    if (!booking) return 'unknown';
    if (booking.status) return booking.status;
    if (typeof booking.confirmed === 'boolean') {
      return booking.confirmed ? 'confirmed' : 'pending';
    }
    return 'unknown';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: 'Pending', class: 'status-pending' },
      confirmed: { text: 'Confirmed', class: 'status-confirmed' },
      completed: { text: 'Completed', class: 'status-completed' },
      canceled: { text: 'Canceled', class: 'status-canceled' }
    };
    
    const config = statusConfig[status] || { text: status, class: 'status-unknown' };
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getHourDifference = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    if (diffMs < 0) return 0;
    const diffHours = diffMs / (1000 * 60 * 60);
    return parseFloat(diffHours.toFixed(2));
  };

  const filteredBookings = bookings.filter(booking => {
    const now = new Date();
    const bookingDate = new Date(booking.start);
    const status = getBookingStatus(booking);
    
    switch (filter) {
      case 'upcoming':
        return bookingDate > now && status !== 'canceled';
      case 'past':
        return bookingDate < now && status !== 'canceled';
      case 'pending':
        return status === 'pending';
      case 'confirmed':
        return status === 'confirmed';
      case 'completed':
        return status === 'completed';
      case 'canceled':
        return status === 'canceled';
      default:
        return status !== 'canceled'; // Show all non-canceled by default
    }
  });

  const countBy = (predicate) => bookings.reduce((acc, b) => acc + (predicate(getBookingStatus(b)) ? 1 : 0), 0);
  const nonCanceledCount = countBy((s) => s !== 'canceled');
  const pendingCount = countBy((s) => s === 'pending');
  const confirmedCount = countBy((s) => s === 'confirmed');
  const completedCount = countBy((s) => s === 'completed');
  const canceledCount = countBy((s) => s === 'canceled');

  const handleStatusUpdate = async (bookingId, newStatus) => {
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
      
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking._id === bookingId 
          ? { ...booking, status: newStatus, confirmed: newStatus === 'confirmed' }
          : booking
      ));
    } catch (e) {
      setError(e.message);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      });
      
      if (!res.ok) throw new Error('Failed to cancel booking');
      
      // Update the booking status to canceled instead of removing it
      setBookings(prev => prev.map(booking => 
        booking._id === bookingId 
          ? { ...booking, status: 'canceled', confirmed: false }
          : booking
      ));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="booking-list-overlay" onClick={onClose}>
      <div className="booking-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-list-header">
          <h2>Bookings - {playground.name}</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="booking-list-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({nonCanceledCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilter('confirmed')}
          >
            Confirmed ({confirmedCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({completedCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'canceled' ? 'active' : ''}`}
            onClick={() => setFilter('canceled')}
          >
            Canceled ({canceledCount})
          </button>
        </div>

        <div className="booking-list-content">
          {error && <div className="booking-error">{error}</div>}
          
          {loading ? (
            <div className="booking-loading">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="booking-empty">
              No bookings found for this filter.
            </div>
          ) : (
            <div className="bookings-grid">
              {filteredBookings.map((booking) => (
                <div className="booking-card" key={booking._id}>
                                     <div className="booking-header">
                     <h4>Booking #{booking._id.slice(-6)}</h4>
                     {getStatusBadge(booking.status)}
                   </div>
                  
                                     <div className="booking-details">
                     <div className="booking-info">
                       <p><i className="fas fa-calendar"></i> {formatDate(booking.start)}</p>
                       <p><i className="fas fa-clock"></i> {getHourDifference(booking.start, booking.end)} hours</p>
                       <p><i className="fas fa-money-bill"></i> {booking.cost} JOD</p>
                       <p><i className="fas fa-user"></i> {booking.user?.name || 'Unknown User'}</p>
                       {booking.notes && (
                         <p><i className="fas fa-sticky-note"></i> {booking.notes}</p>
                       )}
                     </div>
                    
                    <div className="booking-actions">
                        {booking.status === 'pending' && (
                          <>
                            <button 
                              className="action-btn confirm"
                              onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                            >
                              <i className="fas fa-check"></i> Confirm
                            </button>
                            <button 
                              className="action-btn cancel"
                              onClick={() => cancelBooking(booking._id)}
                            >
                              <i className="fas fa-times"></i> Cancel
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <>
                            <button 
                              className="action-btn complete"
                              onClick={() => handleStatusUpdate(booking._id, 'completed')}
                            >
                              <i className="fas fa-check-double"></i> Complete
                            </button>
                            <button 
                              className="action-btn cancel"
                              onClick={() => cancelBooking(booking._id)}
                            >
                              <i className="fas fa-times"></i> Cancel
                            </button>
                          </>
                        )}
                        {(booking.status === 'completed' || booking.status === 'canceled') && (
                          <div className="no-actions">
                            <span className="status-message">
                              {booking.status === 'completed' ? 'Booking completed' : 'Booking canceled'}
                            </span>
                          </div>
                        )}
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingList;
