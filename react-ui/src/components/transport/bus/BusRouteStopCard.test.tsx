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

  // Stacked in one column the three readings ran together, and it took a moment
  // to tell which belonged to which bus. The columns carry no heading, so the
  // order is the only thing saying which departure is which.
  it('gives each departure its own column, soonest first', async () => {
    const inMinutes = (mins: number) => new Date(Date.now() + mins * 60000).toISOString();
    getBusETA.mockResolvedValue([inMinutes(15), inMinutes(35), inMinutes(55)]);
    renderCard(routeStop());

    await screen.findByText(/15 分鐘/);
    const columns = screen.getAllByText(/分鐘 mins/).map(reading => reading.parentElement);

    expect(columns).toHaveLength(3);
    expect(columns.map(column => column?.textContent)).toEqual([
      expect.stringContaining('15 分鐘'),
      expect.stringContaining('35 分鐘'),
      expect.stringContaining('55 分鐘'),
    ]);
  });

  // A stop near the end of service returns fewer than three. Dropping the empty
  // columns would leave the readings unaligned down a list of stops.
  it('keeps the later columns in place when the operator returns fewer', async () => {
    getBusETA.mockResolvedValue([new Date(Date.now() + 5 * 60000).toISOString()]);
    renderCard(routeStop());

    expect(await screen.findByText(/5 分鐘/)).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
