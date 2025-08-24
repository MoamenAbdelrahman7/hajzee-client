import { useEffect, useState } from 'react';
import ChatPanel from './ChatPanel';
import { createConversation, listConversations } from '../services/chat';
import { useAuth } from '../context/AuthContext';
import config from '../config';

// Lightweight event-based launcher to decouple from Playgrounds component
const ChatLauncher = () => {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [counterpartName, setCounterpartName] = useState('');
  const [error, setError] = useState('');
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const handler = async (e) => {
      let { ownerId, playgroundId, userId, name } = e.detail || {};

      if (!playgroundId) return;
      // Try to fetch ownerId if missing
      if (!ownerId) {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${config.API_URL}playgrounds/${playgroundId}`, {
            headers: { Accept: 'application/json', Authorization: token },
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            const candidatesId = [
              data?.owner?._id,
              data?.ownerId,
              data?.owner,
              data?.result?.owner?._id,
              data?.result?.data?.owner?._id,
              data?.data?.owner?._id,
              data?.data?.playground?.owner?._id,
              data?.result?.data?.playground?.owner?._id,
              data?.playground?.owner?._id,
              data?.playground?.owner,
            ];
            const candidatesName = [
              data?.owner?.name,
              data?.result?.owner?.name,
              data?.result?.data?.owner?.name,
              data?.data?.owner?.name,
              data?.data?.playground?.owner?.name,
              data?.result?.data?.playground?.owner?.name,
              data?.playground?.owner?.name,
            ];
            ownerId = candidatesId.find(Boolean) || ownerId;
            name = name || candidatesName.find(Boolean);
          }
        } catch {}
      }
      if (!ownerId) {
        setError('Unable to identify playground owner to start chat.');
        setTimeout(() => setError(''), 3000);
        return;
      }
      // Users start conversations; owners can reply once a conversation exists.
      const role = (user && user.role) || (JSON.parse(localStorage.getItem('user') || 'null')?.role) || 'user';
      if (role === 'user') {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to start a chat.');
          setTimeout(() => setError(''), 3000);
          return;
        }
        const effectiveUserId = (user && user._id) || JSON.parse(localStorage.getItem('user') || 'null')?._id || JSON.parse(localStorage.getItem('user') || 'null')?.id;
        const conv = await createConversation(ownerId, playgroundId, effectiveUserId);
        if (conv) {
          setConversation(conv);
          setCounterpartName(name || 'Owner');
          setOpen(true);
          setError('');
        } else {
          setError('Could not start chat. Please ensure you are logged in and the server /chat routes are running.');
          setTimeout(() => setError(''), 4000);
        }
      } else {
        const list = await listConversations();
        const pid = String(playgroundId);
        const found = (list || []).find(c => {
          const cp = typeof c.playground === 'object' ? (c.playground?._id || c.playground?.id) : c.playground;
          if (!cp || String(cp) !== pid) return false;
          if (userId) {
            const cu = typeof c.user === 'object' ? (c.user?._id || c.user?.id) : c.user;
            return cu && String(cu) === String(userId);
          }
          return true;
        });
        if (found) {
          setConversation(found);
          setCounterpartName(name || 'User');
          setOpen(true);
          setError('');
        } else {
          // Optional: allow owner to initiate if backend supports userId in POST /chat/conversations
          if (userId) {
            const conv = await createConversation(ownerId, playgroundId, userId);
            if (conv) {
              setConversation(conv);
              setCounterpartName(name || 'User');
              setOpen(true);
              setError('');
              return;
            }
          }
          setError('No conversation found for this playground. Ask the user to start the chat.');
          setTimeout(() => setError(''), 4000);
        }
      }
    };
    window.addEventListener('open-chat', handler);
    return () => window.removeEventListener('open-chat', handler);
  }, []);

  return (
    <>
      {error && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 20000,
          background: 'rgba(229,57,53,0.9)', color: '#fff', padding: '10px 14px', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>{error}</div>
      )}
      {open && conversation && (
        <ChatPanel
          conversationId={conversation._id || conversation.id}
          counterpartName={counterpartName}
          onClose={() => { setOpen(false); setConversation(null); }}
        />
      )}
    </>
  );
};

export default ChatLauncher;


