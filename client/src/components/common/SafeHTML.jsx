import DOMPurify from 'dompurify';

/**
 * Render untrusted HTML safely.
 * Use this only when you intentionally want to render formatted HTML.
 * Plain text should always be rendered with `{value}` (React escapes by default).
 */
export default function SafeHTML({ html, mode = 'plain', className }) {
  if (html == null) return null;
  const clean = mode === 'rich'
    ? DOMPurify.sanitize(html, { ADD_ATTR: ['target'], ADD_TAGS: ['br'] })
    : DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
