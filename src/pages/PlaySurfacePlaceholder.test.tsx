import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import PlaySurfacePlaceholder from './PlaySurfacePlaceholder';

describe('PlaySurfacePlaceholder', () => {
  it('renders the beat and the first narrative paragraph', () => {
    render(
      <MemoryRouter initialEntries={['/play/demo-romance']}>
        <Routes>
          <Route path="/play/:adventureId?" element={<PlaySurfacePlaceholder />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /a quiet court/i })).toBeInTheDocument();
    expect(screen.getByText(/salt-wind market/i)).toBeInTheDocument();
  });

  it('exposes the choices as accessible buttons', () => {
    render(
      <MemoryRouter>
        <PlaySurfacePlaceholder />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /marbled alley/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lantern-seller/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /night barge/i })).toBeInTheDocument();
  });

  it('renders the disabled composer preview until S2 ships', () => {
    render(
      <MemoryRouter>
        <PlaySurfacePlaceholder />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /send \(s2\)/i })).toBeDisabled();
  });

  it('falls back to the sample scenario title when no :adventureId is given', () => {
    render(
      <MemoryRouter initialEntries={['/play']}>
        <Routes>
          <Route path="/play" element={<PlaySurfacePlaceholder />} />
          <Route path="/play/:adventureId?" element={<PlaySurfacePlaceholder />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /sample scenario/i })).toBeInTheDocument();
  });
});

describe('PlaySurfacePlaceholder interactions', () => {
  it('records a choice in the history when clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PlaySurfacePlaceholder />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /marbled alley/i }));
    expect(screen.getByRole('list', { name: /choices you have made/i })).toBeInTheDocument();
    expect(screen.getByText(/marbled alley/i)).toBeInTheDocument();
  });
});
