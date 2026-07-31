import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { BusRouteStopCard } from './BusRouteStopCard';
import { RouteStop } from '../../../types';

jest.mock('../../../services/api');
const { getBusETA } = jest.requireMock('../../../services/api');

const routeStop = (overrides: Partial<RouteStop> = {}): RouteStop => ({
  company: 'KMB',
  route: '1',
  direction: 'O',
  service_type: '1',
  seq: '3',
  stop: 'A1B2C3',
  name_en: 'Star Ferry',
  name_tc: '尖沙咀碼頭',
  lat: '22.3',
  long: '114.2',
  ...overrides,
});

function renderCard(stop: RouteStop) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <BusRouteStopCard routeStop={stop} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getBusETA.mockResolvedValue([]);
});

describe('BusRouteStopCard', () => {
  it('shows both names and the stop sequence', async () => {
    renderCard(routeStop());

    await waitFor(() => expect(screen.getByText('尖沙咀碼頭')).toBeInTheDocument());
    expect(screen.getByText('Star Ferry')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  // Some stops have no published details — Citybus 003759 returns an empty
  // payload — but they are still part of the sequence. Showing a blank row
  // would look like a rendering fault.
  it('falls back to the stop id when the operator publishes no name', async () => {
    renderCard(routeStop({ name_en: '', name_tc: '' }));

    await waitFor(() => expect(screen.getByText(/A1B2C3/)).toBeInTheDocument());
    expect(screen.getByText(/未有站名資料/)).toBeInTheDocument();
  });

  it('still shows the sequence number for a stop without a name', async () => {
    renderCard(routeStop({ name_en: '', name_tc: '', seq: '20' }));

    await waitFor(() => expect(screen.getByText('20')).toBeInTheDocument());
  });

  it('requests the ETA for its own stop and route', async () => {
    renderCard(routeStop());

    await waitFor(() =>
      expect(getBusETA).toHaveBeenCalledWith('KMB', 'A1B2C3', '1', '1', 'O')
    );
  });
});
