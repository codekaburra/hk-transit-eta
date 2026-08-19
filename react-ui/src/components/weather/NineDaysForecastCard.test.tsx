import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { NineDaysForecastCard } from './NineDaysForecastCard';

// The card calls fetch directly rather than going through services/api, once
// per language, so the mock routes on the lang parameter.
const mockFetch = jest.fn();

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

const day = (forecastDate: string, week: string, psr: string) => ({
  forecastDate,
  week,
  forecastWind: '東風三至四級',
  forecastWeather: '大致多雲，有幾陣驟雨。',
  forecastMaxtemp: { value: 31, unit: 'C' },
  forecastMintemp: { value: 27, unit: 'C' },
  forecastMaxrh: { value: 95, unit: 'percent' },
  forecastMinrh: { value: 70, unit: 'percent' },
  ForecastIcon: 62,
  PSR: psr,
});

const chinese = {
  generalSituation: '一股東北季候風正影響華南。',
  weatherForecast: [day('20260820', '星期四', '中')],
  updateTime: '2026-08-19T16:45:00+08:00',
  seaTemp: { place: '北角', value: 28.5, unit: 'C', recordTime: '2026-08-19T14:00:00+08:00' },
  soilTemp: [
    {
      place: '京士柏',
      value: 30.1,
      unit: 'C',
      recordTime: '2026-08-19T07:00:00+08:00',
      depth: { unit: 'metre', value: 0.5 },
    },
  ],
};

const english = {
  ...chinese,
  generalSituation: 'A northeast monsoon is affecting southern China.',
  weatherForecast: [
    { ...day('20260820', 'Thursday', 'Medium'), forecastWind: 'East force 3 to 4' },
  ],
  seaTemp: { ...chinese.seaTemp, place: 'North Point' },
  soilTemp: [{ ...chinese.soilTemp[0], place: "King's Park" }],
};

const renderCard = () =>
  render(
    <ThemeProvider>
      <NineDaysForecastCard />
    </ThemeProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
});

// Both requests succeed: the card is the bilingual one the page's own labels
// promise, paired by forecastDate rather than by position.
it('shows both languages when the English response is complete', async () => {
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(ok(url.includes('lang=en') ? english : chinese))
  );

  renderCard();

  expect(await screen.findByText(chinese.generalSituation)).toBeInTheDocument();
  expect(screen.getByText(english.generalSituation)).toBeInTheDocument();
  expect(screen.getByText('中 Medium')).toBeInTheDocument();
  expect(screen.getByText(/北角 North Point/)).toBeInTheDocument();
  expect(screen.getByText(/京士柏 King's Park/)).toBeInTheDocument();
});

// The regression this guards: the render path reads weatherForecast, seaTemp
// and soilTemp off the English payload without checking them, so a 200 whose
// body is short of that shape used to throw during render. There is no
// ErrorBoundary in src, so the throw blanked the whole weather page instead of
// dropping just the English text.
it('falls back to Chinese when the English response is a 200 of the wrong shape', async () => {
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      ok(url.includes('lang=en') ? { generalSituation: english.generalSituation } : chinese)
    )
  );

  renderCard();

  expect(await screen.findByText(chinese.generalSituation)).toBeInTheDocument();
  expect(screen.getByText('中')).toBeInTheDocument();
  expect(screen.getByText(/北角/)).toBeInTheDocument();
  expect(screen.queryByText(english.generalSituation)).not.toBeInTheDocument();
});

// Only the Chinese request is required. An English request that never lands is
// the case the conditional rendering always handled.
it('falls back to Chinese when the English request fails', async () => {
  mockFetch.mockImplementation((url: string) =>
    url.includes('lang=en')
      ? Promise.reject(new Error('offline'))
      : Promise.resolve(ok(chinese))
  );

  renderCard();

  expect(await screen.findByText(chinese.generalSituation)).toBeInTheDocument();
  expect(screen.getByText('中')).toBeInTheDocument();
  expect(screen.queryByText(english.generalSituation)).not.toBeInTheDocument();
});

// The Chinese request is the one that decides whether the card renders at all.
it('shows the error state when the Chinese request fails', async () => {
  mockFetch.mockImplementation((url: string) =>
    url.includes('lang=en')
      ? Promise.resolve(ok(english))
      : Promise.resolve({ ok: false, status: 503, json: async () => ({}) })
  );

  renderCard();

  expect(await screen.findByText(/無法獲取天氣資料/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /重試/ })).toBeInTheDocument();
});
