import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { HomePage } from './HomePage';
import { MainNavigation } from './MainNavigation';

jest.mock('../../services/api');
const { api } = jest.requireMock('../../services/api');

// Shows where the router ended up, so the test can tell the landing page from
// the search without depending on either page's copy.
const Path: React.FC = () => <div data-testid="path">{useLocation().pathname}</div>;

const renderJourney = () =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/bus/stop/ABC']}>
        <Routes>
          <Route path="/" element={<div>landing</div>} />
          <Route path="/transport" element={<HomePage />} />
          <Route path="/bus/stop/:stopId" element={<MainNavigation />} />
        </Routes>
        <Path />
      </MemoryRouter>
    </ThemeProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  api.getBusRoutes.mockResolvedValue([]);
  api.getBusStops.mockResolvedValue([]);
  api.getMinibusRoutes.mockResolvedValue([]);
  api.getMinibusStops.mockResolvedValue([]);
  api.getRouteCount.mockResolvedValue({ type: 'bus', count: 0 });
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

// Both halves of the trip: the bar on a detail page has to send the reader to
// the search, and the search has to open on the type they picked rather than
// bouncing them on to the landing page while it clears the router state.
it('takes the reader from a detail page to the search they picked', async () => {
  renderJourney();

  await userEvent.click(screen.getByRole('button', { name: '🚏 巴士站 Bus Stops' }));

  expect(await screen.findByText('Search Bus Stops')).toBeInTheDocument();
  expect(screen.getByTestId('path')).toHaveTextContent('/transport');
  expect(screen.queryByText('landing')).not.toBeInTheDocument();
});

// The first load used to run for the default type before the picked one took
// effect: every bus route, fetched for a reader who asked for minibus stops, and
// able to clear the spinner while the stops were still loading.
it('loads only the type that was picked', async () => {
  renderJourney();

  await userEvent.click(screen.getByRole('button', { name: '🚏 小巴站 Minibus Stops' }));

  await waitFor(() => expect(api.getMinibusStops).toHaveBeenCalled());
  expect(api.getBusRoutes).not.toHaveBeenCalled();
});
