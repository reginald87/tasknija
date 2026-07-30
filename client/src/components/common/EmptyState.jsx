export default function EmptyState({ icon = '\u{1F4ED}', title = 'Nothing here yet', message, action }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
