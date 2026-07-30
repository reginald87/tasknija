export default function ErrorState({ message = 'Something went wrong', onRetry, code }) {
  return (
    <div className="error-state" role="alert">
      <h3>{'\u26A0\uFE0F Error'}</h3>
      <p>{message}</p>
      {code && <p className="error-code">Code: {code}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary">Retry</button>
      )}
    </div>
  );
}
