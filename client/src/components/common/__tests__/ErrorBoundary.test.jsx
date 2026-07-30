import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary.jsx';

function Boom() {
  throw new Error('boom');
}

function Good() {
  return <div>good child</div>;
}

describe('ErrorBoundary', () => {
  // Silence expected console.error from React's error logging during tests
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Good />
      </ErrorBoundary>
    );
    expect(screen.getByText('good child')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('resets error state when Try again clicked', async () => {
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error('boom');
      return <div>recovered</div>;
    }
    render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  consoleError.mockRestore();
});
