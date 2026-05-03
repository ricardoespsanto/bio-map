interface Props {
  values: number[]; // 6 data points, oldest → newest
  rangeMin: number;
  rangeMax: number;
  optimalMin: number;
  optimalMax: number;
  unit: string;
  monthLabels: string[]; // 6 labels e.g. ['Oct', 'Nov', ...]
}

const W = 320;
const H = 90;
const PAD_X = 32;
const PAD_Y = 10;
const PLOT_W = W - PAD_X * 2;
const PLOT_H = H - PAD_Y * 2 - 14; // 14px for bottom labels

export function TrendChart({ values, rangeMin, rangeMax, optimalMin, optimalMax, unit, monthLabels }: Props) {
  if (values.length < 2) return null;

  const displayMin = Math.min(...values, optimalMin) - (rangeMax - rangeMin) * 0.05;
  const displayMax = Math.max(...values, optimalMax) + (rangeMax - rangeMin) * 0.05;

  const toX = (i: number) => PAD_X + (i / (values.length - 1)) * PLOT_W;
  const toY = (v: number) =>
    PAD_Y + PLOT_H - ((v - displayMin) / (displayMax - displayMin)) * PLOT_H;

  const linePath = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(v).toFixed(2)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L ${toX(values.length - 1).toFixed(2)} ${(PAD_Y + PLOT_H).toFixed(2)}` +
    ` L ${toX(0).toFixed(2)} ${(PAD_Y + PLOT_H).toFixed(2)} Z`;

  const optY1 = toY(Math.min(optimalMax, displayMax));
  const optY2 = toY(Math.max(optimalMin, displayMin));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      aria-label={`6-month trend for values in ${unit}`}
    >
      {/* Optimal band */}
      <rect
        x={PAD_X}
        y={Math.min(optY1, optY2)}
        width={PLOT_W}
        height={Math.abs(optY2 - optY1)}
        fill="rgba(34, 197, 94, 0.07)"
      />
      <line x1={PAD_X} y1={optY1} x2={W - PAD_X} y2={optY1} stroke="rgba(34,197,94,0.25)" strokeWidth="1" strokeDasharray="3 2" />
      <line x1={PAD_X} y1={optY2} x2={W - PAD_X} y2={optY2} stroke="rgba(34,197,94,0.25)" strokeWidth="1" strokeDasharray="3 2" />

      {/* Area fill */}
      <path d={areaPath} fill="rgba(6, 182, 212, 0.06)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots + values */}
      {values.map((v, i) => {
        const cx = toX(i);
        const cy = toY(v);
        const isLast = i === values.length - 1;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={isLast ? 4 : 2.5} fill={isLast ? '#06b6d4' : '#0e7490'} stroke={isLast ? '#e2e8f0' : 'none'} strokeWidth="1" />
            {isLast && (
              <text
                x={cx - 5}
                y={cy - 7}
                textAnchor="middle"
                fontSize="8"
                fill="#06b6d4"
                fontFamily="monospace"
              >
                {v.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}

      {/* Month labels */}
      {monthLabels.map((label, i) => (
        <text
          key={i}
          x={toX(i)}
          y={H - 1}
          textAnchor="middle"
          fontSize="8"
          fill="rgba(148,163,184,0.4)"
          fontFamily="monospace"
        >
          {label}
        </text>
      ))}

      {/* Baseline */}
      <line x1={PAD_X} y1={PAD_Y + PLOT_H} x2={W - PAD_X} y2={PAD_Y + PLOT_H} stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
    </svg>
  );
}

// Helper: generate 6-month label array ending at given month
export function buildMonthLabels(month: number): string[] {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labels: string[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    let m = month - offset;
    while (m < 1) m += 12;
    labels.push(MONTHS[m - 1]);
  }
  return labels;
}
