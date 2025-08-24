import { useState, useEffect } from 'react';
import config, { IMAGES } from '../config';
import './styles/editPlayground.css';

const EditPlayground = ({ playground, onClose, onSuccess }) => {
  const [coverPreview, setCoverPreview] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    size: '',
    costPerHour: '',
    openingTime: '',
    closingTime: '',
    googleMapUrl: '',
    appleMapUrl: ''
  });

  // Initialize form data with playground data
  useEffect(() => {
    if (playground) {
      setFormData({
        name: playground.name || '',
        location: playground.location || '',
        size: playground.size || '',
        costPerHour: playground.costPerHour || '',
        openingTime: playground.openingTime || '',
        closingTime: playground.closingTime || '',
        googleMapUrl: playground.googleMapUrl || '',
        appleMapUrl: playground.appleMapUrl || ''
      });
      
      // Set existing cover image preview
      if (playground.imageCover) {
        setCoverPreview(`${IMAGES.playgrounds}${playground.imageCover}`);
      }
      
      // Set existing images previews
      if (playground.images && playground.images.length > 0) {
        const existingPreviews = playground.images.map(img => 
          `${IMAGES.playgrounds}${img}`
        );
        setImagePreviews(existingPreviews);
      }
    }
  }, [playground]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Cover image must be less than 5MB');
        return;
      }
      setCoverPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('All images must be less than 5MB each');
      return;
    }

    // Limit to 5 images
    if (files.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Playground name is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (!formData.size || formData.size < 3) {
      setError('Size must be at least 3');
      return false;
    }
    if (!formData.costPerHour || formData.costPerHour < 0) {
      setError('Cost must be a positive number');
      return false;
    }
    if (!formData.openingTime.trim()) {
      setError('Opening time is required');
      return false;
    }
    if (!formData.closingTime.trim()) {
      setError('Closing time is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const form = e.target;
      const formDataToSend = new FormData();

      // Text / number fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('size', formData.size);
      formDataToSend.append('costPerHour', formData.costPerHour);
      formDataToSend.append('openingTime', formData.openingTime);
      formDataToSend.append('closingTime', formData.closingTime);
      formDataToSend.append('googleMapUrl', formData.googleMapUrl);
      formDataToSend.append('appleMapUrl', formData.appleMapUrl);

             // Single image file (only if new file is selected)
       const coverInput = form.elements['imageCover'];
       const coverFile = coverInput && coverInput.files ? coverInput.files[0] : undefined;
       console.log("Cover file selected:", coverFile ? coverFile.name : "None");
       if (coverFile) {
         formDataToSend.append('imageCover', coverFile);
         console.log("Added cover image to FormData:", coverFile.name);
               }
        // Note: If no new cover file is selected, we don't send imageCover field
        // The backend should keep the existing cover image

             // Handle additional images
       const imagesInput = form.elements['images'];
       const newImages = imagesInput && imagesInput.files ? imagesInput.files : { length: 0 };
       console.log("New images selected:", newImages.length);
       console.log("Existing playground images:", playground.images);
       
       // If new images are selected, add them
       if (newImages.length > 0) {
         console.log("Adding new images to FormData");
         for (let i = 0; i < newImages.length; i++) {
           formDataToSend.append('images', newImages[i]);
           console.log(`Added image ${i}:`, newImages[i].name);
         }
        }
        // Note: If no new images are selected, we don't send images field
        // The backend should keep the existing images

             const token = localStorage.getItem('token');
       
        
       // Debug: Log the form data values
       console.log("Form Data Values:", {
         name: formData.name,
         location: formData.location,
         size: formData.size,
         costPerHour: formData.costPerHour,
         openingTime: formData.openingTime,
         closingTime: formData.closingTime,
         googleMapUrl: formData.googleMapUrl,
         appleMapUrl: formData.appleMapUrl,
         imageCover: playground.imageCover,
         images: playground.images
       });
        
               // Debug: Log FormData entries
        console.log("=== FormData Contents ===");
        for (let [key, value] of formDataToSend.entries()) {
          console.log(`${key}:`, value);
        }
        console.log("=== End FormData Contents ===");
      
         const response = await fetch(`${config.API_URL}playgrounds/${playground._id}`, {
         method: 'PATCH',
         headers: { Authorization: token, Accept: 'application/json' },
         body: formDataToSend,
       });

       console.log("Response status:", response.status);
       const contentType = response.headers.get('content-type') || '';
       let data = {};
       if (contentType.includes('application/json')) {
         data = await response.json().catch(() => ({}));
       } else {
         const text = await response.text().catch(() => '');
         if (text) console.error('Non-JSON response body:', text.slice(0, 500));
         data = {};
       }
       console.log("Response data:", data);

      if (response.ok) {
        setSuccess('Playground updated successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 1500);
      } else {
        const fallback = `Failed to update playground${response.status ? ` (HTTP ${response.status})` : ''}`;
        setError((data && data.message) ? String(data.message) : fallback);
      }
    } catch (err) {
      console.error('Error updating:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="editPgContainer" onClick={handleOverlayClick}>
      <div className="subContainer">
        <button className="close-btn" onClick={handleClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <h1>Edit Playground</h1>
        
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <fieldset>
              <label htmlFor="pgName">Playground Name</label>
              <input 
                type="text" 
                id="pgName" 
                name="name" 
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter playground name"
                autoCorrect="false" 
                spellCheck="false" 
              />
            </fieldset>
            
            <fieldset>
              <label htmlFor="pgLocation">Location</label>
              <input
                type="text"
                id="pgLocation"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter location"
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
          </div>

          <div className="form-row">
            <fieldset>
              <label htmlFor="pgSize">Size (players)</label>
              <input
                type="number"
                name="size"
                id="pgSize"
                value={formData.size}
                onChange={handleInputChange}
                min={3}
                max={22}
                placeholder="e.g: 5"
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
            
            <fieldset>
              <label htmlFor="pgCost">Cost per Hour (JOD)</label>
              <input
                type="number"
                name="costPerHour"
                id="pgCost"
                value={formData.costPerHour}
                onChange={handleInputChange}
                min={0}
                step={0.5}
                placeholder="e.g: 25.00"
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
          </div>

          <div className="form-row">
            <fieldset>
              <label htmlFor="pgOpeningTime">Opening Time</label>
              <input
                type="time"
                id="pgOpeningTime"
                name="openingTime"
                value={formData.openingTime}
                onChange={handleInputChange}
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
            
            <fieldset>
              <label htmlFor="pgClosingTime">Closing Time</label>
              <input
                type="time"
                id="pgClosingTime"
                name="closingTime"
                value={formData.closingTime}
                onChange={handleInputChange}
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
          </div>

          <div className="form-row">
            <fieldset>
              <label htmlFor="pgGoogleMapUrl">Google Maps URL</label>
              <input
                type="url"
                id="pgGoogleMapUrl"
                name="googleMapUrl"
                value={formData.googleMapUrl}
                onChange={handleInputChange}
                placeholder="https://maps.google.com/..."
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
            
            <fieldset>
              <label htmlFor="pgAppleMapUrl">Apple Maps URL</label>
              <input
                type="url"
                id="pgAppleMapUrl"
                name="appleMapUrl"
                value={formData.appleMapUrl}
                onChange={handleInputChange}
                placeholder="https://maps.apple.com/..."
                autoCorrect="false"
                spellCheck="false"
              />
            </fieldset>
          </div>

          <fieldset className="file-fieldset">
            <label htmlFor="pgImageCover">Cover Image</label>
            <input
              type="file"
              accept="image/*"
              id="pgImageCover"
              name="imageCover"
              style={{ display: 'none' }}
              onChange={handleCoverChange}
            />
            <label htmlFor="pgImageCover" className="fileUploadBtn">
              <i className="fas fa-upload"></i>
              {coverPreview ? 'Change Cover Image' : 'Choose Cover Image'}
            </label>
            {coverPreview && (
              <div className="previewBox">
                <img src={coverPreview} alt="Cover Preview" />
                <button 
                  type="button" 
                  className="remove-preview"
                  onClick={() => {
                    setCoverPreview(null);
                    document.getElementById('pgImageCover').value = '';
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </fieldset>

          <fieldset className="file-fieldset">
            <label htmlFor="pgImages">Additional Images (Optional)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              id="pgImages"
              name="images"
              style={{ display: 'none' }}
              onChange={handleImagesChange}
            />
            <label htmlFor="pgImages" className="fileUploadBtn">
              <i className="fas fa-images"></i>
              Choose Multiple Images (Max 5)
            </label>
            {imagePreviews.length > 0 && (
              <div className="previewGrid">
                {imagePreviews.map((src, index) => (
                  <div key={index} className="preview-item">
                    <img src={src} alt={`Preview ${index}`} />
                    <button 
                      type="button" 
                      className="remove-preview"
                      onClick={() => {
                        const newPreviews = imagePreviews.filter((_, i) => i !== index);
                        setImagePreviews(newPreviews);
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="update-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Update Playground
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlayground;
