import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { BusStopDetails } from './components/transport/bus/BusStopDetails';
import { BusRouteDetails } from './components/transport/bus/BusRouteDetails';
import { MinibusRouteDetails } from './components/transport/minibus/MinibusRouteDetails';
import { MinibusStopDetails } from './components/transport/minibus/MinibusStopDetails';
import { MTRStationDetails } from './components/transport/mtr/MTRStationDetails';
import './App.css';
import { LandingPage } from './components/LandingPage';
import { HomePage } from './components/transport/HomePage';
import { WeatherHomePage } from './components/weather/HomePage';
import { NineDaysForecastCard } from './components/weather/NineDaysForecastCard';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/transport" element={<HomePage />} />
          <Route path="/weather" element={<WeatherHomePage />} />
          <Route path="/weather/nine-day-forecast" element={<NineDaysForecastCard />} />
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
