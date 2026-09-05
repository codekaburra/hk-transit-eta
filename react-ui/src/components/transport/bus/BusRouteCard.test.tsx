import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { BusRouteCard } from './BusRouteCard';
import { BusRoute, BusStop } from '../../../types';

jest.mock('../../../services/api');
const { getBusETA } = jest.requireMock('../../../services/api');

const route = (overrides: Partial<BusRoute> = {}): BusRoute => ({
  company: 'KMB',
  route: '1',
  direction: 'O',
  service_type: '1',
  orig_en: 'Chuk Yuen Estate',
  orig_tc: '竹園邨',
  dest_en: 'Star Ferry',
  dest_tc: '尖沙咀碼頭',
  ...overrides,
});

const busStop: BusStop = {
  company: 'KMB',
  stop: 'A1B2C3',
  name_en: 'Star Ferry',
  name_tc: '尖沙咀碼頭',
  lat: '22.3',
  long: '114.2',
};

const inMinutes = (mins: number) => new Date(Date.now() + mins * 60000).toISOString();

function renderCard(stop?: BusStop) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <BusRouteCard route={route()} busStop={stop} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getBusETA.mockResolvedValue([]);
});

describe('BusRouteCard', () => {
  it('lays the departures out in columns, soonest first', async () => {
    // Waits that are not substrings of one another, so a reading landing in the
    // wrong column cannot satisfy its neighbour's assertion.
    getBusETA.mockResolvedValue([inMinutes(7), inMinutes(29), inMinutes(51)]);
    renderCard(busStop);

    const readings = await screen.findAllByText(/分鐘 mins/);
    const columns = readings.map(reading => reading.parentElement);

    expect(columns.map(column => column?.textContent)).toEqual([
      expect.stringContaining('7 分鐘'),
      expect.stringContaining('29 分鐘'),
      expect.stringContaining('51 分鐘'),
    ]);
  });

  // The same card lists search results, where there is no stop to be due at.
  // Three empty columns there would read as a route with no service.
  it('shows no columns when the card is not rendered against a stop', async () => {
    renderCard();

    await waitFor(() => expect(screen.getByText(/Chuk Yuen Estate/)).toBeInTheDocument());
    expect(getBusETA).not.toHaveBeenCalled();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });
});
