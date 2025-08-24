import './styles/favourites.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './../components/Sidebar';
import FavouritePlaygrounds from './../components/FavouritePlaygrounds';

const Favourites = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');
        
        if (!storedUser || !token) {
          navigate('/login');
          return;
        }
        
        // Optionally verify token validity with the server
        // This is a good practice to ensure the token is still valid
        
        setUser(storedUser);
      } catch (error) {
        console.error('Authentication error:', error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main>
      <Sidebar />
      <section className="hero">
        <div className="favouritesContainer">
          {user && <FavouritePlaygrounds user={user} />}
        </div>
      </section>
    </main>
  );
};

export default Favourites;