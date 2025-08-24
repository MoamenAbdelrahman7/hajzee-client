import { useEffect, useRef, useState } from 'react';
import { fetchActiveAds, trackImpression, trackClick } from '../services/ads';
import { IMAGES } from '../config';

const AdBanner = ({ placement = 'home' }) => {
  const [ads, setAds] = useState([]);
  const [idx, setIdx] = useState(0);
  const seenRef = useRef(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await fetchActiveAds(placement);
      if (!mounted) return;
      setAds(list);
    })();
    return () => { mounted = false; };
  }, [placement]);

  useEffect(() => {
    if (ads.length === 0) return;
    // track impression once per ad per mount
    const ad = ads[idx % ads.length];
    if (ad && ad._id && !seenRef.current.has(ad._id)) {
      seenRef.current.add(ad._id);
      trackImpression(ad._id);
    }
    const t = setInterval(() => setIdx((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads, idx]);

  if (!ads || ads.length === 0) return null;
  const current = ads[idx % ads.length];

  return (
    <div className="ads">
      <div className="slides" style={{ transform: `translateX(-${idx * 100}%)`, transition: 'transform 0.5s ease-in-out' }}>
        {ads.map((ad) => (
          <div className="slide" key={ad._id}>
            <a
              href={ad.link || '#'}
              target={ad.link ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!ad.link) e.preventDefault();
                trackClick(ad._id);
              }}
              style={{ display: 'block', width: '100%', height: '100%' }}
            >
              <img
                src={IMAGES.ads + ad.image}
                alt={ad.title || 'Ad'}
                // style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdBanner;


