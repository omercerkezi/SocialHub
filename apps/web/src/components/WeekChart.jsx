export function WeekChart({ week, total, windowLabel }) {
  const max = Math.max(1, ...week.map((day) => day.slots));
  const width = 640;
  const height = 180;
  const gap = 12;
  const barWidth = (width - gap * (week.length - 1)) / week.length;
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Slots this week</h2>
        <p>
          <span className="figure">{total}</span>
          <span className="unit"> posts</span>
        </p>
      </header>
      <p className="meta">{windowLabel}. Each bar counts posts dated that day, including ones already simulated.</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${total} slots from ${windowLabel}.`}>
        {week.map((day, index) => {
          const barHeight = day.slots === 0 ? 0 : Math.max(8, (day.slots / max) * 132);
          const x = index * (barWidth + gap);
          const y = 148 - barHeight;
          return (
            <g key={day.date}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill={day.slots ? "var(--chart-1)" : "var(--raised)"} />
              <text x={x + barWidth / 2} y={168} textAnchor="middle" fill="var(--muted)" fontSize="12">
                {day.weekday}
              </text>
            </g>
          );
        })}
      </svg>
      {week.some((day) => day.failed > 0) ? (
        <p className="meta">
          {week
            .filter((day) => day.failed > 0)
            .map((day) => `${day.weekday} has ${day.failed} failed`)
            .join(". ")}
          .
        </p>
      ) : null}
      <table className="sr-only">
        <caption>Slots this week</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Slots</th>
            <th>Failed</th>
          </tr>
        </thead>
        <tbody>
          {week.map((day) => (
            <tr key={day.date}>
              <td>{day.weekday}</td>
              <td>{day.slots}</td>
              <td>{day.failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
