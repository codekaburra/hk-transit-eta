import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { NearbyStopsPage } from './NearbyStopsPage';
import { NearbyStop, NearbyStops } from '../../services/api';

jest.mock('../../services/api');
const { getStopsNearby } = jest.requireMock('../../services/api');

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

const stop = (over: Partial<NearbyStop> = {}): NearbyStop => ({
  kind: 'bus',
  company: 'KMB',
  stop: 'STOP1',
  name_en: 'Landmark',
  name_tc: '置地廣場',
  lat: 22.2821,
  long: 114.1585,
  distance_m: 45,
  routes: ['101', '104'],
  ...over,
});

const response = (stops: NearbyStop[], radiusM = 250): NearbyStops => ({
  centre: { lat: 22.2819, long: 114.1582 },
  radius_m: radiusM,
  stops,
});

const renderPage = () =>
  render(
    <ThemeProvider>
      <MemoryRouter>
        <NearbyStopsPage />
      </MemoryRouter>
    </ThemeProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  getStopsNearby.mockResolvedValue(response([stop()]));
});

it('searches the entered coordinate and lists what it finds', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  await waitFor(() => expect(getStopsNearby).toHaveBeenCalled());
  expect(getStopsNearby).toHaveBeenCalledWith(22.2819, 114.1582, 250);

  expect(await screen.findByText('置地廣場')).toBeInTheDocument();
  expect(screen.getByText('45 m')).toBeInTheDocument();
  expect(screen.getByText('101、104')).toBeInTheDocument();
});

it('sends the radius the user picked', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: '1000 m' }));
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  await waitFor(() => expect(getStopsNearby).toHaveBeenCalledWith(22.2819, 114.1582, 1000));
});

it('sends what was typed rather than the default', async () => {
  renderPage();
  const [latField, lonField] = screen.getAllByRole('textbox');
  await userEvent.clear(latField);
  await userEvent.type(latField, '22.3193');
  await userEvent.clear(lonField);
  await userEvent.type(lonField, '114.1694');
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  await waitFor(() => expect(getStopsNearby).toHaveBeenCalledWith(22.3193, 114.1694, 250));
});

// An empty result and a failed request must not look alike: one means there is
// nothing nearby, the other that the answer is unknown.
it('distinguishes an empty result from a failure', async () => {
  getStopsNearby.mockResolvedValue(response([]));
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  expect(await screen.findByText(/附近沒有車站/)).toBeInTheDocument();
  expect(screen.queryByText(/搜尋失敗/)).not.toBeInTheDocument();
});

it('reports a failed search, carrying the reason', async () => {
  getStopsNearby.mockRejectedValue(new Error('Request failed with status 400: outside Hong Kong'));
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  const message = await screen.findByText(/搜尋失敗/);
  expect(message).toHaveTextContent('outside Hong Kong');
  expect(screen.queryByText(/附近沒有車站/)).not.toBeInTheDocument();
});

// A blank or non-numeric field is answered without a round trip, so the message
// names the problem instead of arriving as a 400.
it('rejects a malformed coordinate without calling the API', async () => {
  renderPage();
  const [latField] = screen.getAllByRole('textbox');
  await userEvent.clear(latField);
  await userEvent.type(latField, 'north');
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  expect(await screen.findByText(/請輸入有效的座標/)).toBeInTheDocument();
  expect(getStopsNearby).not.toHaveBeenCalled();
});

// The two modes have separate detail pages, and a minibus id routed to the bus
// page yields a stop that does not exist.
it('opens each mode at its own detail page', async () => {
  getStopsNearby.mockResolvedValue(
    response([
      stop({ kind: 'bus', stop: 'BUS1' }),
      stop({ kind: 'minibus', stop: '20001', name_tc: '小巴站', company: 'HKI', distance_m: 60 }),
    ])
  );
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  await userEvent.click(await screen.findByText('置地廣場'));
  expect(mockedNavigate).toHaveBeenCalledWith('/bus/stop/BUS1');

  await userEvent.click(screen.getByText('小巴站'));
  expect(mockedNavigate).toHaveBeenCalledWith('/minibus/stop/20001');
});
