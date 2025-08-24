import { useState } from 'react';
import { createAd } from '../services/ads';

const AdCreateForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState('banner');
  const [placement, setPlacement] = useState('home');
  const [image, setImage] = useState(null);
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});

  const isValidUrl = (value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validate = () => {
    const newErrors = {};
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) newErrors.title = 'Title is required';
    else if (trimmedTitle.length < 3) newErrors.title = 'Title must be at least 3 characters';
    else if (trimmedTitle.length > 100) newErrors.title = 'Title must be 100 characters or less';

    if ((description || '').length > 300) newErrors.description = 'Description must be 300 characters or less';

    if (link && !isValidUrl(link)) newErrors.link = 'Enter a valid URL starting with http or https';

    if (activeFrom && activeTo) {
      const from = new Date(activeFrom);
      const to = new Date(activeTo);
      if (!isNaN(from) && !isNaN(to) && from > to) {
        newErrors.activeTo = 'Active To must be on or after Active From';
      }
    }

    if (!image) newErrors.image = 'Image is required';
    else if (!(image.type || '').startsWith('image/')) newErrors.image = 'Selected file must be an image';
    else if (image.size > 5 * 1024 * 1024) newErrors.image = 'Image must be less than 5MB';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) {
      setError('Please fix the validation errors and try again');
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('title', (title || '').trim());
      fd.append('description', description);
      fd.append('link', link);
      fd.append('type', type);
      fd.append('placement', placement);
      if (activeFrom) fd.append('activeFrom', activeFrom);
      if (activeTo) fd.append('activeTo', activeTo);
      fd.append('image', image);
      await createAd(fd);
      setSuccess('Ad created successfully');
      setTitle('');
      setDescription('');
      setLink('');
      setType('banner');
      setPlacement('home');
      setImage(null);
      setActiveFrom('');
      setActiveTo('');
      setErrors({});
    } catch (e) {
      setError(e.message || 'Failed to create ad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-ad-form">
      {error && <div className="admin-error-message">{error}</div>}
      {success && <div className="admin-success-message">{success}</div>}
      <div className="admin-form-group">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={errors.title ? 'admin-input-error' : ''} required />
        {errors.title && <div className="admin-field-error">{errors.title}</div>}
      </div>
      <div className="admin-form-group">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className={errors.description ? 'admin-input-error' : ''} />
        {errors.description && <div className="admin-field-error">{errors.description}</div>}
      </div>
      <div className="admin-form-group">
        <label>Link (optional)</label>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className={errors.link ? 'admin-input-error' : ''} />
        {errors.link && <div className="admin-field-error">{errors.link}</div>}
      </div>
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="banner">Banner</option>
            <option value="sidebar">Sidebar</option>
            <option value="popup">Popup</option>
            <option value="inline">Inline</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label>Placement</label>
          <select value={placement} onChange={(e) => setPlacement(e.target.value)}>
            <option value="home">Home</option>
            <option value="playgrounds">Playgrounds</option>
            <option value="profile">Profile</option>
            <option value="chat">Chat</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label>Active From</label>
          <input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className={errors.activeFrom ? 'admin-input-error' : ''} />
          {errors.activeFrom && <div className="admin-field-error">{errors.activeFrom}</div>}
        </div>
        <div className="admin-form-group">
          <label>Active To</label>
          <input type="date" value={activeTo} onChange={(e) => setActiveTo(e.target.value)} className={errors.activeTo ? 'admin-input-error' : ''} />
          {errors.activeTo && <div className="admin-field-error">{errors.activeTo}</div>}
        </div>
      </div>
      <div className="admin-form-group">
        <label>Image</label>
        <input type="file" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0] || null;
          setImage(file);
          if (file) {
            setErrors((prev) => {
              const msg = !file.type?.startsWith('image/')
                ? 'Selected file must be an image'
                : file.size > 5 * 1024 * 1024
                ? 'Image must be less than 5MB'
                : undefined;
              return { ...prev, image: msg };
            });
          } else {
            setErrors((prev) => ({ ...prev, image: 'Image is required' }));
          }
        }} className={errors.image ? 'admin-input-error' : ''} required />
        {errors.image && <div className="admin-field-error">{errors.image}</div>}
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-save-btn" disabled={loading}>
          {loading ? 'Creating...' : 'Create Ad'}
        </button>
      </div>
    </form>
  );
};

export default AdCreateForm;


