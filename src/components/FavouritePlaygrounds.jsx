import './styles/playgrounds.css';
import './styles/favouritePlaygrounds.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import config, { IMAGES } from '../config';

const FavouritePlaygrounds = ({ user }) => {
  const IMAGES_URL = IMAGES.playgrounds;
  const API_BASE_URL = config.API_URL.replace(/\/$/, '');
  const [favouritePlaygrounds, setFavouritePlaygrounds] = useState([]);
  const [favouritesMap, setFavouritesMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null); // Track which playground has an action in progress
  const [notification, setNotification] = useState(null);

  // Fetch favorites on component mount or when user changes
  useEffect(() => {
    fetchFavourites();
  }, [user]);

  // Show notification message
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Function to fetch favorites
  const fetchFavourites = async () => {
    if (!user) {
      setError('Please log in to view your favorites');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication error. Please log in again.');
        setIsLoading(false);
        return;
      }

      console.log('Fetching favorites for user:', user.name);

      // Get the list of favorites
      const favResponse = await fetch(`${API_BASE_URL}/favourites/`, {
        headers: {
          Authorization: token,
          Accept: 'application/json',
        },
      });

      if (!favResponse.ok) {
        throw new Error(`Failed to fetch favorites: ${favResponse.status}`);
      }

      const favData = await favResponse.json();
      console.log('Favorites data:', favData);

      if (!favData.data || favData.data.length === 0) {
        setFavouritePlaygrounds([]);
        setFavouritesMap({});
        setIsLoading(false);
        return;
      }

      // Create a map of playground IDs for easy lookup
      const newFavouritesMap = {};

      // Check if playground data is already included in the favorites response
      const playgrounds = [];

      for (const fav of favData.data) {
        // Store the favorite ID with the playground ID for easier deletion
        const favoriteId = fav._id;

        // Check if the playground field contains the complete playground object
        if (typeof fav.playground === 'object' && fav.playground !== null) {
          console.log('Playground object found in favorites response:', fav.playground);
          const playground = { ...fav.playground, favoriteId };
          playgrounds.push(playground);

          // Add to favorites map
          if (fav.playground._id) {
            newFavouritesMap[fav.playground._id] = favoriteId;
          }
        } else {
          // If it's just an ID, we need to fetch the playground details
          const playgroundId = fav.playground;
          console.log(`Fetching playground details for ID: ${playgroundId}`);

          try {
            const pgResponse = await fetch(`${API_BASE_URL}/playgrounds/${playgroundId}`, {
              headers: { Authorization: token },
            });

            if (!pgResponse.ok) {
              console.error(`Error fetching playground ${playgroundId}: ${pgResponse.status}`);
              continue; // Skip this playground and continue with others
            }

            const pgData = await pgResponse.json();
            if (pgData.data) {
              const playground = { ...pgData.data, favoriteId };
              playgrounds.push(playground);
              newFavouritesMap[playgroundId] = favoriteId;
            }
          } catch (err) {
            console.error(`Error fetching playground ${playgroundId}:`, err);
            // Continue with other playgrounds even if one fails
          }
        }
      }

      console.log('Valid playgrounds:', playgrounds);
      console.log('Favorites map:', newFavouritesMap);

      setFavouritePlaygrounds(playgrounds);
      setFavouritesMap(newFavouritesMap);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add a playground to favorites
  const addToFavourites = async (playground) => {
    const token = localStorage.getItem('token');
    const playgroundId = playground._id;

    // Set action in progress for this playground
    setActionInProgress(playgroundId);

    console.log('Adding to favorites, playground ID:', playgroundId);

    if (!token) {
      console.error('No token found in localStorage');
      showNotification('Please log in to add favorites', 'error');
      setActionInProgress(null);
      return false;
    }

    try {
      console.log(`Making API request to add to favorites for ID: ${playgroundId}...`);
      const response = await fetch(`${API_BASE_URL}/favourites/`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playground: playgroundId }),
      });

      console.log('Add to favorites API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error adding to favorites - API returned error:', errorData);
        showNotification('Failed to add to favorites', 'error');
        setActionInProgress(null);
        return false;
      }

      // Parse response
      const data = await response.json();
      console.log('Added to favorites successfully:', data);

      // Get the favorite ID from the response
      const favoriteId = data.data?._id;

      if (!favoriteId) {
        console.error('No favorite ID in response:', data);
        showNotification('Added to favorites but could not get ID', 'warning');
        setActionInProgress(null);
        fetchFavourites(); // Refresh the whole list
        return true;
      }

      // Update favorites map to reflect the change immediately
      setFavouritesMap((prev) => ({
        ...prev,
        [playgroundId]: favoriteId,
      }));

      // Add this playground to the favorites list if not already there
      setFavouritePlaygrounds((prev) => {
        if (prev.some((pg) => pg._id === playgroundId)) {
          return prev;
        }

        // Add the playground with the favorite ID
        const playgroundWithFavoriteId = {
          ...playground,
          favoriteId,
        };

        return [...prev, playgroundWithFavoriteId];
      });

      showNotification('Added to favorites successfully');
      setActionInProgress(null);
      return true;
    } catch (error) {
      console.error('Error adding to favorites - exception occurred:', error);
      showNotification('Error adding to favorites', 'error');
      setActionInProgress(null);
      return false;
    }
  };

  // Function to remove a playground from favorites
  const removeFromFavourites = async (playground) => {
    const playgroundId = playground._id;

    // Set action in progress for this playground
    setActionInProgress(playgroundId);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found in localStorage');
        showNotification('Please log in to remove favorites', 'error');
        setActionInProgress(null);
        return false;
      }

      console.log(`Making API request to remove playground ID: ${playgroundId} from favorites...`);
      const response = await fetch(`${API_BASE_URL}/favourites/`, {
        method: 'DELETE',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playground: playgroundId }),
      });

      console.log('Remove from favorites API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to remove from favourites:', errorText);
        showNotification('Failed to remove from favorites', 'error');
        setActionInProgress(null);
        return false;
      }

      console.log('Successfully removed from favourites');

      // Update favorites map to reflect the change immediately
      setFavouritesMap((prev) => {
        const newState = { ...prev };
        delete newState[playgroundId];
        return newState;
      });

      // Update favouritePlaygrounds list
      setFavouritePlaygrounds((prev) => prev.filter((pg) => pg._id !== playgroundId));

      showNotification('Removed from favorites');
      setActionInProgress(null);
      return true;
    } catch (error) {
      console.error('Error removing from favourites:', error);
      showNotification('Error removing from favorites', 'error');
      setActionInProgress(null);
      return false;
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="favorites-container">
        <div className="favorites-loading">
          <p>Loading your favorite playgrounds...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="favorites-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => fetchFavourites()}>Try Again</button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (favouritePlaygrounds.length === 0) {
    return (
      <div className="favorites-container">
        <div className="empty-state">
          <h3>You don't have any favorite playgrounds yet</h3>
          <p>Browse playgrounds and click the heart icon to add them to your favorites</p>
          <Link to="/" className="browse-button">
            Browse Playgrounds
          </Link>
        </div>
        {notification && (
          <div className={`notification ${notification.type}`}>{notification.message}</div>
        )}
      </div>
    );
  }

  // Render favorites list
  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h2>Your Favorite Playgrounds</h2>
        <p className="favorites-count">
          <span className="count-number">{favouritePlaygrounds.length}</span>
          {favouritePlaygrounds.length === 1 ? 'playground' : 'playgrounds'} saved
        </p>
      </div>
      <div className="debug-controls">
        <button className="debug-button" onClick={() => fetchFavourites()}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
              fill="currentColor"
            />
          </svg>
          Refresh Favorites
        </button>
      </div>
      <div className="favorites-grid">
        {favouritePlaygrounds.map((playground) => (
          <div key={playground._id} className="favorite-card">
            <div className="favorite-image">
              <img
                src={`${IMAGES_URL}${playground.imageCover || 'default.jpg'}`}
                alt={playground.name}
                onError={(e) => {
                  e.target.src = `${IMAGES_URL}default.jpg`;
                }}
              />
              <button
                className={`remove-favorite ${actionInProgress === playground._id ? 'loading' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromFavourites(playground);
                }}
                disabled={actionInProgress === playground._id}
              >
                {actionInProgress === playground._id ? (
                  <div className="button-spinner"></div>
                ) : (
                  <i className="fas fa-heart"></i>
                )}
              </button>
            </div>
            <div className="favorite-details">
              <h3>{playground.name}</h3>
              <p className="location">{playground.location || 'No location specified'}</p>

              {playground.openingTime && playground.closingTime && (
                <p className="hours">
                  <span className="hours-icon">⏱</span>
                  {playground.openingTime} - {playground.closingTime}
                </p>
              )}

              {playground.size && (
                <p className="size">
                  <span className="size-icon">⚽</span>
                  {playground.size} x {playground.size}
                </p>
              )}

              <div className="favorite-footer">
                <span className="price">{playground.costPerHour || '0'} JOD/hr</span>
                <Link to={`/?playground=${playground._id}`} className="book-button">
                  Book Now
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>{notification.message}</div>
      )}
    </div>
  );
};

export default FavouritePlaygrounds;
