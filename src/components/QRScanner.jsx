import { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import config from '../config';
import './styles/qrScanner.css';

const QRScanner = ({ onScan, onClose }) => {
  const API_URL = config.API_URL;
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'upload'
  const [cameraError, setCameraError] = useState(null);
  const [autoStart, setAutoStart] = useState(true);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const videoEventsRef = useRef({ loadedmetadata: null, canplay: null });
  const videoReadyTimeoutRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const detectionRafRef = useRef(null);
  const scanningMethodRef = useRef('');
  const zxingControlsRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    return () => {
      stopScan();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoReadyTimeoutRef.current) {
        clearTimeout(videoReadyTimeoutRef.current);
        videoReadyTimeoutRef.current = null;
      }
    };
  }, []);

  // Fetch cameras
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(cams);
        if (cams.length > 0 && currentCameraIndex >= cams.length) {
          setCurrentCameraIndex(0);
        }
      } catch {}
    };
    if (scanMode === 'camera') {
      loadCameras();
    }
  }, [scanMode]);

  // Auto-start camera when on camera mode
  useEffect(() => {
    if (autoStart && scanMode === 'camera' && !isScanning && !isProcessing && !streamRef.current) {
      startScan();
    }
  }, [autoStart, scanMode, isScanning, isProcessing]);

  const startScan = async () => {
    try {
      setError(null);
      setCameraError(null);
      setScannedData(null);
      setIsProcessing(true);

      // Basic environment check
      const isSecureContext = window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (!isSecureContext) {
        setIsProcessing(false);
        setError('Camera requires HTTPS or localhost. Please open the app over HTTPS.');
        return;
      }

      // Try different camera constraints for better compatibility
      let videoConstraints = {
        facingMode: { ideal: 'environment' },
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        aspectRatio: { ideal: 16 / 9 }
      };
      // If we have a selected camera, prefer it
      if (availableCameras.length > 0) {
        const deviceId = availableCameras[currentCameraIndex]?.deviceId;
        if (deviceId) {
          videoConstraints = { deviceId: { exact: deviceId } };
        }
      }
      const constraints = { audio: false, video: videoConstraints };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback to any available camera
        console.log('Trying fallback camera constraints...');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'environment' }
        });
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure iOS inline playback
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        
        // Robust readiness handlers
        const maybeStart = async (videoEl) => {
          if (!videoEl || startedRef.current) return;
          startedRef.current = true;
          setIsScanning(true);
          setIsProcessing(false);
          try {
            if (videoEl.paused) {
              try { await videoEl.play(); } catch {}
            }
            // Prefer ZXing for speed/robustness
            if (!zxingReaderRef.current) {
              zxingReaderRef.current = new BrowserQRCodeReader();
            }
            const deviceId = availableCameras[currentCameraIndex]?.deviceId || null;
            zxingControlsRef.current = await zxingReaderRef.current.decodeFromVideoDevice(
              deviceId,
              videoEl,
              async (result) => {
                if (result) {
                  const text = result.getText();
                  const finalText = await processScannedText(text);
                  setScannedData(finalText);
                  onScan(finalText);
                  setAutoStart(false);
                  if (zxingControlsRef.current) {
                    try { zxingControlsRef.current.stop(); } catch {}
                    zxingControlsRef.current = null;
                  }
                  stopScan();
                }
              }
            );
          } catch (e) {
            // Fallback to BarcodeDetector/jsQR
            if ('BarcodeDetector' in window) {
              scanningMethodRef.current = 'barcode';
              startBarcodeLoop();
            } else {
              scanningMethodRef.current = 'jsqr';
              scanFrame();
            }
          }
        };

        const onLoadedMetadata = (e) => {
          const videoEl = e?.currentTarget || videoRef.current;
          if (!videoEl) return;
          maybeStart(videoEl);
        };

        const onCanPlay = (e) => {
          if (!isScanning) {
            const videoEl = e?.currentTarget || videoRef.current;
            maybeStart(videoEl);
          }
        };

        videoEventsRef.current.loadedmetadata = onLoadedMetadata;
        videoEventsRef.current.canplay = onCanPlay;
        videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
        videoRef.current.addEventListener('canplay', onCanPlay);

        // Fallback timeout in case events don't fire
        videoReadyTimeoutRef.current = setTimeout(() => {
          const videoEl = videoRef.current;
          if (videoEl && !isScanning) {
            try {
              if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                maybeStart(videoEl);
              }
            } catch {}
          }
        }, 2000);

        videoRef.current.onerror = () => {
          setError('Video element error. Please refresh and try again.');
          setIsProcessing(false);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsProcessing(false);
      setCameraError(err);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera not supported on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application.');
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const stopScan = () => {
    startedRef.current = false;
    if (zxingControlsRef.current) {
      try { zxingControlsRef.current.stop(); } catch {}
      zxingControlsRef.current = null;
    }
    zxingReaderRef.current = null;
    if (detectionRafRef.current) {
      cancelAnimationFrame(detectionRafRef.current);
      detectionRafRef.current = null;
    }
    barcodeDetectorRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current) {
      const { loadedmetadata, canplay } = videoEventsRef.current;
      if (loadedmetadata) videoRef.current.removeEventListener('loadedmetadata', loadedmetadata);
      if (canplay) videoRef.current.removeEventListener('canplay', canplay);
      videoEventsRef.current.loadedmetadata = null;
      videoEventsRef.current.canplay = null;
      try {
        const srcStream = videoRef.current.srcObject;
        if (srcStream && typeof srcStream.getTracks === 'function') {
          srcStream.getTracks().forEach(t => {
            try { t.stop(); } catch {}
          });
        }
        videoRef.current.srcObject = null;
      } catch {}
    }
    if (videoReadyTimeoutRef.current) {
      clearTimeout(videoReadyTimeoutRef.current);
      videoReadyTimeoutRef.current = null;
    }
    setIsScanning(false);
    setIsProcessing(false);
  };

  // Build display text from scanned payload and live server status
  const processScannedText = async (text) => {
    const lines = String(text || '')
      .split(/\n|\\n/)
      .filter(l => l.trim());
    const map = {};
    lines.forEach(line => {
      const [k, ...rest] = line.split(': ');
      const key = (k || '').trim();
      const value = rest.join(': ').trim();
      if (key) map[key] = value;
    });

    let finalText = text;
    try {
      const dateStr = map['Date'];
      const timeStr = map['Time'];
      if (dateStr && timeStr) {
        const [startStr, endStr] = timeStr.split(' - ').map(s => s.trim());
        const endDateTime = new Date(`${dateStr} ${endStr}`);
        if (!isNaN(endDateTime.getTime())) {
          const now = new Date();
          if (endDateTime < now) {
            finalText = String(finalText).match(/Status:\s*/i)
              ? String(finalText).replace(/Status:\s*.*/i, 'Status: expired')
              : String(finalText) + '\nStatus: expired';
          }
        }
      }
    } catch {}

    const bookingId = map['Booking ID'];
    const token = localStorage.getItem('token');
    if (bookingId) {
      try {
        const res = await fetch(`${API_URL}bookings/${bookingId}`, {
          headers: { Authorization: token },
        });
        const data = await res.json();
        if (res.ok) {
          const serverStatus = (data?.result?.status || data?.data?.status || data?.booking?.status || data?.status || '').toString();
          if (serverStatus) {
            finalText = String(finalText).match(/Status:\s*/i)
              ? String(finalText).replace(/Status:\s*.*/i, `Status: ${serverStatus}`)
              : String(finalText) + `\nStatus: ${serverStatus}`;
          }
        }
      } catch {}
    }

    return finalText;
  };

  const handleStopClick = () => {
    setAutoStart(false); // prevent auto-restart
    stopScan();
  };

  const handleCloseClick = () => {
    setAutoStart(false);
    stopScan();
    onClose();
  };

  const scanFrame = () => {
    if (!videoRef.current || !isScanning) return;
    
    const now = performance.now();
    // Throttle to ~25fps
    if (scanFrame.lastCall && now - scanFrame.lastCall < 40) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    scanFrame.lastCall = now;

    try {
      if ((videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0)) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        if (videoWidth === 0 || videoHeight === 0) {
          // Video not ready yet, try again
          if (isScanning) {
            animationFrameRef.current = requestAnimationFrame(scanFrame);
          }
          return;
        }
        
        // Try multiple scales for robustness
        const widths = [640, 800, Math.min(1024, videoWidth)];
        for (let w of widths) {
          const targetWidth = Math.min(w, videoWidth);
          const scale = targetWidth / videoWidth;
          const targetHeight = Math.floor(videoHeight * scale);
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          context.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);
          const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
          try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (code && code.data) {
              console.log('QR Code detected:', code.data);
              setScannedData(code.data);
              onScan(code.data);
              setAutoStart(false);
              stopScan();
              return;
            }
          } catch (qrError) {
            console.error('QR detection error:', qrError);
          }
        }
      }
    } catch (frameError) {
      console.error('Frame processing error:', frameError);
      // Continue scanning even if frame processing fails
    }
    
    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const barcodeLoop = async () => {
    if (!videoRef.current || !isScanning) return;
    try {
      if (!barcodeDetectorRef.current) {
        // Prefer QR only for speed
        // Some browsers require no formats array; catch and retry
        try {
          barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          barcodeDetectorRef.current = new window.BarcodeDetector();
        }
      }
      const results = await barcodeDetectorRef.current.detect(videoRef.current);
      if (results && results.length) {
        // Prefer first QR-like result
        const match = results.find(r => (r.format || r.rawValue)) || results[0];
        if (match && match.rawValue) {
          setScannedData(match.rawValue);
          onScan(match.rawValue);
          setAutoStart(false);
          stopScan();
          return;
        }
      }
    } catch (e) {
      // If BarcodeDetector fails, fall back to jsQR
      console.warn('BarcodeDetector failed, falling back to jsQR', e);
      scanningMethodRef.current = 'jsqr';
      scanFrame();
      return;
    }
    detectionRafRef.current = requestAnimationFrame(barcodeLoop);
  };

  const startBarcodeLoop = () => {
    if (!isScanning) return;
    if (detectionRafRef.current) cancelAnimationFrame(detectionRafRef.current);
    detectionRafRef.current = requestAnimationFrame(barcodeLoop);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset file input
    event.target.value = '';
    
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setScannedData(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          // Set reasonable canvas size for processing
          const maxSize = 1024;
          let { width, height } = img;
          
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          context.drawImage(img, 0, 0, width, height);
          const imageData = context.getImageData(0, 0, width, height);
          
          try {
            // Prefer ZXing for still image
            if (!zxingReaderRef.current) {
              zxingReaderRef.current = new BrowserQRCodeReader();
            }
            zxingReaderRef.current
              .decodeFromImage(undefined, img)
              .then(async (result) => {
                setIsProcessing(false);
                if (result) {
                  const text = result.getText();
                  const finalText = await processScannedText(text);
                  setScannedData(finalText);
                  onScan(finalText);
                  setError(null);
                } else {
                  setError('No QR code found in the image. Please try a clearer image.');
                  setScannedData(null);
                }
              })
              .catch((e) => {
                console.error('ZXing image decode error:', e);
                setIsProcessing(false);
                setError('Failed to process the image. Please try a different image.');
                setScannedData(null);
              });
          } catch (qrError) {
            console.error('Image processing error:', qrError);
            setIsProcessing(false);
            setError('Failed to process the image. Please try again.');
            setScannedData(null);
          }
        } catch (canvasError) {
          console.error('Canvas processing error:', canvasError);
          setIsProcessing(false);
          setError('Failed to process the image. Please try again.');
          setScannedData(null);
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        setError('Failed to load the image. Please try again.');
        setScannedData(null);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setError('Failed to read the file. Please try again.');
      setScannedData(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const switchToCamera = () => {
    setScanMode('camera');
    setError(null);
    setCameraError(null);
    setScannedData(null);
    setAutoStart(true);
  };

  const switchToUpload = () => {
    setScanMode('upload');
    setAutoStart(false);
    stopScan();
    setError(null);
    setCameraError(null);
    setScannedData(null);
  };

  const switchCamera = () => {
    if (availableCameras.length <= 1) return;
    setCurrentCameraIndex((prev) => {
      const next = (prev + 1) % availableCameras.length;
      return next;
    });
    // Restart with new camera
    setTimeout(() => {
      setAutoStart(true);
      stopScan();
      startScan();
    }, 100);
  };

  const retryCamera = () => {
    setAutoStart(true);
    stopScan();
    setCameraError(null);
    setError(null);
    setTimeout(() => {
      startScan();
    }, 500);
  };

  return (
    <div className="qr-scanner-modal">
      <div className="qr-scanner-content">
        <div className="scanner-header">
          <h2>
            <i className="fas fa-qrcode"></i>
            QR Code Scanner
          </h2>
          <button className="close-scanner" onClick={handleCloseClick}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="scanner-mode-tabs">
          <button 
            className={`mode-tab ${scanMode === 'camera' ? 'active' : ''}`}
            onClick={switchToCamera}
          >
            <i className="fas fa-camera"></i>
            Camera Scan
          </button>
          <button 
            className={`mode-tab ${scanMode === 'upload' ? 'active' : ''}`}
            onClick={switchToUpload}
          >
            <i className="fas fa-upload"></i>
            Upload Image
          </button>
        </div>

        <div className="scanner-body">
          {scanMode === 'camera' && (
            <div className="camera-scanner">
              {!isScanning && !isProcessing && (
                <div className="camera-placeholder">
                  <div className="camera-icon">
                    <i className="fas fa-camera fa-3x"></i>
                  </div>
                  <h3>Ready to Scan</h3>
                  <p>Position the QR code within the scanning area</p>
                  <button onClick={startScan} className="start-scan-btn">
                    <i className="fas fa-play"></i>
                    Start Camera
                  </button>
                  {availableCameras.length > 1 && (
                    <button onClick={switchCamera} className="switch-camera-btn">
                      <i className="fas fa-sync-alt"></i>
                      Switch Camera
                    </button>
                  )}
                  {cameraError && (
                    <button onClick={retryCamera} className="retry-camera-btn">
                      <i className="fas fa-redo"></i>
                      Retry Camera
                    </button>
                  )}
                </div>
              )}

              {(isProcessing || isScanning) && (
                <div className="video-container">
                  <video 
                    ref={videoRef} 
                    className="scanner-video" 
                    playsInline 
                    autoPlay 
                    muted
                  />
                  <div className="scanner-overlay">
                    <div className="scan-area">
                      <div className="scan-corners">
                        <div className="corner top-left"></div>
                        <div className="corner top-right"></div>
                        <div className="corner bottom-left"></div>
                        <div className="corner bottom-right"></div>
                      </div>
                      <div className="scan-line"></div>
                    </div>
                  </div>
                  <div className="scanner-instructions">
                    <p>
                      <i className="fas fa-crosshairs"></i>
                      Point camera at the QR code (no need to center)
                    </p>
                    <div className="scanner-actions">
                      <button onClick={handleStopClick} className="stop-scan-btn">
                        <i className="fas fa-stop"></i>
                        Stop Scanning
                      </button>
                      {availableCameras.length > 1 && (
                        <button onClick={switchCamera} className="switch-camera-btn">
                          <i className="fas fa-sync-alt"></i>
                          Switch Camera
                        </button>
                      )}
                    </div>
                  </div>
                  {isProcessing && (
                    <div className="camera-loading">
                      <div className="loading-spinner"></div>
                      <p>Starting camera...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {scanMode === 'upload' && (
            <div className="upload-scanner">
              <div className="upload-area" onClick={triggerFileUpload}>
                <div className="upload-icon">
                  <i className="fas fa-cloud-upload-alt fa-3x"></i>
                </div>
                <h3>Upload QR Code Image</h3>
                <p>Click here or drag and drop an image containing a QR code</p>
                <button type="button" className="upload-btn">
                  <i className="fas fa-folder-open"></i>
                  Choose File
                </button>
              </div>
              
              {isProcessing && (
                <div className="processing-indicator">
                  <div className="loading-spinner"></div>
                  <p>Processing image...</p>
                </div>
              )}
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {error && (
            <div className="scanner-error">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}
          
          {scannedData && (
            <div className="scan-success">
              <div className="success-header">
                <i className="fas fa-check-circle"></i>
                <h3>QR Code Scanned Successfully!</h3>
              </div>
              <div className="scanned-data">
                <div className="scanned-data-header">
                  <div className="header-icon">
                    <i className="fas fa-info-circle"></i>
                  </div>
                  <h3>Scanned Data</h3>
                  <p>The following data was extracted from the QR code:</p>
                </div>
                {(() => {
                  const lines = String(scannedData || '')
                    .split(/\\n|\n/)
                    .filter(line => line.trim());
                  const dataMap = {};
                  lines.forEach(line => {
                    const [k, ...rest] = line.split(': ');
                    const key = (k || '').trim();
                    const value = rest.join(': ').trim();
                    if (key) dataMap[key] = value;
                  });
                  const status = (dataMap['Status'] || '').toLowerCase();
                  const serverStatus = (dataMap['Server Status'] || '').toLowerCase();
                  const items = [
                    { key: 'Booking ID', value: dataMap['Booking ID'], cls: 'booking-id' },
                    { key: 'Playground', value: dataMap['Playground'] },
                    { key: 'Date', value: dataMap['Date'] },
                    { key: 'Time', value: dataMap['Time'] },
                    { key: 'Price', value: dataMap['Price'], cls: 'price' },
                    { key: 'User', value: dataMap['User'] },
                  ];
                  return (
                    <div className="scanned-data-content">
                      <ul className="kv-list">
                        {items.map(({ key, value, cls }) => (
                          value ? (
                            <li key={key} className="kv-item">
                              <span className="kv-label">{key}</span>
                              <span className={`kv-value ${cls || ''}`.trim()}>{value}</span>
                            </li>
                          ) : null
                        ))}
                        {dataMap['Status'] && (
                          <li className="kv-item">
                            <span className="kv-label">Status</span>
                            <span className={`kv-value status ${status}`}>{dataMap['Status']}</span>
                          </li>
                        )}
                        {dataMap['Server Status'] && (
                          <li className="kv-item">
                            <span className="kv-label">Server Status</span>
                            <span className={`kv-value status ${serverStatus}`}>{dataMap['Server Status']}</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })()}
                <div className="success-actions">
                  <button onClick={() => setScannedData(null)} className="scan-again-btn">
                    <i className="fas fa-redo"></i>
                    Scan Again
                  </button>
                  <button onClick={onClose} className="close-btn">
                    <i className="fas fa-check"></i>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner; 