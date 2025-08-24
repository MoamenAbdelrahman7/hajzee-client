import './styles/deleteConfirmation.css';

const DeleteConfirmation = ({ playground, onConfirm, onCancel }) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div className="deleteConfirmationContainer" onClick={handleOverlayClick}>
      <div className="deleteConfirmationModal">
        <div className="deleteConfirmationHeader">
          <h2>Delete Playground</h2>
          <button className="close-btn" onClick={handleCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="deleteConfirmationContent">
          <div className="warning-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          
          <h3>Are you sure you want to delete this playground?</h3>
          
          <div className="playground-info">
            <img 
              src={`http://127.0.0.1:8000/static/img/playgrounds/${playground.imageCover}`} 
              alt={playground.name}
              className="playground-thumbnail"
            />
            <div className="playground-details">
              <h4>{playground.name}</h4>
              <p>📍 {playground.location}</p>
              <p>💰 {playground.costPerHour} JOD/hr</p>
              <p>👥 {playground.size}x{playground.size}</p>
            </div>
          </div>
          
          <div className="warning-message">
            <p>
              <strong>Warning:</strong> This action cannot be undone. All bookings and data associated with this playground will be permanently deleted.
            </p>
          </div>
        </div>
        
        <div className="deleteConfirmationActions">
          <button className="cancel-btn" onClick={handleCancel}>
            <i className="fas fa-times"></i>
            Cancel
          </button>
          <button className="delete-btn" onClick={handleConfirm}>
            <i className="fas fa-trash"></i>
            Delete Playground
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation;
