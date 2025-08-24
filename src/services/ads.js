import { API_URL } from '../config';

export async function fetchActiveAds(placement = 'home') {
  try {
    const res = await fetch(`${API_URL}ads/active?placement=${encodeURIComponent(placement)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return [];
        console.log("data, ", data.data);
    
    const list = data?.data || data?.result || [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function trackImpression(adId) {
  if (!adId) return;
  try {
    await fetch(`${API_URL}ads/${adId}/impression`, { method: 'PATCH' });
  } catch {}
}

export async function trackClick(adId) {
  if (!adId) return;
  try {
    await fetch(`${API_URL}ads/${adId}/click`, { method: 'PATCH' });
  } catch {}
}

export async function createAd(adData) {
  // adData should be a FormData instance
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}ads`, {
      method: 'POST',
      headers: {
        Authorization: token,
        // Do NOT set Content-Type for FormData; browser will set it
      },
      body: adData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Failed to create ad');
    return data?.data || data?.result || data;
  } catch (e) {
    throw e;
  }
}

export async function listAds(params = {}) {
  const token = localStorage.getItem('token');
  const search = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${API_URL}ads${search ? `?${search}` : ''}`, {
      headers: { Authorization: token },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch ads');
    return data?.data || data?.result || [];
  } catch (e) {
    throw e;
  }
}

export async function toggleAdStatus(adId) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}ads/${adId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: token },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Failed to toggle status');
    return data?.data || data?.result || data;
  } catch (e) {
    throw e;
  }
}

export async function deleteAd(adId) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}ads/${adId}`, {
      method: 'DELETE',
      headers: { Authorization: token },
    });
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || 'Failed to delete ad');
    }
    return true;
  } catch (e) {
    throw e;
  }
}


