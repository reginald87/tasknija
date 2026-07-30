import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorState from '../ErrorState.jsx';

describe('ErrorState', () => {
  it('renders default message', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('renders custom message and code', () => {
    render(<ErrorState message="Boom" code="E_BOOM" />);
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.getByText(/Code: E_BOOM/)).toBeInTheDocument();
  });

  it('calls onRetry when retry clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('hides retry button when onRetry missing', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
