import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';

describe('AppShell', () => {
  it('renders the app heading and primary navigation', () => {
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppShell />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/last[- ]mile/i).length).toBeGreaterThan(0);
    const primaryNav = screen.getByRole('navigation', { name: 'Primary' });
    expect(
      within(primaryNav).getByRole('link', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(
      within(primaryNav).getByRole('link', { name: 'Posture' }),
    ).toBeInTheDocument();
    expect(
      within(primaryNav).getByRole('link', { name: 'Symptoms' }),
    ).toBeInTheDocument();
  });
});
