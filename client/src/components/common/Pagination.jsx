export default function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const startPage = Math.max(1, page - siblingCount);
  const endPage = Math.min(totalPages, page + siblingCount);

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      {showFirstLast && page > 1 && (
        <button onClick={() => onPageChange(1)} aria-label="First page" type="button">{'\u00AB'}</button>
      )}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        type="button"
      >
        {'\u2039'}
      </button>

      {startPage > 1 && <span className="pagination-ellipsis" aria-hidden="true">{'\u2026'}</span>}

      {pageNumbers.map((n) => (
        <button
          key={n}
          onClick={() => onPageChange(n)}
          aria-current={n === page ? 'page' : undefined}
          className={n === page ? 'active' : ''}
          type="button"
        >
          {n}
        </button>
      ))}

      {endPage < totalPages && <span className="pagination-ellipsis" aria-hidden="true">{'\u2026'}</span>}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        type="button"
      >
        {'\u203A'}
      </button>
      {showFirstLast && page < totalPages && (
        <button onClick={() => onPageChange(totalPages)} aria-label="Last page" type="button">{'\u00BB'}</button>
      )}
    </nav>
  );
}
