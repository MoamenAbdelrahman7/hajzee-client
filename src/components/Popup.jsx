import { useEffect } from 'react';
import './styles/Popup.css';

export default function Popup({ message, type = 'error', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className={`popup ${type}`}>
      <div className="popup-content">
        <span className="popup-message">{message}</span>
        <button className="popup-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}
