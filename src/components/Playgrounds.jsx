import './styles/playgrounds.css';
import { useEffect, useRef, useState } from 'react';
import config, { IMAGES, PUBLIC_ASSETS } from '../config';
import { QRCodeSVG } from 'qrcode.react';
import NewPlayground from './NewPlayground';

const Playgrounds = () => {
  const [user, setUser] = useState({});

  // Reservations
  const IMAGES_URL = IMAGES.playgrounds;

  const [PGdetailsShow, setPGdetailsShow] = useState(false);

  const [duration, setDuration] = useState(0);
  const [size, setSize] = useState(-1);

  const [startTimeIdx, setStartTimeIdx] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');

  const [showDirections, setShowDirections] = useState(false);

  const [paymentMethodIdx, setPaymentMethodIdx] = useState(0);

  const [showBookingInfo, setShowBookingInfo] = useState(false);
  const [bookingInfo, setBookingInfo] = useState({});

  const [favourites, setFavourites] = useState({});
  const [openedPlayground, setOpenedPlayground] = useState(null);

  const [searchResult, setSearchResult] = useState([]);

  // Enhanced search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: { min: 0, max: 100 },
    size: 'all',
    location: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Image modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [playgroundImages, setPlaygroundImages] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState(new Set());

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    console.log('user from playgrounds, ', storedUser);

    setUser(storedUser);
    const getPlaygrounds = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log(
          'user playgrounds, ',
          `http://127.0.0.1:8000/playgrounds/${storedUser?.role === 'owner' ? 'owner' : ''}`,
          user.role
        );

        const response = await fetch(
          `${config.API_URL}playgrounds/${storedUser?.role === 'owner' ? 'owner' : ''}`,
          {
            headers: { Authorization: token },
          }
        );
        const data = await response.json();

        return data.result.data;
      } catch (error) {
        console.error('Error fetching playgrounds:', error);
      }
    };

    getPlaygrounds().then((data) => {
      setSearchResult(data);
      setOriginalPlaygrounds(data);
    });
  }, []);

  const addToFavourites = async (pgId) => {
    const token = localStorage.getItem('token');
    console.log('Adding to favorites, playground ID:', pgId);

    if (!token) {
      console.error('No token found in localStorage');
      return false;
    }

    // Make sure we have a valid string ID
    const playgroundId = typeof pgId === 'object' ? pgId._id : pgId;

    if (!playgroundId) {
      console.error('Invalid playground ID provided:', pgId);
      return false;
    }

    try {
      console.log(`Making API request to add to favorites for ID: ${playgroundId}...`);
      const response = await fetch(`${config.API_URL}favourites/`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playground: playgroundId }),
      });

      console.log('Add to favorites API response status:', response.status);

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        console.error('Response was not valid JSON:', responseText);
        return false;
      }

      if (!response.ok) {
        console.error('Error adding to favorites - API returned error:', data);
        return false;
      }

      console.log('Added to favorites successfully:', data);

      // Update favorites state to reflect the change immediately
      setFavourites((prev) => ({
        ...prev,
        [pgId]: true,
      }));

      // Refresh the favorites list to ensure we have the latest data
      setTimeout(() => {
        fetchFavorites();
      }, 500);

      return true;
    } catch (error) {
      console.error('Error adding to favorites - exception occurred:', error);
      return false;
    }
  };

  const removeFromFavourites = async (pgId) => {
    const token = localStorage.getItem('token');
    console.log('Removing from favorites, playground ID:', pgId);

    if (!token) {
      console.error('No token found in localStorage');
      return false;
    }

    // Make sure we have a valid string ID
    const playgroundId = typeof pgId === 'object' ? pgId._id : pgId;

    if (!playgroundId) {
      console.error('Invalid playground ID provided:', pgId);
      return false;
    }

    try {
      console.log(`Making API request to remove from favorites for ID: ${playgroundId}...`);
      const response = await fetch(`${config.API_URL}favourites/`, {
        method: 'DELETE',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playground: playgroundId }),
      });

      console.log('Remove from favorites API response status:', response.status);

      // Some APIs don't return JSON for DELETE requests
      let data;
      let responseText = '';

      try {
        responseText = await response.text();
        console.log('Raw response text:', responseText);

        // Only try to parse as JSON if there's actual content
        if (responseText.trim()) {
          data = JSON.parse(responseText);
        }
      } catch (e) {
        console.warn('Could not parse response as JSON:', e);
        // If no JSON response but status is OK, that's fine for DELETE
        if (!response.ok) {
          console.error('Error removing from favorites - non-JSON response with error status');
          return false;
        }
      }

      if (!response.ok) {
        console.error('Error removing from favorites - API returned error:', data || responseText);
        return false;
      }

      console.log('Removed from favorites successfully');

      // Update favorites state to reflect the change immediately
      setFavourites((prev) => {
        const newState = { ...prev };
        delete newState[pgId];
        return newState;
      });

      // Refresh the favorites list to ensure we have the latest data
      setTimeout(() => {
        fetchFavorites();
      }, 500);

      return true;
    } catch (error) {
      console.error('Error removing from favorites - exception occurred:', error);
      return false;
    }
  };

  // Separate function to fetch favorites for better debugging
  const fetchFavorites = async () => {
    console.log('Fetching favorites...');
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      return;
    }

    try {
      console.log('Making API request to fetch favorites...');
      const response = await fetch(`${config.API_URL}favourites/`, {
        headers: {
          Authorization: token,
          Accept: 'application/json',
        },
      });

      console.log('Favorites API response status:', response.status);

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        console.error('Response was not valid JSON:', responseText);
        return;
      }

      if (!response.ok) {
        console.error('Error fetching favorites - API returned error:', data);
        return;
      }

      console.log('Favorites data successfully received:', data);

      // Validate the data structure
      if (!data.data || !Array.isArray(data.data)) {
        console.error('Unexpected data format - expected data.data to be an array:', data);
        return;
      }

      // Create a map of playground IDs for easy lookup
      const favouritesMap = {};
      data.data.forEach((fav) => {
        if (fav) {
          // Handle both string IDs and object references
          if (typeof fav.playground === 'object' && fav.playground?._id) {
            favouritesMap[fav.playground._id] = true;
            console.log(`Added favorite with object ID: ${fav.playground._id}`);
          } else if (typeof fav.playground === 'string') {
            favouritesMap[fav.playground] = true;
            console.log(`Added favorite with string ID: ${fav.playground}`);
          } else {
            console.warn('Invalid playground reference in favorite:', fav);
          }
        } else {
          console.warn('Invalid favorite item found:', fav);
        }
      });

      console.log('Processed favorites map:', favouritesMap);
      setFavourites(favouritesMap);
    } catch (error) {
      console.error('Error fetching favorites - exception occurred:', error);
    }
  };

  // Effect to fetch favorites when user is loaded
  useEffect(() => {
    if (user?.role === 'user') {
      fetchFavorites();
    }
  }, [user]);
  // Store original playgrounds data for search
  const [originalPlaygrounds, setOriginalPlaygrounds] = useState([]);

  // Enhanced search and filter function
  const applySearchAndFilters = () => {
    let filtered = [...originalPlaygrounds];

    // Text search (name and location)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (pg) =>
          pg.name.toLowerCase().includes(searchLower) ||
          pg.location.toLowerCase().includes(searchLower)
      );
    }

    // Price range filter
    filtered = filtered.filter(
      (pg) => pg.costPerHour >= filters.priceRange.min && pg.costPerHour <= filters.priceRange.max
    );

    // Size filter
    if (filters.size !== 'all') {
      filtered = filtered.filter((pg) => pg.size === parseInt(filters.size));
    }

    // Location filter
    if (filters.location.trim()) {
      const locationLower = filters.location.toLowerCase();
      filtered = filtered.filter((pg) => pg.location.toLowerCase().includes(locationLower));
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.costPerHour;
          bValue = b.costPerHour;
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'location':
          aValue = a.location.toLowerCase();
          bValue = b.location.toLowerCase();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setSearchResult(filtered);
  };

  // Apply filters whenever search term or filters change
  useEffect(() => {
    applySearchAndFilters();
  }, [searchTerm, filters, originalPlaygrounds]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      priceRange: { min: 0, max: 100 },
      size: 'all',
      location: '',
      sortBy: 'name',
      sortOrder: 'asc',
    });
    setSearchTerm('');
  };

  // Get unique sizes for filter dropdown
  const getUniqueSizes = () => {
    const sizes = [...new Set(originalPlaygrounds.map((pg) => pg.size))];
    return sizes.sort((a, b) => a - b);
  };

  // Get unique locations for filter dropdown
  const getUniqueLocations = () => {
    const locations = [...new Set(originalPlaygrounds.map((pg) => pg.location))];
    return locations.sort();
  };

  // Legacy search function (keeping for backward compatibility)
  const search = (val) => {
    setSearchTerm(val);
  };

  // Image modal functions
  const openImageModal = (playground, imageIndex = 0) => {
    const images = [playground.imageCover, ...(playground.images || [])];
    setPlaygroundImages(images);
    setCurrentImageIndex(imageIndex);
    setSelectedImage(playground);
    setShowImageModal(true);
    setImageLoading(true);

    // Preload all images
    images.forEach((image, index) => {
      const img = new Image();
      img.onload = () => {
        setPreloadedImages((prev) => new Set([...prev, image]));
        if (index === imageIndex) {
          setImageLoading(false);
        }
      };
      img.onerror = () => {
        console.warn(`Failed to preload image: ${image}`);
        if (index === imageIndex) {
          setImageLoading(false);
        }
      };
      img.src = `${IMAGES_URL}${image}`;
    });
  };

  const openPlaygroundImages = () => {
    if (openedPlayground) {
      openImageModal(openedPlayground, index);
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    setCurrentImageIndex(0);
    setPlaygroundImages([]);
    setImageLoading(false);
    setPreloadedImages(new Set());
  };

  const nextImage = () => {
    const nextIndex = currentImageIndex === playgroundImages.length - 1 ? 0 : currentImageIndex + 1;
    setCurrentImageIndex(nextIndex);

    // Show loading if image is not preloaded
    if (!preloadedImages.has(playgroundImages[nextIndex])) {
      setImageLoading(true);
      const img = new Image();
      img.onload = () => {
        setPreloadedImages((prev) => new Set([...prev, playgroundImages[nextIndex]]));
        setImageLoading(false);
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${playgroundImages[nextIndex]}`);
        setImageLoading(false);
      };
      img.src = `${IMAGES_URL}${playgroundImages[nextIndex]}`;
    } else {
      setImageLoading(false);
    }
  };

  const prevImage = () => {
    const prevIndex = currentImageIndex === 0 ? playgroundImages.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(prevIndex);

    // Show loading if image is not preloaded
    if (!preloadedImages.has(playgroundImages[prevIndex])) {
      setImageLoading(true);
      const img = new Image();
      img.onload = () => {
        setPreloadedImages((prev) => new Set([...prev, playgroundImages[prevIndex]]));
        setImageLoading(false);
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${playgroundImages[prevIndex]}`);
        setImageLoading(false);
      };
      img.src = `${IMAGES_URL}${playgroundImages[prevIndex]}`;
    } else {
      setImageLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showImageModal) return;

    switch (e.key) {
      case 'Escape':
        closeImageModal();
        break;
      case 'ArrowRight':
        nextImage();
        break;
      case 'ArrowLeft':
        prevImage();
        break;
      default:
        break;
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal, playgroundImages.length]);

  const [index, setIndex] = useState(0);
  const slideRef = useRef();

  const handleNext = () => {
    if (!slideRef.current) return;
    const total = slideRef.current.children.length;
    if (total > 0 && index < total - 1) {
      setIndex((prev) => (prev + 1) % total);
    }
  };

  const handlePrev = () => {
    if (!slideRef.current) return;
    const total = slideRef.current.children.length;
    if (total > 0 && index > 0) {
      setIndex((prev) => (prev - 1 + total) % total);
    }
  };

  const [conflict, setConflict] = useState(null);
  const sendBookingInfo = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    // Convert FormData to plain object:
    const data = Object.fromEntries(formData.entries());
    
    // Calculate the cost based on duration and playground cost per hour
    const duration = parseFloat(data.duration) || 0;
    const costPerHour = parseFloat(openedPlayground?.costPerHour) || 0;
    const totalCost = duration * costPerHour;
    
    // Add calculated cost to the data
    data.cost = totalCost;
    
    // Ensure status is set to pending for new bookings
    data.status = 'pending';
    
    const token = localStorage.getItem('token');
    if (!openedPlayground?._id) {
      console.error('No playground selected or playground ID is missing');
      return;
    }

    console.log('openedPlayground._id, ', openedPlayground._id);
    console.log('Calculated cost: ', totalCost, 'JOD for', duration, 'hours at', costPerHour, 'JOD/hour');

    const response = await fetch(`${config.API_URL}playgrounds/${openedPlayground._id}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(data),
    });
    console.log('res.status, ', response.status);

    const resData = await response.json();
    console.log('resData, ', resData);
    if (response.status === 409) {
      setConflict(resData.conflict);
    } else {
      setConflict({});
      setBookingInfo(resData.booking);
      console.log('resData.booking, ', resData.booking);

      setShowBookingInfo(true);
      
      // Refresh the playground bookings list to show the new booking
      if (openedPlayground?._id) {
        const refreshResponse = await fetch(`${config.API_URL}bookings/playground/${openedPlayground._id}`, {
          headers: { Authorization: token },
        });
        const refreshData = await refreshResponse.json();
        if (refreshResponse.ok) {
          setPlaygroundBookings(refreshData.result || []);
        }
      }
    }
    // console.log('resData', resData);
  };

  function generateTimeSlots(startHour, endHour, intervalMinutes = 30) {
    const times = [];
    const todayIso = new Date().toISOString().split('T')[0];
    const isToday = selectedDate && selectedDate === todayIso;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let min = 0; min < 60; min += intervalMinutes) {
        if (hour === endHour && min > 30) break;
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        const slotMinutes = hour * 60 + min;
        const isPast = isToday && slotMinutes <= currentMinutes;
        times.push({ time: timeStr, disabled: isPast });
      }
    }
    return times;
  }

  const [showQrCode, setShowQrCode] = useState(false);
  const confirmBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_URL}bookings/${bookingId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      });
      const data = await response.json();
      if (response.ok) {
        // Update the booking status to confirmed instead of refreshing
        setPlaygroundBookings(prev => prev.map(booking => 
          booking._id === bookingId 
            ? { ...booking, status: 'confirmed' }
            : booking
        ));
        setShowQrCode(true);
      } else {
        console.error('Failed to confirm booking:', data.message);
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_URL}bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      });
      const data = await response.json();
      if (response.ok) {
        // Update the booking status to canceled instead of removing it
        setPlaygroundBookings(prev => prev.map(booking => 
          booking._id === bookingId 
            ? { ...booking, status: 'canceled' }
            : booking
        ));
        console.log('Booking canceled successfully');
      } else {
        console.error('Failed to cancel booking:', data.message);
      }
    } catch (error) {
      console.error('Error canceling booking:', error);
    }
  };

  function getHourDifference(startTime, endTime) {
    if (!startTime || !endTime) return 0;

    const start = new Date(startTime);
    const end = new Date(endTime);

    const diffMs = end - start;

    if (diffMs < 0) return 0;

    const diffHours = diffMs / (1000 * 60 * 60);
    return parseFloat(diffHours.toFixed(2)); // round to 2 decimal places
  }

  const [showNewPlayground, setShowNewPlayground] = useState(false);

  const [playgroundBookings, setPlaygroundBookings] = useState([]);
  useEffect(() => {
    const getPlaygroundBookings = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_URL}bookings/playground/${openedPlayground?._id}`, {
        headers: { Authorization: token },
      });
      const data = await response.json();
      if (!response.ok) {
        console.log('err, ', data);
        return;
      }
      // Keep all bookings including canceled ones for filtering
      setPlaygroundBookings(data.result || []);
    };
    if (openedPlayground?._id) {
      getPlaygroundBookings();
    }
  }, [openedPlayground]);

  return (
    <>
      <section>
        <div className="playgrounds">
          <div className="searchBar">
            <h2>Playgrounds</h2>
            <span>
              <div className="search">
                <i className="fas fa-search" id="searchIcon"></i>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  id="searchInput"
                  placeholder="Search playgrounds by name or location..."
                />
                <button onClick={() => setShowFilterModal(true)}>
                  <i className="fas fa-sliders-h" id="filterIcon"></i>
                </button>
              </div>
              {user?.role === 'owner' && (
                <button id="new-pg-Btn" onClick={() => setShowNewPlayground((prev) => !prev)}>
                  New
                </button>
              )}
            </span>
          </div>

          <div className="items">
            {searchResult?.length === 0 ? (
              <p className="emptyMsg">There is no playgrounds!</p>
            ) : (
              searchResult?.map((pg) => (
                <div
                  key={pg._id}
                  className="item"
                  onClick={() => {
                    setShowBookingInfo(false);
                    console.log('openning ', pg.name);

                    // Reset form fields when opening a new playground
                    setDuration(0);
                    setSize(-1);
                    setStartTimeIdx(null);
                    setConflict(null);
                    setShowDirections(false);
                    setIndex(0); // Reset image slider
                    console.log('pg, ', pg);

                    setOpenedPlayground(pg);
                    setPGdetailsShow(true);
                  }}
                >
                  {user?.role === 'user' && (
                    <button
                      id="favouriteBt"
                      onClick={async (e) => {
                        e.stopPropagation();

                        // If already in favorites, we'd need a remove function
                        // For now, we'll just toggle the UI and add if not in favorites
                        if (!favourites[pg._id]) {
                          const success = await addToFavourites(pg._id);
                          if (!success) {
                            console.error('Failed to add to favorites');
                          }
                        } else {
                          const success = await removeFromFavourites(pg._id);
                          if (!success) {
                            console.error('Failed to remove from favorites');
                          }
                        }
                      }}
                    >
                      <i className={`${favourites[pg._id] ? 'fas' : 'far'} fa-heart`}></i>
                    </button>
                  )}
                  <img
                    src={`${IMAGES_URL}${pg.imageCover}`}
                    alt={pg.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      openImageModal(pg, 0);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  {console.log(`${IMAGES_URL}${pg.imageCover}`)}
                  <div className="info">
                    <h3 className="title">{pg.name}</h3>
                    <span>
                      <p className="location">
                        <i className="fas fa-map-marker-alt item-location-icon"></i>
                        {pg.location}
                      </p>
                      <small className="price">{pg.costPerHour} JoD/hr</small>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            className="playgroundDetails"
            style={{ display: PGdetailsShow ? 'block' : 'none' }}
            onClick={() => setPGdetailsShow(false)}
          >
            <div
              className="centerBox"
              style={{ display: showBookingInfo ? 'none' : 'block' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="closeBt" onClick={() => setPGdetailsShow(false)}>
                <img src={`${PUBLIC_ASSETS.images}x.png`} alt="#" />
              </button>

              {user?.role === 'user' ? (
                <>
                  <div className="images">
                    <button className="prev" onClick={handlePrev}>
                      <img src={`${PUBLIC_ASSETS.icons}left-arrow-prev.png`} alt="#" />
                    </button>

                    <div className="slider">
                      <div
                        className="slides"
                        ref={slideRef}
                        style={{
                          transform: `translateX(-${index * 100}%)`,
                          transition: 'transform 0.5s ease-in-out',
                        }}
                      >
                        {openedPlayground?.images ? (
                          openedPlayground.images.map((img, idx) => (
                            <img key={idx} src={`${IMAGES_URL}${img}`} alt="#" />
                          ))
                        ) : (
                          <img
                            src={`${IMAGES_URL}${openedPlayground?.imageCover || 'default.jpg'}`}
                            alt="Playground"
                          />
                        )}
                      </div>
                    </div>

                    <button className="next" onClick={handleNext}>
                      <img src={`${PUBLIC_ASSETS.icons}right-arrow-next.png`} alt="#" />
                    </button>

                    <button className="fullscreen-btn" onClick={openPlaygroundImages}>
                      <i className="fas fa-expand"></i>
                    </button>

                    <h2 className="name">{openedPlayground?.name}</h2>
                  </div>

                  <div className="info">
                    <div className="location">
                      <span>
                        <i className="fas fa-map-marker-alt location-icon"></i>
                        <p>{openedPlayground?.location}</p>
                      </span>

                      <button onClick={() => setShowDirections(!showDirections)}>
                        <i className="fas fa-directions"></i> Get Directions
                      </button>
                      <div
                        className="directions"
                        style={{ display: showDirections ? 'flex' : 'none' }}
                      >
                        <div className="googleMaps">
                          <img src={`${PUBLIC_ASSETS.icons}googleMaps.png`} alt="google maps icon" />
                          <a
                            href={
                              openedPlayground?.googleMapUrl ||
                              `https://maps.google.com/?q=${encodeURIComponent(openedPlayground?.location)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="locationURL"
                          >
                            {openedPlayground?.googleMapUrl
                              ? 'Open in Google Maps'
                              : openedPlayground?.location}
                          </a>
                        </div>
                        <div className="appleMaps">
                          <img src={`${PUBLIC_ASSETS.icons}apple.png`} alt="apple maps icon" />
                          <a
                            href={
                              openedPlayground?.appleMapUrl ||
                              `https://maps.apple.com/?q=${encodeURIComponent(openedPlayground?.location)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="locationURL"
                          >
                            {openedPlayground?.appleMapUrl
                              ? 'Open in Apple Maps'
                              : openedPlayground?.location}
                          </a>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={sendBookingInfo}>
                      <fieldset id="dateField">
                        <label htmlFor="date">Select Date</label>
                        <div className="date-picker-wrapper">
                          <i className="fas fa-calendar-alt date-icon"></i>
                          <input
                            type="date"
                            id="date"
                            name="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            max={new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]}
                            lang="en-GB"
                             value={selectedDate}
                             onChange={(e) => { setSelectedDate(e.target.value); setStartTimeIdx(null); setConflict({}); }}
                          />
                        </div>
                      </fieldset>

                      <fieldset id="durationField">
                        <label>Select Duration</label>
                        <div className="options">
                          <label
                            className={`option ${duration == 1 && 'active'}`}
                            onClick={() => setDuration(1)}
                          >
                            <input type="radio" name="duration" value={1} />
                            <span>1 Hour</span>
                          </label>

                          <label
                            className={`option ${duration == 1.5 && 'active'}`}
                            onClick={() => setDuration(1.5)}
                          >
                            <input type="radio" name="duration" value={1.5} />
                            <span>1.5 Hour</span>
                          </label>

                          <label
                            className={`option ${duration == 2 && 'active'}`}
                            onClick={() => setDuration(2)}
                          >
                            <input type="radio" name="duration" value={2} />
                            <span>2 Hour</span>
                          </label>
                        </div>
                      </fieldset>

                      <fieldset id="sizeField">
                        <label>Select Pitch Size</label>
                        <div className="sizes">
                          <label
                            className={`size ${size === 0 && 'active'}`}
                            onClick={() => setSize(0)}
                          >
                            <input type="radio" name="size" value={8} />
                            <i className="fas fa-futbol size-icon"></i>
                            <p className="size-text">
                              {openedPlayground?.size} x {openedPlayground?.size}
                            </p>
                          </label>
                        </div>
                      </fieldset>

                      <fieldset id="startTimeField">
                        <label htmlFor="startTime">Select Start Time</label>
                        <div className="items">
                          {openedPlayground?.openingTime && openedPlayground?.closingTime ? (
                            generateTimeSlots(
                              parseInt(openedPlayground.openingTime.split(':')[0]) || 9,
                              parseInt(openedPlayground.closingTime.split(':')[0]) || 22
                            ).map((slot, index) => (
                              <label
                                key={`time-${index}`}
                                className={`item ${startTimeIdx === index ? 'active' : ''} ${slot.disabled ? 'disabled' : ''}`}
                                onClick={() => {
                                  if (slot.disabled) return;
                                  setStartTimeIdx(index);
                                  setConflict({});
                                }}
                                onChange={() => setConflict({})}
                              >
                                <input type="radio" name="startTime" value={slot.time} disabled={slot.disabled} />
                                <p className="time">
                                  {parseInt(slot.time.split(':')[0]) > 12
                                    ? `0${parseInt(slot.time.split(':')[0]) - 12}:${slot.time.split(':')[1]}`
                                    : slot.time}
                                </p>
                                <span className="footer">
                                  <img
                                    src={`${PUBLIC_ASSETS.icons}${parseInt(slot.time.split(':')[0]) > 17 ? 'moon' : 'sun'}.png`}
                                    alt="#"
                                  />
                                  <small>{parseInt(slot.time.split(':')[0]) > 12 ? 'PM' : 'AM'}</small>
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className="no-time-slots">No time slots available</p>
                          )}

                          {/* <label
                        className={`item ${startTimeIdx === 1 && 'active'}`}
                        onClick={() => setStartTimeIdx(1)}
                      >
                        <input type="radio" name="startTime" value={'15:00'} />
                        <p className="time">03:00</p>
                        <span className="footer">
                          <img src={`${PUBLIC_ASSETS.icons}sun.png`} alt="#" />
                          <small>PM</small>
                        </span>
                      </label>
                      <label
                        className={`item ${startTimeIdx === 2 && 'active'}`}
                        onClick={() => setStartTimeIdx(2)}
                      >
                        <input type="radio" name="startTime" value={'16:00'} />
                        <p className="time">04:00</p>
                        <span className="footer">
                          <img src={`${PUBLIC_ASSETS.icons}sun.png`} alt="#" />
                          <small>PM</small>
                        </span>
                      </label>
                      <label
                        className={`item ${startTimeIdx === 3 && 'active'}`}
                        onClick={() => setStartTimeIdx(3)}
                      >
                        <input type="radio" name="startTime" value={'17:00'} />
                        <p className="time">05:00</p>
                        <span className="footer">
                          <img src={`${PUBLIC_ASSETS.icons}sun.png`} alt="#" />
                          <small>PM</small>
                        </span>
                      </label>
                      <label
                        className={`item ${startTimeIdx === 4 && 'active'}`}
                        onClick={() => setStartTimeIdx(4)}
                      >
                        <input type="radio" name="startTime" value={'18:00'} />
                        <p className="time">06:00</p>
                        <span className="footer">
                          <img src={`${PUBLIC_ASSETS.icons}moon.png`} alt="#" />
                          <small>PM</small>
                        </span>
                      </label>
                      <label
                        className={`item ${startTimeIdx === 5 && 'active'}`}
                        onClick={() => setStartTimeIdx(5)}
                      >
                        <input type="radio" name="startTime" value={'19:00'} />
                        <p className="time">07:00</p>
                        <span className="footer">
                          <img src={`${PUBLIC_ASSETS.icons}moon.png`} alt="#" />
                          <small>PM</small>
                        </span>
                      </label> */}
                        </div>
                      </fieldset>

                      <button type="submit" id="proceedBt">
                        Proceed
                      </button>
                    </form>
                  </div>
                  <div
                    className="warningMsg"
                    style={{ display: Object.keys(conflict || {}).length > 0 ? 'block' : 'none' }}
                  >
                    <div className="warning-header">
                      <i className="fas fa-exclamation-triangle"></i>
                      <h3>Booking Conflict</h3>
                      <button className="close-warning" onClick={() => setConflict({})}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="warning-content">
                      <p>There is a conflict with this date and time!</p>
                      <div className="conflict-times">
                        <div className="conflict-time">
                          <span>Start:</span>
                          <strong>
                            {conflict?.start
                              ? new Date(conflict?.start).toLocaleString(
                                  'en-GB',
                                  {
                                    timeZone: 'UTC',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )
                              : ''}
                          </strong>
                        </div>
                        <div className="conflict-time">
                          <span>End:</span>
                          <strong>
                            {conflict?.end
                              ? new Date(conflict?.end).toLocaleString(
                                  'en-GB',
                                  {
                                    timeZone: 'UTC',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )
                              : ''}
                          </strong>
                        </div>
                      </div>
                    </div>
                    <button className="dismiss-warning" onClick={() => setConflict({})}>
                      Choose Another Time
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bookings">
                    <h1>Bookings</h1>
                    <div className="bookings-grid">
                      {playgroundBookings?.length === 0 ? (
                        <div className="no-bookings">
                          <i className="fas fa-calendar-times"></i>
                          <p >No bookings found for this playground</p>
                        </div>
                      ) : (
                        playgroundBookings?.map((bk) => {
                          const status = bk?.status ? bk.status : (bk?.confirmed ? 'confirmed' : 'pending');
                          return (
                          <div className="booking-card" key={bk._id}>
                            <div className="booking-header">
                              <h4>{bk.user?.name || 'Unknown User'}</h4>
                              <span className={`status-badge ${status === 'confirmed' ? 'status-confirmed' : status === 'pending' ? 'status-pending' : `status-${status}`}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </div>

                            <div className="booking-details">
                              <div className="booking-info">
                                <p>
                                  <i className="fas fa-calendar"></i>{' '}
                                  {bk?.start
                                    ? new Date(bk.start.split('T')[0]).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })
                                    : 'N/A'}
                                </p>
                                <p>
                                  <i className="fas fa-clock"></i>{' '}
                                  {bk?.start && bk?.end
                                    ? `${new Date(bk.start).toLocaleTimeString('en-GB', {
                                        timeZone: 'UTC',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                      })} - ${new Date(bk.end).toLocaleTimeString('en-GB', {
                                        timeZone: 'UTC',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                      })}`
                                    : 'N/A'}
                                </p>
                                <p>
                                  <i className="fas fa-hourglass-half"></i>{' '}
                                  {getHourDifference(bk?.start, bk?.end)} Hours
                                </p>
                                <p>
                                  <i className="fas fa-money-bill"></i>{' '}
                                  {bk.cost || bk.totalPrice || 0} JOD
                                </p>
                              </div>

                              <div className="booking-actions">
                                {status === 'pending' && (
                                  <button
                                    className="action-btn confirm"
                                    onClick={() => confirmBooking(bk._id)}
                                  >
                                    <i className="fas fa-check"></i> Confirm
                                  </button>
                                )}
                                {status !== 'canceled' && (
                                  <button
                                    className="action-btn cancel"
                                    onClick={() => cancelBooking(bk._id)}
                                  >
                                    <i className="fas fa-times"></i> Cancel
                                  </button>
                                )}
                                {/** User starts the chat; owner can reply. Expose button only for user role; owners should use Messages page or user action. */}
                                {user?.role === 'user' && (
                                  <button
                                    className="action-btn"
                                    onClick={() => {
                                      try {
                                        const evt = new CustomEvent('open-chat', { detail: { ownerId: openedPlayground?.owner?._id, playgroundId: openedPlayground?._id, name: openedPlayground?.owner?.name } });
                                        window.dispatchEvent(evt);
                                      } catch {}
                                    }}
                                  >
                                    <i className="fas fa-comments"></i> Chat
                                  </button>
                                )}
                                {user?.role === 'owner' && (
                                  <button
                                    className="action-btn"
                                    onClick={() => {
                                      try {
                                        const evt = new CustomEvent('open-chat', { detail: { ownerId: openedPlayground?.owner?._id, playgroundId: openedPlayground?._id, userId: bk.user?._id, name: bk.user?.name } });
                                        window.dispatchEvent(evt);
                                      } catch {}
                                    }}
                                  >
                                    <i className="fas fa-comments"></i> Chat
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              className="bookingInfo"
              style={{ display: showBookingInfo ? 'flex' : 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="closeBt" onClick={() => setPGdetailsShow(false)}>
                <i className="fas fa-times"></i>
              </button>
              <h1>Booking Information</h1>
              <div className="info">
                <div className="paymentMethod">
                  <label>Payment method</label>
                  <span
                    className={`${paymentMethodIdx === 0 && 'active'}`}
                    onClick={() => setPaymentMethodIdx(paymentMethodIdx !== 0 ? 0 : -1)}
                  >
                    <input type="radio" name="paymentMethod" value={'cash'} />
                    <i className="fas fa-money-bill-wave payment-icon"></i>
                    <p>Cash</p>
                  </span>
                </div>

                { /* <div className="promoCode">
                  <label htmlFor="promoCodeInput">Promo code</label>
                  <span className="promoCodeField">
                    <input
                      type="text"
                      placeholder="Type or Past code..."
                      name="promoCode"
                      id="promoCodeInput"
                      autoCorrect="false"
                      spellCheck="false"
                    />
                    <button>Apply</button>
                  </span>
                </div> */ }

                <div className="paymentDetails">
                  <label>Payment details</label>
                  <div className="details">
                    <span className="row">
                      <p className="title">Pitch name:</p>
                      <p className="value">{bookingInfo?.playground?.name}</p>
                    </span>

                    <span className="row">
                      <p className="title">Pitch size:</p>
                      <p className="value">
                        {bookingInfo?.playground?.size} x {bookingInfo?.playground?.size}
                      </p>
                    </span>
                    <span className="row">
                      <p className="title">Date:</p>
                      <p className="value">
                        {new Date(bookingInfo?.start?.split('T')[0]).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </span>
                    <span className="row">
                      <p className="title">Time:</p>
                      <p className="value">
                        {new Date(bookingInfo?.start).toLocaleTimeString('en-GB', {
                          timeZone: 'UTC',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}{' '}
                        -{' '}
                        {new Date(bookingInfo?.end).toLocaleTimeString('en-GB', {
                          timeZone: 'UTC',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </span>
                    <span className="row">
                      <p className="title">Duration</p>
                      <p className="value">
                        {getHourDifference(bookingInfo?.start, bookingInfo?.end)} hours
                      </p>
                    </span>
                    <span className="row">
                      <p className="title">Tax</p>
                      <p className="value">{bookingInfo?.tax || '0.00'} JOD</p>
                    </span>
                    <span className="row">
                      <p className="title">Total Price</p>
                      <p className="value">
                        {getHourDifference(bookingInfo?.start, bookingInfo?.end) *
                          bookingInfo?.playground?.costPerHour}{' '}
                        JOD
                      </p>
                    </span>
                    <span className="row">
                      <p className="title">Status</p>
                      <p className="value" style={{ 
                        color: bookingInfo?.status === 'pending' ? '#f57c00' : 
                               bookingInfo?.status === 'confirmed' ? '#43a047' : 
                               bookingInfo?.status === 'completed' ? '#1976d2' : '#e53935',
                        fontWeight: '600'
                      }}>
                        {bookingInfo?.status === 'pending' ? 'Pending Owner Confirmation' :
                         bookingInfo?.status === 'confirmed' ? 'Confirmed' :
                         bookingInfo?.status === 'completed' ? 'Completed' : 'Canceled'}
                      </p>
                    </span>
                  </div>
                </div>
              </div>

              <button id="bookBt" onClick={() => {
                setShowBookingInfo(false);
                setPGdetailsShow(false);
                // Show custom alert via global event for centralized Alert host
                window.dispatchEvent(new CustomEvent('app-alert', {
                  detail: {
                    type: 'success',
                    message: 'Booking created successfully! Your booking is pending owner confirmation.'
                  }
                }));
              }}>
                {bookingInfo?.status === 'pending' ? 'Close' : 'Done'}
              </button>
              <div className="qrcode" style={{ display: showQrCode && bookingInfo?.status === 'confirmed' ? 'flex' : 'none' }}>
                <h4>Operation successful</h4>
                <div className="user-info">
                  <span className="user-label">Booked by:</span>
                  <h5 className="name">{user?.name || 'User'}</h5>
                </div>
                <QRCodeSVG value={`booking:${bookingInfo?._id}`} size={200} />
                <p className="pitchName">{bookingInfo?.playground?.name}</p>
                <p className="appointment">
                  {new Date(bookingInfo?.start).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  -{' '}
                  {new Date(bookingInfo?.start).toLocaleTimeString('en-GB', {
                    timeZone: 'UTC',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
                <button
                  onClick={() => {
                    setPGdetailsShow(false);
                    setShowQrCode(false);
                    // Here you would typically navigate to activities page
                    // For now, just close the dialog
                  }}
                >
                  Go to Activities
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {showNewPlayground && (
        <NewPlayground
          onClose={() => setShowNewPlayground(false)}
          onSuccess={() => {
            setShowNewPlayground(false);
            // Optionally refresh the playgrounds list
            window.location.reload();
          }}
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="filter-modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-header">
              <h3>Filter & Sort Playgrounds</h3>
              <button className="close-btn" onClick={() => setShowFilterModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="filter-content">
              {/* Price Range */}
              <div className="filter-section">
                <h4>Price Range (JOD/hr)</h4>
                <div className="price-range">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min}
                    onChange={(e) =>
                      handleFilterChange('priceRange', {
                        ...filters.priceRange,
                        min: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max}
                    onChange={(e) =>
                      handleFilterChange('priceRange', {
                        ...filters.priceRange,
                        max: parseFloat(e.target.value) || 100,
                      })
                    }
                  />
                </div>
              </div>

              {/* Size Filter */}
              <div className="filter-section">
                <h4>Playground Size</h4>
                <select
                  value={filters.size}
                  onChange={(e) => handleFilterChange('size', e.target.value)}
                >
                  <option value="all">All Sizes</option>
                  {getUniqueSizes().map((size) => (
                    <option key={size} value={size}>
                      {size}x{size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div className="filter-section">
                <h4>Location</h4>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                >
                  <option value="">All Locations</option>
                  {getUniqueLocations().map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div className="filter-section">
                <h4>Sort By</h4>
                <div className="sort-options">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  >
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="size">Size</option>
                    <option value="location">Location</option>
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Summary */}
              <div className="active-filters">
                <h4>Active Filters</h4>
                <div className="filter-tags">
                  {filters.priceRange.min > 0 || filters.priceRange.max < 100 ? (
                    <span className="filter-tag">
                      Price: {filters.priceRange.min}-{filters.priceRange.max} JOD
                      <button
                        onClick={() => handleFilterChange('priceRange', { min: 0, max: 100 })}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ) : null}
                  {filters.size !== 'all' ? (
                    <span className="filter-tag">
                      Size: {filters.size}x{filters.size}
                      <button onClick={() => handleFilterChange('size', 'all')}>
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ) : null}
                  {filters.location ? (
                    <span className="filter-tag">
                      Location: {filters.location}
                      <button onClick={() => handleFilterChange('location', '')}>
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="filter-actions">
              <button className="reset-btn" onClick={resetFilters}>
                <i className="fas fa-undo"></i>
                Reset All Filters
              </button>
              <button className="apply-btn" onClick={() => setShowFilterModal(false)}>
                <i className="fas fa-check"></i>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {showImageModal && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImageModal}>
              <i className="fas fa-times"></i>
            </button>

            <div className="image-modal-main">
              <button className="image-modal-nav prev" onClick={prevImage}>
                <i className="fas fa-chevron-left"></i>
              </button>

              <div className="image-modal-image-container">
                {imageLoading && (
                  <div className="image-loading-spinner">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading image...</p>
                  </div>
                )}
                <img
                  src={`${IMAGES_URL}${playgroundImages[currentImageIndex]}`}
                  alt={`${selectedImage?.name} - Image ${currentImageIndex + 1}`}
                  className={`image-modal-image ${imageLoading ? 'loading' : ''}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </div>

              <button className="image-modal-nav next" onClick={nextImage}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>

            <div className="image-modal-info">
              <h3>{selectedImage?.name}</h3>
              <p>
                Image {currentImageIndex + 1} of {playgroundImages.length}
              </p>
            </div>

            {playgroundImages.length > 1 && (
              <div className="image-modal-thumbnails">
                {playgroundImages.map((image, index) => (
                  <img
                    key={index}
                    src={`${IMAGES_URL}${image}`}
                    alt={`Thumbnail ${index + 1}`}
                    className={`image-modal-thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Playgrounds;
