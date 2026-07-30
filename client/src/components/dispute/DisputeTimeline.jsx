export default function DisputeTimeline({ events }) {
  if (!events?.length) return null;

  return (
    <ol className="dispute-timeline">
      {events.map((e, i) => (
        <li key={i} className="timeline-event">
          <div className="timeline-marker" />
          <div className="timeline-content">
            <div className="timeline-title">{e.title}</div>
            <div className="timeline-description">{e.description}</div>
            {e.timestamp && (
              <time className="timeline-time" dateTime={e.timestamp}>
                {new Date(e.timestamp).toLocaleString()}
              </time>
            )}
            {e.actor && <div className="timeline-actor">By {e.actor}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
