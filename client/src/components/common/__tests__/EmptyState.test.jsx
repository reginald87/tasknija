import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState.jsx';

describe('EmptyState', () => {
  it('renders default title and icon', () => {
    render(<EmptyState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Nothing here yet/i)).toBeInTheDocument();
  });

  it('renders custom icon, title, and message', () => {
    render(<EmptyState icon="X" title="Empty" message="Nothing to show" />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('renders action element when provided', () => {
    render(<EmptyState action={<button>Add item</button>} />);
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });
});
