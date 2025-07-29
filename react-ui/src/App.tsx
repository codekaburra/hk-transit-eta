import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { BusStopDetails } from './components/bus/BusStopDetails';
import { BusRouteDetails } from './components/bus/BusRouteDetails';
import { MinibusRouteDetails } from './components/minibus/MinibusRouteDetails';
import { MinibusStopDetails } from './components/minibus/MinibusStopDetails';
import { MTRStationDetails } from './components/mtr/MTRStationDetails';
import './App.css';
import { HomePage } from './components/HomePage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bus/stop/:stopId" element={<BusStopDetails />} />
          <Route path="/bus/route/:routeId" element={<BusRouteDetails />} />
          <Route path="/minibus/route/:routeId/:routeSeq" element={<MinibusRouteDetails />} />
          <Route path="/minibus/stop/:stopId" element={<MinibusStopDetails />} />
          <Route path="/mtr/station/:stationCode" element={<MTRStationDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
