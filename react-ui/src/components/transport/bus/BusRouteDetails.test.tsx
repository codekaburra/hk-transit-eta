import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { BusRouteDetails } from './BusRouteDetails';
import { api } from '../../../services/api';
import { BusRoute, RouteStop } from '../../../types';

jest.mock('../../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// The stop cards fetch live ETAs on mount. Auto-mocking returns undefined,
// whereas the real getBusETA always resolves to an array, so give it one.
const { getBusETA } = jest.requireMock('../../../services/api');

const variant = (direction: string, serviceType: string, destTc: string): BusRoute => ({
  company: 'KMB',
  route: '1',
  direction,
  service_type: serviceType,
  orig_en: 'Origin EN',
  orig_tc: '起點',
  dest_en: `${destTc} EN`,
  dest_tc: destTc,
});

const routeStop = (
  direction: string,
  serviceType: string,
  seq: string,
  nameTc: string
): RouteStop => ({
  company: 'KMB',
  route: '1',
  direction,
  service_type: serviceType,
  seq,
  stop: `stop-${direction}-${seq}`,
  name_en: `${nameTc} EN`,
  name_tc: nameTc,
  lat: '22.3',
  long: '114.2',
});

function renderRoute(routeId = '1', query = '?company=KMB') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[`/bus/route/${routeId}${query}`]}>
        <Routes>
          <Route path="/bus/route/:routeId" element={<BusRouteDetails />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getBusETA.mockResolvedValue([]);
});

describe('BusRouteDetails', () => {
  // The page rendered every stop the API returned as one seq-sorted list, so
  // the two directions were interleaved and only one was ever reachable.
  it('separates the directions and shows only the selected one', async () => {
    mockedApi.getBusRouteVariants.mockResolvedValue([
      variant('O', '1', '尖沙咀碼頭'),
      variant('I', '1', '竹園邨'),
    ]);
    mockedApi.getBusRouteStops.mockResolvedValue([
      routeStop('O', '1', '1', '竹園邨'),
      routeStop('O', '1', '2', '黃大仙'),
      routeStop('I', '1', '1', '尖沙咀碼頭'),
    ]);

    renderRoute();

    // Outbound is shown first, with only its own stops.
    await waitFor(() => expect(screen.getByText(/Route Stops \(2\)/)).toBeInTheDocument());
    expect(screen.getByText('黃大仙')).toBeInTheDocument();
    expect(screen.queryByText('尖沙咀碼頭')).not.toBeInTheDocument();

    // The other direction is reachable.
    await userEvent.click(screen.getByRole('button', { name: /往 竹園邨/ }));

    await waitFor(() => expect(screen.getByText(/Route Stops \(1\)/)).toBeInTheDocument());
    expect(screen.getByText('尖沙咀碼頭')).toBeInTheDocument();
    expect(screen.queryByText('黃大仙')).not.toBeInTheDocument();
  });

  it('offers a button per direction', async () => {
    mockedApi.getBusRouteVariants.mockResolvedValue([
      variant('O', '1', '尖沙咀碼頭'),
      variant('I', '1', '竹園邨'),
    ]);
    mockedApi.getBusRouteStops.mockResolvedValue([
      routeStop('O', '1', '1', 'A'),
      routeStop('I', '1', '1', 'B'),
    ]);

    renderRoute();

    await waitFor(() => expect(screen.getByRole('button', { name: /往 尖沙咀碼頭/ })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /往 竹園邨/ })).toBeInTheDocument();
  });

  // A route with one direction needs no switcher.
  it('hides the switcher when there is only one direction', async () => {
    mockedApi.getBusRouteVariants.mockResolvedValue([variant('O', '1', '終點')]);
    mockedApi.getBusRouteStops.mockResolvedValue([routeStop('O', '1', '1', 'A')]);

    renderRoute();

    await waitFor(() => expect(screen.getByText(/Route Stops \(1\)/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /往 / })).not.toBeInTheDocument();
  });

  // Special departures are separate sequences and must not be merged into the
  // main one — KMB 3D outbound runs three service types.
  it('keeps service types of one direction apart', async () => {
    mockedApi.getBusRouteVariants.mockResolvedValue([
      variant('O', '1', '觀塘'),
      variant('O', '2', '觀塘'),
    ]);
    mockedApi.getBusRouteStops.mockResolvedValue([
      routeStop('O', '1', '1', '慈雲山中'),
      routeStop('O', '1', '2', '樂富'),
      routeStop('O', '2', '1', '慈雲山南'),
    ]);

    renderRoute();

    await waitFor(() => expect(screen.getByText(/Route Stops \(2\)/)).toBeInTheDocument());
    // The special service is labelled so the two are distinguishable.
    expect(screen.getByRole('button', { name: /特別班 2/ })).toBeInTheDocument();
  });

  it('passes the company from the URL to the API', async () => {
    mockedApi.getBusRouteVariants.mockResolvedValue([variant('O', '', '終點')]);
    mockedApi.getBusRouteStops.mockResolvedValue([routeStop('O', '', '1', 'A')]);

    renderRoute('1', '?company=CTB');

    await waitFor(() => expect(mockedApi.getBusRouteVariants).toHaveBeenCalledWith('1', 'CTB'));
    expect(mockedApi.getBusRouteStops).toHaveBeenCalledWith('1', { company: 'CTB' });
  });

  // An empty result means the route does not exist...
  it('reports a route that does not exist', async () => {
    mockedApi.getBusRouteVariants.mockResolvedValue([]);
    mockedApi.getBusRouteStops.mockResolvedValue([]);

    renderRoute('NOPE');

    await waitFor(() => expect(screen.getByText(/Route not found/)).toBeInTheDocument());
  });

  // ...whereas a failure is an outage, and must not be reported as a missing
  // route. The API layer used to swallow both into an empty list.
  it('distinguishes a backend outage from a missing route', async () => {
    mockedApi.getBusRouteVariants.mockRejectedValue(new Error('ECONNREFUSED'));

    renderRoute();

    await waitFor(() => expect(screen.getByText(/Could not reach the server/)).toBeInTheDocument());
    expect(screen.queryByText(/Route not found/)).not.toBeInTheDocument();
  });

  it('shows the origin and destination of the selected direction', async () => {
    mockedApi.getBusRouteVariants.mockResolvedValue([
      variant('O', '1', '尖沙咀碼頭'),
      variant('I', '1', '竹園邨'),
    ]);
    mockedApi.getBusRouteStops.mockResolvedValue([
      routeStop('O', '1', '1', 'A'),
      routeStop('I', '1', '1', 'B'),
    ]);

    renderRoute();

    await waitFor(() => expect(screen.getByText(/尖沙咀碼頭 EN/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /往 竹園邨/ }));
    await waitFor(() => expect(screen.getByText(/竹園邨 EN/)).toBeInTheDocument());
  });
});
