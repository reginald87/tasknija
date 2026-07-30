import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastContext.jsx';

function Demo({ onReady }) {
  const toast = useToast();
  onReady?.(toast);
  return (
    <div>
      <button onClick={() => toast.success('saved')}>ok</button>
      <button onClick={() => toast.error('oops')}>err</button>
      <button onClick={() => toast.info('hi')}>info</button>
      <button onClick={() => toast.warning('careful')}>warn</button>
    </div>
  );
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('throws when useToast used outside provider', () => {
    // suppress React's error logging
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Demo />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it('renders success toast and dismisses after duration', () => {
    let captured;
    render(<ToastProvider><Demo onReady={(t) => (captured = t)} /></ToastProvider>);
    act(() => { captured.success('saved'); });
    expect(screen.getByText('saved')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-success');

    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('saved')).not.toBeInTheDocument();
  });

  it('error toast uses 6s default duration', () => {
    let captured;
    render(<ToastProvider><Demo onReady={(t) => (captured = t)} /></ToastProvider>);
    act(() => { captured.error('oops'); });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByText('oops')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByText('oops')).not.toBeInTheDocument();
  });

  it('dismisses manually when x clicked', () => {
    let captured;
    render(<ToastProvider><Demo onReady={(t) => (captured = t)} /></ToastProvider>);
    act(() => { captured.info('hi'); });
    act(() => {
      screen.getByRole('button', { name: /dismiss/i }).click();
    });
    expect(screen.queryByText('hi')).not.toBeInTheDocument();
  });

  it('renders each variant with correct class', () => {
    let captured;
    render(<ToastProvider><Demo onReady={(t) => (captured = t)} /></ToastProvider>);
    act(() => {
      captured.success('a');
      captured.error('b');
      captured.info('c');
      captured.warning('d');
    });
    expect(screen.getByText('a').parentElement).toHaveClass('toast-success');
    expect(screen.getByText('b').parentElement).toHaveClass('toast-error');
    expect(screen.getByText('c').parentElement).toHaveClass('toast-info');
    expect(screen.getByText('d').parentElement).toHaveClass('toast-warning');
  });
});
