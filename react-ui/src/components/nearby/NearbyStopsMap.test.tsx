import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { NearbyStopsMap } from './NearbyStopsMap';
import { NearbyStop, NearbyStops } from '../../services/api';

// The real library injects Google's script and draws to a canvas, neither of
// which exists under jsdom. The stubs keep the props visible as DOM instead, so
// the test can assert what the map was asked to draw.
let mockLoaded = true;

// Stands in for the map instance the library hands back on load, so the camera
// calls the page makes on a new search are visible to the test.
const mockMap = { panTo: jest.fn(), setZoom: jest.fn() };

jest.mock('@react-google-maps/api', () => ({
  useJsApiLoader: () => ({ isLoaded: mockLoaded, loadError: undefined }),
  GoogleMap: ({ children, center, zoom, onLoad }: any) => {
    const react = require('react');
    react.useEffect(() => { onLoad?.(mockMap); }, [onLoad]);
    return (
      <div data-testid="map" data-center={`${center.lat},${center.lng}`} data-zoom={zoom}>
        {children}
      </div>
    );
  },
  MarkerF: ({ title, icon, onClick }: any) => (
    <button data-testid="marker" data-colour={icon?.fillColor ?? 'default'} onClick={onClick}>
      {title}
    </button>
  ),
  CircleF: ({ radius }: any) => <div data-testid="circle" data-radius={radius} />,
  InfoWindowF: ({ children }: any) => <div data-testid="info-window">{children}</div>,
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

const onStopClick = jest.fn();

const renderMap = (result: NearbyStops) =>
  render(
    <ThemeProvider>
      <NearbyStopsMap result={result} onStopClick={onStopClick} />
    </ThemeProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockLoaded = true;
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-key';
});

it('centres on the searched coordinate and draws the radius', () => {
  renderMap(response([stop()], 500));

  expect(screen.getByTestId('map')).toHaveAttribute('data-center', '22.2819,114.1582');
  expect(screen.getByTestId('circle')).toHaveAttribute('data-radius', '500');
});

// A single stop fitted to bounds would zoom in past the radius the user chose,
// leaving no sense of how far the search reached.
it('zooms to the radius rather than to the stops', () => {
  expect(renderMap(response([stop()], 100)).getByTestId('map')).toHaveAttribute('data-zoom', '17');
  expect(renderMap(response([stop()], 1000)).getAllByTestId('map')[1]).toHaveAttribute('data-zoom', '14');
});

// Overlapping pins are common at an interchange, so the two modes must not
// share a colour.
it('marks every stop, colouring bus and minibus apart from the centre', () => {
  renderMap(response([stop({ stop: 'BUS1' }), stop({ kind: 'minibus', stop: '20001' })]));

  const colours = screen.getAllByTestId('marker').map(marker => marker.getAttribute('data-colour'));
  expect(colours).toHaveLength(3); // centre + two stops
  expect(colours).toContain('default');
  expect(new Set(colours).size).toBe(3);
});

it('opens the stop from its info window', async () => {
  renderMap(response([stop({ stop: 'BUS1' })]));

  await userEvent.click(screen.getByRole('button', { name: '置地廣場' }));
  await userEvent.click(screen.getByRole('button', { name: /查看抵站時間/ }));

  expect(onStopClick).toHaveBeenCalledWith(expect.objectContaining({ stop: 'BUS1' }));
});

// Without a key Google returns an error watermark for every tile, which reads
// as a broken page rather than as missing configuration.
it('names the missing key instead of drawing a broken map', () => {
  delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  renderMap(response([stop()]));

  expect(screen.getByText(/未設定地圖金鑰/)).toBeInTheDocument();
  expect(screen.queryByTestId('map')).not.toBeInTheDocument();
});

it('says the map is still loading rather than rendering an empty frame', () => {
  mockLoaded = false;
  renderMap(response([stop()]));

  expect(screen.getByText(/地圖載入中/)).toBeInTheDocument();
  expect(screen.queryByTestId('map')).not.toBeInTheDocument();
});

// center and zoom only reach the map when it mounts. Without driving the camera
// a second search moved the circle and the pins while the viewport stayed over
// the first coordinate.
it('moves the camera to a later search', () => {
  const { rerender } = renderMap(response([stop()], 250));

  rerender(
    <ThemeProvider>
      <NearbyStopsMap
        result={{ centre: { lat: 22.3193, long: 114.1694 }, radius_m: 1000, stops: [stop()] }}
        onStopClick={onStopClick}
      />
    </ThemeProvider>
  );

  expect(mockMap.panTo).toHaveBeenLastCalledWith({ lat: 22.3193, lng: 114.1694 });
  expect(mockMap.setZoom).toHaveBeenLastCalledWith(14);
});

// The open window belongs to a stop from the previous result, which is not on
// the map any more.
it('closes an info window left over from the previous search', async () => {
  const { rerender } = renderMap(response([stop({ stop: 'BUS1' })]));
  await userEvent.click(screen.getByRole('button', { name: '置地廣場' }));
  expect(screen.getByTestId('info-window')).toBeInTheDocument();

  rerender(
    <ThemeProvider>
      <NearbyStopsMap
        result={response([stop({ stop: 'BUS2', name_tc: '另一個站' })])}
        onStopClick={onStopClick}
      />
    </ThemeProvider>
  );

  expect(screen.queryByTestId('info-window')).not.toBeInTheDocument();
});
