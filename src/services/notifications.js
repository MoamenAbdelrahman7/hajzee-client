// Simple notifications service with robust response normalization
// Supports both user and owner by sending role as a query param when available

import { API_URL } from '../config';

const normalizeNotification = (raw) => {
  if (!raw) return null;
  const id = raw._id || raw.id || `${raw.type || 'note'}-${raw.createdAt || Date.now()}`;
  const type = raw.type || raw.category || 'info';
  const title = raw.title || raw.header || inferTitle(type, raw);
  const message = raw.message || raw.text || raw.body || '';
  const createdAt = raw.createdAt || raw.timestamp || raw.time || new Date().toISOString();
  const read = Boolean(raw.isRead ?? raw.read ?? false);
  const icon = inferIcon(type);
  // pass through useful populated refs when available
  const sender = raw.sender || raw.from || null;
  const recipient = raw.recipient || raw.to || null;
  const owner = raw.owner || null;
  const user = raw.user || null;
  const playground = raw.playground || (raw.booking && raw.booking.playground ? raw.booking.playground : null);
  const booking = raw.booking || null;
  return { id, type, title, message, createdAt, read, icon, sender, recipient, owner, user, playground, booking };
};

const inferTitle = (type, raw) => {
  switch (String(type || '').toLowerCase()) {
    case 'booking_confirmed':
    case 'confirmed':
      return 'Booking Confirmed';
    case 'booking_canceled':
    case 'canceled':
      return 'Booking Canceled';
    case 'payment':
    case 'payment_confirmed':
      return 'Payment Confirmed';
    case 'reminder':
      return 'Match Reminder';
    case 'owner_new_booking':
      return 'New Booking';
    default:
      return raw?.title || 'Notification';
  }
};

const inferIcon = (type) => {
  switch (String(type || '').toLowerCase()) {
    case 'booking_confirmed':
    case 'confirmed':
      return 'fas fa-calendar-check';
    case 'booking_canceled':
    case 'canceled':
      return 'fas fa-times-circle';
    case 'payment':
    case 'payment_confirmed':
      return 'fas fa-money-bill-wave';
    case 'reminder':
      return 'fas fa-stopwatch';
    case 'owner_new_booking':
      return 'fas fa-user-plus';
    default:
      return 'fas fa-info-circle';
  }
};

export async function fetchNotifications() {
  const token = localStorage.getItem('token');
  let currentUserId;
  let role;
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      currentUserId = parsed?._id || parsed?.id;
      role = parsed?.role;
    }
  } catch {}

  const headers = {
    Accept: 'application/json',
    Authorization: token,
  };

  const getId = (maybe) => {
    if (!maybe) return undefined;
    if (typeof maybe === 'string') return maybe;
    if (typeof maybe === 'object') return maybe._id || maybe.id;
    return undefined;
  };

  const filterByAudience = (items) => {
    if (!Array.isArray(items)) return [];
    const lowerRole = String(role || '').toLowerCase();
    const userLikeTypes = new Set(['booking_confirmed', 'confirmed', 'booking_canceled', 'canceled', 'payment', 'payment_confirmed', 'reminder']);
    return items.filter((n) => {
      const type = String(n.type || '').toLowerCase();
      const recipientId = getId(n.recipient);
      const ownerId = getId(n.owner);
      const userId = getId(n.user);

      if (recipientId) return String(recipientId) === String(currentUserId);

      if (type.startsWith('owner_')) {
        if (lowerRole !== 'owner') return false;
        if (ownerId) return String(ownerId) === String(currentUserId);
        return true;
      }

      if (userLikeTypes.has(type)) {
        if (lowerRole === 'owner') return false;
        if (userId) return String(userId) === String(currentUserId);
        return true;
      }

      if (lowerRole === 'owner' && ownerId) return String(ownerId) === String(currentUserId);
      if (lowerRole !== 'owner' && userId) return String(userId) === String(currentUserId);

      return true;
    });
  };

  // Optionally hint server for role-based filtering if supported
  const query = role ? `?role=${encodeURIComponent(role)}` : '';

  try {
    const res = await fetch(`${API_URL}notifications${query}`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    const list = data?.data || [];
    const normalized = Array.isArray(list)
      ? list.map(normalizeNotification).filter(Boolean)
      : [];
    return filterByAudience(normalized);
  } catch {
    return [];
  }
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) return false;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}notifications/${notificationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({ isRead: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteNotification(notificationId) {
  if (!notificationId) return false;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        Authorization: token,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}


