import { dayKey } from "../format.js";

export function WeekChart({ week, total, windowLabel }) {
  const max = Math.max(1, ...week.map((day) => day.slots));
  const todayKey = dayKey(new Date());
  const failedDays = week.filter((day) => day.failed > 0);
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Slots this week</h2>
          <p className="meta">{windowLabel}. Each bar counts posts dated that day, including ones already simulated.</p>
        </div>
        <p className="panel-figure">
          <span className="figure">{total}</span>
          <span className="unit"> posts</span>
        </p>
      </header>
      <div className="week-chart" aria-hidden="true">
        {week.map((day) => {
          const height = day.slots ? Math.max(10, (day.slots / max) * 100) : 0;
          const failedShare = day.slots ? (day.failed / day.slots) * 100 : 0;
          return (
            <div key={day.date} className={day.date === todayKey ? "week-col today" : "week-col"}>
              <span className="week-count">{day.slots || ""}</span>
              <div className="week-track">
                {day.slots ? (
                  <span className="week-bar" style={{ height: `${height}%` }}>
                    {day.failed ? <span className="week-failed" style={{ height: `${failedShare}%` }} /> : null}
                  </span>
                ) : (
                  <span className="week-zero" />
                )}
              </div>
              <span className="week-day">{day.weekday}</span>
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <span className="legend-swatch" aria-hidden="true" /> Dated
        </span>
        <span>
          <span className="legend-swatch failed" aria-hidden="true" /> Failed
        </span>
        {failedDays.length ? (
          <span className="meta">{failedDays.map((day) => `${day.weekday} has ${day.failed} failed`).join(". ")}.</span>
        ) : null}
      </div>
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
