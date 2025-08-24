import { API_URL } from '../config';

// Conversations API
export async function createConversation(ownerId, playgroundId, userId) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({ ownerId, playgroundId, ...(userId ? { userId } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    console.log("createConversation data, ", data);
    console.log("userId, ", userId);
    
    if (!res.ok) return null;
    
    return data?.data || null;
  } catch {
    return null;
  }
}

export async function listConversations() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}chat/conversations`, {
      headers: {
        Accept: 'application/json',
        Authorization: token,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    const list = data?.data || data?.result?.data || data?.result || [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Messages API
export async function fetchMessages(conversationId) {
  if (!conversationId) return [];
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}chat/conversations/${conversationId}/messages`, {
      headers: {
        Accept: 'application/json',
        Authorization: token,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    const list = data?.data || data?.result || [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function sendMessage(conversationId, text) {
  if (!conversationId || !text) return null;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data?.data || null;
  } catch {
    return null;
  }
}

export async function markConversationRead(conversationId) {
  if (!conversationId) return false;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}chat/conversations/${conversationId}/read`, {
      // method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: token,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}


