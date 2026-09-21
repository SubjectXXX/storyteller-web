import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';

describe('player fixture journey', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'));

  it('moves from the library through valid setup into active play', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: /choose the world/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: 'Start story' })).toBeDisabled();
    await user.clear(screen.getByLabelText('Protagonist name'));
    await user.type(screen.getByLabelText('Protagonist name'), 'Arden');
    await user.click(screen.getByRole('button', { name: 'Start story' }));
    expect(screen.getByRole('heading', { name: 'The receiver wakes' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Say'));
    expect(screen.getByRole('button', { name: 'Submit Say action' })).toBeEnabled();
  });

  it('preserves reading actions when quota blocks generation', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/play');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'quota' }));
    expect(screen.getByRole('status')).toHaveTextContent('12 more credits required');
    expect(screen.getByRole('button', { name: /submit do action/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Undo to turn 13' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Open wallet' }));
    expect(screen.getByRole('heading', { name: '84 credits' })).toBeInTheDocument();
  });

  it('shows settings inheritance, validation, and immediate preview', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/settings');
    render(<App />);
    expect(screen.getByText('Inherited from your defaults')).toBeInTheDocument();
    expect(screen.getByText(/locked on by the quiet meridian/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Sliding window turns'));
    await user.type(screen.getByLabelText('Sliding window turns'), '3');
    expect(screen.getByText(/enter −1 or a number from 5 to 100/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Font family'), 'Atkinson Hyperlegible');
    expect(screen.getByText(/rain writes silver lines/i)).toHaveStyle({ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' });
  });

  it('uses explicit handoff and supports referral controls', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/wallet');
    render(<App />);
    expect(screen.getByRole('radio', { name: /wallet payment/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /review external checkout handoff/i }));
    expect(screen.getByText(/returning to this page never grants credits/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to fake provider/i }));
    expect(screen.getByText(/verified provider webhook/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /copy referral link/i }));
    expect(screen.getByText('Referral link copied.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /revoke code/i }));
    expect(screen.getByText('Code revoked')).toBeInTheDocument();
  });
});
