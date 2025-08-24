import './styles/home.css';
import { Link } from 'react-router-dom';
import Playgrounds from '../components/Playgrounds';
import AdBanner from '../components/AdBanner';
import Sidebar from '../components/Sidebar';
import { useRef, useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
const Home = () => {
  const slidesRef = useRef();
  const [index, setIndex] = useState(0);
  const { darkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      const total = slidesRef.current?.children.length || 0;
      setIndex((prevIndex) => (prevIndex + 1) % total);
      console.log(index);
    }, 3000); // change every 3 seconds

    return () => clearInterval(interval); // cleanup
  }, []);

  return (
    <main>
      <Sidebar />

      <section className="hero">
        <div className="container">
          {/* <img src="./images/img1.png" alt="#" /> */}
          <img src={darkMode ? ".dist/icons/volleyball-white.png" : "./dist/icons/volleyball-black.png"} alt="#" />
          <img src={darkMode ? "./dist/icons/volleyball-2-white.png" : "./dist/icons/volleyball-2-black.png"} alt="#" />
          <span className="middle">
            <img src={darkMode ? "./dist/icons/soccer-white.png" : "./dist/icons/soccer-black.png"} alt="#" />
            <h2>Football</h2>
          </span>
          <img src={darkMode ? "./dist/icons/volleyball-2-white.png" : "./dist/icons/volleyball-2-black.png"} alt="#" />
          <img src={darkMode ? "./dist/icons/volleyball-3-white.png" : "./dist/icons/volleyball-3-black.png"} alt="#" />
        </div>

        <AdBanner placement="home" />

        <Playgrounds />
      </section>
    </main>
  );
};

export default Home;
