import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { MainNavigation } from './MainNavigation';

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

const renderNav = () =>
  render(
    <ThemeProvider>
      <MemoryRouter>
        <MainNavigation />
      </MemoryRouter>
    </ThemeProvider>
  );

beforeEach(() => jest.clearAllMocks());

// This bar is the only way back to the search from a detail page. It pointed at
// '/', which is the landing page of app categories: it ignores the state, so
// every button dropped the reader on the menu instead of the search they asked
// for.
it.each([
  ['🚌 巴士路線 Bus Routes', 'bus-route'],
  ['🚏 巴士站 Bus Stops', 'bus-stop'],
  ['🚐 小巴路線 Minibus Routes', 'minibus-route'],
  ['🚏 小巴站 Minibus Stops', 'minibus-stop'],
  ['🚇 港鐵 MTR', 'mtr'],
])('opens the transport page at %s', async (label, searchType) => {
  renderNav();

  await userEvent.click(screen.getByRole('button', { name: label }));

  expect(mockedNavigate).toHaveBeenCalledWith('/transport', { state: { searchType } });
});
