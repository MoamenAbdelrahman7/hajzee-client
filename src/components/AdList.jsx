import { useEffect, useState } from 'react';
import { IMAGES } from '../config';
import { listAds, toggleAdStatus, deleteAd } from '../services/ads';

const AdList = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listAds();
      setAds(res || []);
    } catch (e) {
      setError(e.message || 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id) => {
    try {
      await toggleAdStatus(id);
      load();
    } catch (e) {
      setError(e.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ad?')) return;
    try {
      await deleteAd(id);
      setAds(prev => prev.filter(a => a._id !== id));
    } catch (e) {
      setError(e.message || 'Failed to delete ad');
    }
  };

  if (loading) return <div className="admin-loading">Loading ads…</div>;
  if (error) return <div className="admin-error-message">{error}</div>;

  return (
    <div className="admin-table-container">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Preview</th>
            <th>Title</th>
            <th>Placement</th>
            <th>Type</th>
            <th>Active</th>
            <th>Impressions</th>
            <th>Clicks</th>
            <th>CTR</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {ads.length === 0 ? (
            <tr><td colSpan={9}>No ads found</td></tr>
          ) : (
            ads.map(ad => (
              <tr key={ad._id}>
                <td>
                  <img src={`${IMAGES.ads}${ad.image}`} alt={ad.title} style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 6 }} />
                </td>
                <td>{ad.title}</td>
                <td>{ad.placement}</td>
                <td>{ad.type}</td>
                <td>{ad.active ? 'Yes' : 'No'}</td>
                <td>{ad.impressions || 0}</td>
                <td>{ad.clicks || 0}</td>
                <td>{ad.impressions ? `${((ad.clicks || 0) / ad.impressions * 100).toFixed(2)}%` : '0%'}</td>
                <td className="admin-actions">
                  <button className="admin-edit-btn" onClick={() => handleToggle(ad._id)}>
                    {ad.active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="admin-delete-btn" onClick={() => handleDelete(ad._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdList;


