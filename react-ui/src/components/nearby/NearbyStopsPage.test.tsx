import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { NearbyStopsPage } from './NearbyStopsPage';
import { NearbyStop, NearbyStops } from '../../services/api';
import { HttpError } from '../../services/http';

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

// The page searches its default coordinate as it opens. Tests that are about a
// later search wait for that one to land first, and clear it, so the assertion
// is about the call the test made.
const settleInitialSearch = async () => {
  await screen.findByRole('button', { name: /搜尋 Search/ });
  getStopsNearby.mockClear();
};

beforeEach(() => {
  jest.clearAllMocks();
  getStopsNearby.mockResolvedValue(response([stop()]));
});

// Filled fields above an empty list read as a search that found nothing, which
// is exactly what the default coordinate was chosen to avoid.
it('searches its default coordinate as it opens', async () => {
  renderPage();

  await waitFor(() => expect(getStopsNearby).toHaveBeenCalledWith(22.2819, 114.1582, 250));
  expect(await screen.findByText('置地廣場')).toBeInTheDocument();
  expect(screen.getByText('45 m')).toBeInTheDocument();
  expect(screen.getByText('101、104')).toBeInTheDocument();
});

it('sends the radius the user picked', async () => {
  renderPage();
  await settleInitialSearch();

  await userEvent.click(screen.getByRole('button', { name: '1000 m' }));
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  await waitFor(() => expect(getStopsNearby).toHaveBeenCalledWith(22.2819, 114.1582, 1000));
});

it('sends what was typed rather than the default', async () => {
  renderPage();
  await settleInitialSearch();

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

  expect(await screen.findByText(/附近沒有車站/)).toBeInTheDocument();
  expect(screen.queryByText(/搜尋失敗/)).not.toBeInTheDocument();
});

it('reports a failed search, carrying the reason', async () => {
  getStopsNearby.mockRejectedValue(new Error('Request failed with status 400: outside Hong Kong'));
  renderPage();

  const message = await screen.findByText(/搜尋失敗/);
  expect(message).toHaveTextContent('outside Hong Kong');
  expect(screen.queryByText(/附近沒有車站/)).not.toBeInTheDocument();
});

// The status line stacked in front of the label made a long English blob under
// a Chinese heading. The server's own sentence is the part worth reading.
it('shows the server\'s explanation without the status line', async () => {
  getStopsNearby.mockRejectedValue(
    new HttpError(400, "Query parameter 'lat' must be between 22.1 and 22.6 — outside Hong Kong")
  );
  renderPage();

  const message = await screen.findByText(/搜尋失敗/);
  expect(message).toHaveTextContent('outside Hong Kong');
  expect(message).not.toHaveTextContent('Request failed with status');
});

// A blank or non-numeric field is answered without a round trip, so the message
// names the problem instead of arriving as a 400.
it('rejects a malformed coordinate without calling the API', async () => {
  renderPage();
  await settleInitialSearch();

  const [latField] = screen.getAllByRole('textbox');
  await userEvent.clear(latField);
  await userEvent.type(latField, 'north');
  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  expect(await screen.findByText(/請輸入有效的座標/)).toBeInTheDocument();
  expect(getStopsNearby).not.toHaveBeenCalled();
});

// The button is the only feedback that a search is running, and re-submitting
// while one is in flight would race two results into the same state.
it('marks the search as running and blocks a second submit', async () => {
  renderPage();
  await settleInitialSearch();

  let release: (value: NearbyStops) => void = () => {};
  getStopsNearby.mockReturnValue(new Promise<NearbyStops>(resolve => { release = resolve; }));

  await userEvent.click(screen.getByRole('button', { name: /搜尋 Search/ }));

  const running = await screen.findByRole('button', { name: /搜尋中/ });
  expect(running).toBeDisabled();

  await userEvent.click(running);
  expect(getStopsNearby).toHaveBeenCalledTimes(1);

  release(response([stop({ name_tc: '第二次搜尋' })]));
  expect(await screen.findByText('第二次搜尋')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /搜尋 Search/ })).toBeEnabled();
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

  await userEvent.click(await screen.findByText('置地廣場'));
  expect(mockedNavigate).toHaveBeenCalledWith('/bus/stop/BUS1');

  await userEvent.click(screen.getByText('小巴站'));
  expect(mockedNavigate).toHaveBeenCalledWith('/minibus/stop/20001');
});

// A mode this build has no page for must not be routed to one of the two it
// does have: that lands on a stop id the other mode does not know, which reads
// as a broken link rather than as unknown data.
it('opens nothing for a kind it has no page for', async () => {
  getStopsNearby.mockResolvedValue(
    response([stop({ kind: 'mtr' as NearbyStop['kind'], stop: 'ADM', name_tc: '金鐘站' })])
  );
  renderPage();

  await userEvent.click(await screen.findByText('金鐘站'));
  expect(mockedNavigate).not.toHaveBeenCalled();
});
