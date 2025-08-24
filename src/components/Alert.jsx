import { useEffect } from 'react';
import './styles/alert.css';

const Alert = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <i className="fas fa-check-circle"></i>;
      case 'error':
        return <i className="fas fa-exclamation-circle"></i>;
      case 'warning':
        return <i className="fas fa-exclamation-triangle"></i>;
      default:
        return <i className="fas fa-info-circle"></i>;
    }
  };

  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-content">
        <span className="alert-icon">
          {getIcon()}
        </span>
        <span className="alert-message">{message}</span>
        <button 
          className="alert-close"
          onClick={onClose}
          aria-label="Close alert"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default Alert; 