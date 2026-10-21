import type { Grid } from "../../shared/heatmap";

/**
 * 一张热力图：SVG 画格子，周一在上；点一格调用 onSelect。
 * 颜色深浅只用 0–4 档，具体颜色在 CSS 变量 --l0…--l4 里定义。
 */
export function HeatmapGrid({
  grid,
  cell = 12,
  label,
  selected,
  onSelect,
}: {
  grid: Grid;
  cell?: number;
  label: string;
  selected?: string | null;
  onSelect?: (date: string) => void;
}) {
  const gap = 3;
  const top = 16;
  const left = 20;
  const w = left + grid.weeks.length * (cell + gap);
  const h = top + 7 * (cell + gap);
  return (
    <div className="heatmap-scroll" ref={(el) => el && (el.scrollLeft = el.scrollWidth)}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="heatmap">
        {grid.monthLabels.map((m) => (
          <text key={m.week} x={left + m.week * (cell + gap)} y={10}>
            {m.label}
          </text>
        ))}
        {["一", "三", "五"].map((t, i) => (
          <text key={t} x={0} y={top + i * 2 * (cell + gap) + cell - 2}>
            {t}
          </text>
        ))}
        {grid.weeks.map((col, wi) =>
          col.map((c, di) =>
            c.inRange ? (
              <rect
                key={c.date}
                x={left + wi * (cell + gap)}
                y={top + di * (cell + gap)}
                width={cell}
                height={cell}
                className={`lv${c.level}${selected === c.date ? " sel" : ""}`}
                onClick={onSelect ? () => onSelect(c.date) : undefined}
              >
                <title>{`${c.date}：${c.count}`}</title>
              </rect>
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}

export function HeatLegend() {
  return (
    <span className="heat-legend" aria-hidden="true">
      少 <i className="lv0" />
      <i className="lv1" />
      <i className="lv2" />
      <i className="lv3" />
      <i className="lv4" /> 多
    </span>
  );
}
