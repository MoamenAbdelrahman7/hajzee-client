import { useEffect, useMemo, useState } from 'react';
import { listConversations, fetchMessages } from '../services/chat';
import { useAuth } from '../context/AuthContext';
import ChatPanel from '../components/ChatPanel';
import '../components/styles/chat.css';
import './styles/activityLogs.css';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openConv, setOpenConv] = useState(null);
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listConversations();
      // Enrich with last message if missing
      const enriched = await Promise.all(
        (list || []).map(async (c) => {
          if (c?.lastMessage && c?.lastMessageAt) return c;
          const msgs = await fetchMessages(c._id || c.id);
          if (Array.isArray(msgs) && msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            return {
              ...c,
              lastMessage: last?.text || last?.message || c.lastMessage,
              lastMessageAt: last?.createdAt || c.lastMessageAt,
              // attach unread count for current user
              unreadCount: msgs.filter(m => {
                const rid = typeof m.recipient === 'object' ? (m.recipient?._id || m.recipient?.id) : m.recipient;
                return String(rid) === String(user?._id) && !m?.isRead;
              }).length,
            };
          }
          return c;
        })
      );
      // sort newest first by lastMessageAt or updatedAt
      enriched.sort((a, b) => {
        const ta = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });
      setConversations(enriched);
    } catch (e) {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  // useEffect(() => {
  //   const id = setInterval(load, 15000);
  //   return () => clearInterval(id);
  // }, []);

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    // Match other app formatting: e.g., 20 Sep 2025, 08:15 PM
    const datePart = d.toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  };

  const handleOpen = (conv) => setOpenConv(conv);
  const handleClose = () => setOpenConv(null);

  return (
    <div className="activity-logs-container">
      <div className="activity-logs-header">
        <h1>
          <i className="fas fa-comments"></i>
          Messages
        </h1>
        <p>Your conversations with playground owners</p>
      </div>

      {loading ? (
        <div className="activity-loading">
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p>Loading your conversations...</p>
        </div>
      ) : error ? (
        <div className="activity-empty">
          <h3>{error}</h3>
        </div>
      ) : conversations.length === 0 ? (
        <div className="activity-empty">
          <i className="fas fa-inbox fa-3x"></i>
          <h3>No Conversations</h3>
          <p>Start a chat from a booking to begin messaging</p>
        </div>
      ) : (
        <div className="activities-grid">
          {conversations.map((c) => (
            <div key={c._id || c.id} className="activity-card">
              <div className="activity-header">
                <h3>{(typeof c.playground === 'object' ? c.playground?.name : '') || 'Playground'}</h3>
                <span className="activity-status confirmed">
                  <i className="fas fa-user"></i>
                  {(() => {
                    const owner = typeof c.owner === 'object' ? c.owner : null;
                    const userP = typeof c.user === 'object' ? c.user : null;
                    if (user?._id && owner && userP) {
                      return String(owner._id) === String(user._id) ? (userP.name || 'User') : (owner.name || 'Owner');
                    }
                    return (owner?.name || userP?.name || 'Participant');
                  })()}
                </span>
              </div>
              <div className="activity-details">
                <div className="activity-info">
                  <div className="info-item">
                    <i className="fas fa-comment-dots"></i>
                    <span>{c.lastMessage || 'No messages yet'}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-clock"></i>
                    <span>{c.lastMessageAt ? formatTime(c.lastMessageAt) : '—'}</span>
                  </div>
                  {typeof c.unreadCount === 'number' && c.unreadCount > 0 && (
                    <div className="info-item">
                      <i className="fas fa-envelope"></i>
                      <span>{c.unreadCount} unread</span>
                    </div>
                  )}
                </div>
                <div className="activity-qr-section">
                  <button className="qr-btn" onClick={() => handleOpen(c)}>
                    <i className="fas fa-comments"></i>
                    Open Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {openConv && (
        <ChatPanel
          conversationId={openConv._id || openConv.id}
          counterpartName={openConv.owner?.name || openConv.user?.name}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default Messages;


