import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Alert from '../Alert.jsx';

describe('Alert', () => {
  it('renders children with default type info', () => {
    render(<Alert>hello</Alert>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('uses alert role for error type', () => {
    render(<Alert type="error">oops</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders dismiss button when dismissible', async () => {
    const onDismiss = vi.fn();
    render(<Alert dismissible onDismiss={onDismiss}>x</Alert>);
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
