import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Start run</Button>);
    expect(screen.getByRole('button', { name: 'Start run' })).toBeInTheDocument();
  });

  it('fires onClick when clicked', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Begin</Button>);
    screen.getByRole('button').click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const handler = vi.fn();
    render(
      <Button disabled onClick={handler}>
        Begin
      </Button>,
    );
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(handler).not.toHaveBeenCalled();
  });
});
