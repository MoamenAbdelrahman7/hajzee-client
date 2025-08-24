import { useEffect, useRef, useState } from 'react';
import { fetchMessages, sendMessage, markConversationRead } from '../services/chat';
import { useAuth } from '../context/AuthContext';

const ChatPanel = ({ conversationId, onClose, counterpartName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollerRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    let intervalId;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const list = await fetchMessages(conversationId);
      if (cancelled) return;
      setMessages(list);
      setLoading(false);
    };
    if (conversationId) {
      load();
      intervalId = setInterval(load, 5000);
    }
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  };

  // Always scroll after messages render updates (send/receive)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      scrollToBottom();
    });
    return () => cancelAnimationFrame(raf);
  }, [messages]);

  // Also scroll after initial load completes
  useEffect(() => {
    if (!loading) {
      const raf = requestAnimationFrame(() => {
        scrollToBottom();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    setError('');
    const text = input.trim();
    setInput('');
    // optimistic append
    const temp = { id: `temp-${Date.now()}`, conversation: conversationId, sender: user?._id || user?.id, text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, temp]);
    const sent = await sendMessage(conversationId, text);
    setSending(false);
    if (!sent) {
      setError('Failed to send message');
      // rollback optimistic
      setMessages(prev => prev.filter(m => m.id !== temp.id));
      return;
    }
    // replace temp with actual if provided, else keep temp
    setMessages(prev => prev.map(m => (m.id === temp.id ? sent : m)));
  };

  useEffect(() => {
    // mark as read on open
    if (conversationId) {
      markConversationRead(conversationId).catch(() => {});
    }
  }, [conversationId]);

  return (
    <div className="chat-modal" onClick={onClose}>
      <div className="chat-content" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <h3>Chat with {counterpartName || 'Owner/User'}</h3>
          <button className="chat-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <div className="chat-body" ref={scrollerRef}>
          {loading ? (
            <div className="chat-loading"><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">No messages yet</div>
          ) : (
            messages.map((m) => {
              const senderId = typeof m.sender === 'object' ? (m.sender?._id || m.sender?.id) : m.sender;
              const isMine = user && String(senderId) === String(user._id);
              return (
                <div key={m._id || m.id || Math.random()} className={`chat-msg ${isMine ? 'mine' : 'theirs'}`}>
                  <div className="bubble">
                    <div className="text">{m.text || m.message}</div>
            <div className="meta">{new Date(m.createdAt).toLocaleString('en-GB', { timeZone: 'UTC' })}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <form className="chat-input" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button type="submit" disabled={sending || !input.trim()}>
            {sending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
          </button>
        </form>
        {error && <div className="chat-error">{error}</div>}
      </div>
    </div>
  );
};

export default ChatPanel;


