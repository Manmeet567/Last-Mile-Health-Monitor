import { render, screen } from '@testing-library/react';
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

    expect(screen.getByText(/last-mile/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /live monitor/i })).toBeInTheDocument();
  });
});
