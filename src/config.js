// Centralized configuration for API and static assets
const RAW_API_URL =  'https://hajzee-server-production.up.railway.app';
const API_BASE = String(RAW_API_URL).replace(/\/+$/, '');

export const API_URL = `${API_BASE}/`;

export const IMAGES = {
  users: `${API_BASE}/static/img/users/`,
  playgrounds: `${API_BASE}/static/img/playgrounds/`,
  ads: `${API_BASE}/static/img/ads/`,
};

// Public assets (served from /public at build time)
export const PUBLIC_BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '/')
export const PUBLIC_ASSETS = {
  icons: `${PUBLIC_BASE}icons/`,
  images: `${PUBLIC_BASE}images/`,
};

export default {
  API_URL,
  IMAGES,
  PUBLIC_BASE,
  PUBLIC_ASSETS,
};


