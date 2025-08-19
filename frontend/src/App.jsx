// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ScrappyLandingPage from './components/Landing';
import Scrappy from './components/Scrape';

const App = () => {
  return (
    <Router>
       <Routes>
        <Route path="/" element={<ScrappyLandingPage />} />
        <Route path="/scrape" element={<Scrappy />} />
  
      </Routes>
    </Router>
  );
};

export default App;
