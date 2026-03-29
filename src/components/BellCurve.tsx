interface Props {
  mean: number;
  sd: number;
  value: number;
  optimalMin: number;
  optimalMax: number;
  unit: string;
}

const W = 320;
const H = 110;
const PAD_X = 28;
const PAD_Y = 12;
const PLOT_W = W - PAD_X * 2;
const PLOT_H = H - PAD_Y * 2;
const NUM_POINTS = 200;

function normalPdf(x: number, mean: number, sd: number): number {
  return (
    Math.exp(-0.5 * Math.pow((x - mean) / sd, 2)) /
    (sd * Math.sqrt(2 * Math.PI))
  );
}

export function BellCurve({ mean, sd, value, optimalMin, optimalMax, unit }: Props) {
  const xMin = mean - 4 * sd;
  const xMax = mean + 4 * sd;

  const toSvgX = (x: number) =>
    PAD_X + ((x - xMin) / (xMax - xMin)) * PLOT_W;

  const points = Array.from({ length: NUM_POINTS }, (_, i) => {
    const x = xMin + (i / (NUM_POINTS - 1)) * (xMax - xMin);
    return { x, y: normalPdf(x, mean, sd) };
  });

  const maxY = normalPdf(mean, mean, sd);
  const toSvgY = (y: number) => PAD_Y + PLOT_H - (y / maxY) * PLOT_H;

  const pathD =
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(2)} ${toSvgY(p.y).toFixed(2)}`)
      .join(' ') + ` L ${toSvgX(xMax).toFixed(2)} ${(PAD_Y + PLOT_H).toFixed(2)} L ${toSvgX(xMin).toFixed(2)} ${(PAD_Y + PLOT_H).toFixed(2)} Z`;

  // Clamp optimal region to visible range
  const optX1 = toSvgX(Math.max(optimalMin, xMin));
  const optX2 = toSvgX(Math.min(optimalMax, xMax));

  const userX = toSvgX(Math.max(xMin, Math.min(xMax, value)));
  const userLabel = value.toFixed(1);
  const labelOnRight = userX < W / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      aria-label={`Bell curve. Your value: ${userLabel} ${unit}`}
    >
      {/* Optimal range shading */}
      <rect
        x={optX1}
        y={PAD_Y}
        width={Math.max(0, optX2 - optX1)}
        height={PLOT_H}
        fill="rgba(34, 197, 94, 0.08)"
        rx="2"
      />
      <line
        x1={optX1} y1={PAD_Y} x2={optX1} y2={PAD_Y + PLOT_H}
        stroke="rgba(34, 197, 94, 0.3)" strokeWidth="1" strokeDasharray="3 2"
      />
      <line
        x1={optX2} y1={PAD_Y} x2={optX2} y2={PAD_Y + PLOT_H}
        stroke="rgba(34, 197, 94, 0.3)" strokeWidth="1" strokeDasharray="3 2"
      />

      {/* Bell curve fill */}
      <path d={pathD} fill="rgba(148, 163, 184, 0.06)" />
      {/* Bell curve stroke */}
      <path
        d={points
          .map(
            (p, i) =>
              `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(2)} ${toSvgY(p.y).toFixed(2)}`,
          )
          .join(' ')}
        fill="none"
        stroke="rgba(148, 163, 184, 0.35)"
        strokeWidth="1.5"
      />

      {/* Mean tick */}
      <line
        x1={toSvgX(mean)} y1={PAD_Y + PLOT_H - 3}
        x2={toSvgX(mean)} y2={PAD_Y + PLOT_H + 3}
        stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1"
      />

      {/* User marker line */}
      <line
        x1={userX} y1={PAD_Y - 4}
        x2={userX} y2={PAD_Y + PLOT_H}
        stroke="#06b6d4"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      {/* User marker dot */}
      <circle cx={userX} cy={toSvgY(normalPdf(value, mean, sd))} r="3.5" fill="#06b6d4" />

      {/* User value label */}
      <text
        x={labelOnRight ? userX + 5 : userX - 5}
        y={PAD_Y + 2}
        textAnchor={labelOnRight ? 'start' : 'end'}
        fontSize="9"
        fill="#06b6d4"
        fontFamily="monospace"
      >
        {userLabel}
      </text>

      {/* Baseline */}
      <line
        x1={PAD_X} y1={PAD_Y + PLOT_H}
        x2={W - PAD_X} y2={PAD_Y + PLOT_H}
        stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1"
      />

      {/* Axis labels: mean ± 2σ */}
      {[-2, 0, 2].map((z) => {
        const xVal = mean + z * sd;
        const sx = toSvgX(xVal);
        return (
          <text key={z} x={sx} y={H - 1} textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.4)" fontFamily="monospace">
            {z === 0 ? 'μ' : `${z > 0 ? '+' : ''}${z}σ`}
          </text>
        );
      })}
    </svg>
  );
}
