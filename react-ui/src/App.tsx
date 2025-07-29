import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { StopDetails } from './components/bus/StopDetails';
import { RouteDetails } from './components/bus/RouteDetails';
import { MinibusRouteDetails } from './components/minibus/MinibusRouteDetails';
import { MinibusStopDetails } from './components/minibus/MinibusStopDetails';
import './App.css';
import { HomePage } from './components/HomePage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bus/stop/:stopId" element={<StopDetails />} />
          <Route path="/bus/route/:routeId" element={<RouteDetails />} />
          <Route path="/minibus/route/:routeId/:routeSeq" element={<MinibusRouteDetails />} />
          <Route path="/minibus/stop/:stopId" element={<MinibusStopDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
