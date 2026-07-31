import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';
import { THEME_MODES } from '../hooks/useThemeStyles';

// Exercises the context through a consumer, which is the only way it is used.
const Consumer: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="mode">{themeMode}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <ThemeProvider>
      <Consumer />
    </ThemeProvider>
  );

beforeEach(() => {
  localStorage.clear();
});

describe('ThemeContext', () => {
  it('starts from the system preference when nothing is stored', () => {
    // The jsdom matchMedia stub in setupTests reports no dark preference.
    renderWithProvider();
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('restores the stored theme over the system preference', () => {
    localStorage.setItem('themeMode', 'dark');
    renderWithProvider();
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('cycles to a different theme and persists the choice', async () => {
    renderWithProvider();
    const before = screen.getByTestId('mode').textContent;

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));

    const after = screen.getByTestId('mode').textContent;
    expect(after).not.toBe(before);
    // The choice must survive a reload.
    expect(localStorage.getItem('themeMode')).toBe(after);
  });

  it('returns to the first theme after cycling through all of them', async () => {
    renderWithProvider();

    // beforeEach clears storage and the shared matchMedia stub reports no dark
    // preference, so the provider intentionally starts at THEME_MODES[0].
    for (const expected of THEME_MODES) {
      expect(screen.getByTestId('mode')).toHaveTextContent(expected);
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    }
    expect(screen.getByTestId('mode')).toHaveTextContent(THEME_MODES[0]);
  });

  // An unrecognised stored value must not leave the UI unstyled.
  it('ignores an invalid stored theme', () => {
    localStorage.setItem('themeMode', 'chartreuse');
    renderWithProvider();

    const mode = screen.getByTestId('mode').textContent as string;
    expect(['light', 'dark', 'red', 'warm']).toContain(mode);
  });
});
