import { useEffect, useState } from 'react';
import config from '../config';
import './styles/owner.css';
import ChatPanel from '../components/ChatPanel';
import '../components/styles/chat.css';
import NewPlayground from '../components/NewPlayground';
import EditPlayground from '../components/EditPlayground';
import DeleteConfirmation from '../components/DeleteConfirmation';
import BookingList from '../components/BookingList';
import QRScanner from '../components/QRScanner';

const OwnerDashboard = () => {
  const [playgrounds, setPlaygrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedPlayground, setSelectedPlayground] = useState(null);
  const [playgroundToEdit, setPlaygroundToEdit] = useState(null);
  const [playgroundToDelete, setPlaygroundToDelete] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeMsg, setCompleteMsg] = useState('');
  const [chatBookingId, setChatBookingId] = useState(null);

  const API_URL = config.API_URL;

  const fetchOwnerPlaygrounds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}playgrounds/owner`, {
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch');
      setPlaygrounds(data.result?.data || data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerPlaygrounds();
  }, []);

  const handleEdit = (playground) => {
    setPlaygroundToEdit(playground);
    setShowEdit(true);
  };

  const handleDelete = (playground) => {
    setPlaygroundToDelete(playground);
    setShowDelete(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}playgrounds/${playgroundToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: token },
      });

      if (response.ok) {
        setPlaygrounds(prev => prev.filter(pg => pg._id !== playgroundToDelete._id));
        setShowDelete(false);
        setPlaygroundToDelete(null);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete playground');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleEditSuccess = () => {
    fetchOwnerPlaygrounds();
    setShowEdit(false);
    setPlaygroundToEdit(null);
  };

  const handleNewSuccess = () => {
    fetchOwnerPlaygrounds();
    setShowNew(false);
  };

  const handleScan = (data) => {
    setScannedData(data);
    setShowScanner(false);
  };

  const parseScannedMap = (data) => {
    const lines = String(data || '')
      .split(/\\n|\n/)
      .filter(line => line.trim());
    const map = {};
    lines.forEach(line => {
      const [k, ...rest] = line.split(': ');
      const key = (k || '').trim();
      const value = rest.join(': ').trim();
      if (key) map[key] = value;
    });
    return map;
  };

  const handleMarkCompleted = async () => {
    if (!scannedData) return;
    const map = parseScannedMap(scannedData);
    const bookingId = map['Booking ID'];
    if (!bookingId) {
      setCompleteMsg('Could not find Booking ID in scanned data.');
      return;
    }
    try {
      setIsCompleting(true);
      setCompleteMsg('');
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify({ status: 'completed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update booking');
      // Update local scannedData display
      setScannedData(prev => {
        const s = String(prev || '');
        return s.match(/Status:\s*/)
          ? s.replace(/Status:\s*.*/i, 'Status: completed')
          : s + '\nStatus: completed';
      });
      setCompleteMsg('Booking status updated to completed.');
    } catch (e) {
      setCompleteMsg(e.message || 'Failed to update booking');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="owner-layout">
      <header className="owner-header">
        <h1>Owner Dashboard</h1>
        <div className="owner-header-actions">
          <button className="owner-scan-btn" onClick={() => setShowScanner(true)}>
            <i className="fas fa-qrcode"></i>
            Scan QR Code
          </button>
          <button className="owner-new-btn" onClick={() => setShowNew(true)}>New Playground</button>
        </div>
      </header>
      <main className="owner-main">
        {error && <div className="owner-error">{error}</div>}
        {loading ? (
          <div className="owner-loading">Loading...</div>
        ) : (
          <section className={`owner-grid ${playgrounds.length === 0 ? 'owner-grid-empty' : ''}`}>
            {playgrounds.length === 0 ? (
              <div className="owner-empty">
                <div>
                  <p style={{ margin: '0 0 16px 0', fontWeight: '600' }}>No Playgrounds Yet</p>
                  <p style={{ margin: '0', opacity: '0.8', fontSize: '0.95rem' }}>
                    Start by creating your first playground to begin managing bookings and earning revenue.
                  </p>
                </div>
              </div>
            ) : (
              playgrounds.map((pg) => (
                <div 
                  className="owner-card" 
                  key={pg._id}
                >
                  <img className="owner-card-img" src={`http://127.0.0.1:8000/static/img/playgrounds/${pg.imageCover}`} alt={pg.name} />
                  <div className="owner-card-info">
                    <h3>{pg.name}</h3>
                    <span className="owner-meta">
                      <span className="owner-badge">{pg.size}x{pg.size}</span>
                      <span className="owner-price">{pg.costPerHour} JOD</span>
                    </span>
                    <p className="owner-loc">{pg.location}</p>
                    <div className="owner-card-actions">
                      <button 
                        className="view-bookings"
                        onClick={() => setSelectedPlayground(pg)}
                      >
                        <i className="fas fa-calendar-alt"></i>
                        View Bookings
                      </button>
                      <div className="owner-card-buttons">
                        <button 
                          className="edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(pg);
                          }}
                        >
                          <i className="fas fa-edit"></i>
                          Edit
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(pg);
                          }}
                        >
                          <i className="fas fa-trash"></i>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </main>

      {showNew && (
        <NewPlayground 
          onClose={() => setShowNew(false)}
          onSuccess={handleNewSuccess}
        />
      )}

      {showEdit && playgroundToEdit && (
        <EditPlayground 
          playground={playgroundToEdit}
          onClose={() => {
            setShowEdit(false);
            setPlaygroundToEdit(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {showDelete && playgroundToDelete && (
        <DeleteConfirmation 
          playground={playgroundToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDelete(false);
            setPlaygroundToDelete(null);
          }}
        />
      )}
      
      {selectedPlayground && (
        <BookingList 
          playground={selectedPlayground} 
          onClose={() => setSelectedPlayground(null)} 
        />
      )}

      {showScanner && (
        <QRScanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)}
        />
      )}

      {scannedData && (
        <div className="scanned-data-modal">
          <div className="scanned-data-content">
            <h3>Scanned Booking Details</h3>
            {(() => {
              const lines = String(scannedData || '')
                .split(/\\n|\n/)
                .filter(line => line.trim());
              const dataMap = {};
              lines.forEach(line => {
                const [k, ...rest] = line.split(': ');
                const key = (k || '').trim();
                const value = rest.join(': ').trim();
                if (key) dataMap[key] = value;
              });
              // Compute expired based on Date/Time range
              let status = (dataMap['Status'] || '').toLowerCase();
              try {
                const dateStr = dataMap['Date'];
                const timeStr = dataMap['Time'];
                if (dateStr && timeStr) {
                  const [startStr, endStr] = timeStr.split(' - ').map(s => s.trim());
                  const endDateTime = new Date(`${dateStr} ${endStr}`);
                  if (!isNaN(endDateTime.getTime())) {
                    if (endDateTime < new Date()) {
                      status = 'expired';
                    }
                  }
                }
              } catch {}
              const items = [
                { key: 'Booking ID', value: dataMap['Booking ID'], cls: 'booking-id' },
                { key: 'Playground', value: dataMap['Playground'] },
                { key: 'Date', value: dataMap['Date'] },
                { key: 'Time', value: dataMap['Time'] },
                { key: 'Price', value: dataMap['Price'], cls: 'price' },
                { key: 'User', value: dataMap['User'] },
              ];
              return (
                <>
                  <ul className="kv-list">
                    {items.map(({ key, value, cls }) => (
                      value ? (
                        <li key={key} className="kv-item">
                          <span className="kv-label">{key}</span>
                          <span className={`kv-value ${cls || ''}`.trim()}>{value}</span>
                        </li>
                      ) : null
                    ))}
                    {status && (
                      <li className="kv-item">
                        <span className="kv-label">Status</span>
                        <span className={`kv-value status ${status}`}>{status}</span>
                      </li>
                    )}
                  </ul>
                  <div className="scanned-actions">
                    {status !== 'completed' && status !== 'expired' && (
                      <button 
                        className="complete-btn" 
                        onClick={handleMarkCompleted}
                        disabled={isCompleting}
                      >
                        {isCompleting ? 'Updating...' : 'Mark as Completed'}
                      </button>
                    )}
                    <button className="close-scanned-btn" onClick={() => setScannedData(null)}>
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
            {completeMsg && <div className="scanned-hint">{completeMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;


