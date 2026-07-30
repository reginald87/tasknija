import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal, { confirmModal } from '../ConfirmModal.jsx';

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ConfirmModal isOpen={false} onConfirm={() => {}} onCancel={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title, message, and buttons when open', () => {
    render(
      <ConfirmModal
        isOpen
        title="Delete item"
        message="Are you sure?"
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('applies danger variant class on confirm button', () => {
    render(<ConfirmModal isOpen variant="danger" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /confirm/i })).toHaveClass('btn-danger');
  });

  it('calls onCancel when backdrop clicked', async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal isOpen onConfirm={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not bubble clicks from content to backdrop', async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal isOpen onConfirm={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByText(/are you sure/i));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('confirmModal promise helper resolves from window.confirm', async () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await expect(confirmModal({ message: 'go?' })).resolves.toBe(true);
    spy.mockRestore();
  });
});
