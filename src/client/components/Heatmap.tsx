import { useRef } from "react";
import type { Grid } from "../../shared/heatmap";
import { longDay } from "../api";

const DAY_LABELS = ["一", "", "三", "", "五", "", "日"];
let waved = false; // 热力图的“浪”只在这次打开网站时放一次

/**
 * 一年的热力图：每格是一个按钮，方向键可以在格子之间移动，回车选中。
 * 空白格只描边，今天加红圈，选中的格子加深色圈。
 */
export function HeatGrid({
  grid,
  today,
  selected,
  onSelect,
  label,
  describe,
}: {
  grid: Grid;
  today: string;
  selected: string | null;
  onSelect: (date: string) => void;
  label: string;
  describe: (date: string, count: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const wave = useRef(!waved);
  waved = true;
  const cells = grid.weeks.flat();
  const selIndex = Math.max(
    0,
    cells.findIndex((c) => c.date === (selected ?? today)),
  );

  const move = (from: number, delta: number) => {
    let i = from + delta;
    while (i >= 0 && i < cells.length && !cells[i].inRange) i += delta > 0 ? 1 : -1;
    if (i < 0 || i >= cells.length) return;
    const el = ref.current?.querySelector<HTMLButtonElement>(`[data-i="${i}"]`);
    el?.focus();
    onSelect(cells[i].date);
  };

  return (
    <div className="hm-scroll" ref={(el) => {
      if (el && !el.dataset.scrolled) {
        el.scrollLeft = el.scrollWidth;
        el.dataset.scrolled = "1";
      }
    }}>
      <div className={`hm${wave.current ? " wave" : ""}`} style={{ "--weeks": grid.weeks.length } as React.CSSProperties}>
        <span />
        <div className="hm-months" aria-hidden="true">
          {grid.monthLabels.map((m) => (
            <span key={m.week} style={{ gridColumn: `${m.week + 1} / span 3` }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="hm-days" aria-hidden="true">
          {DAY_LABELS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="hm-grid" role="grid" aria-label={label} ref={ref}>
          {cells.map((c, i) => {
            if (!c.inRange) return <span key={c.date} className="hm-cell lx" aria-hidden="true" />;
            const isToday = c.date === today;
            return (
              <button
                key={c.date}
                type="button"
                data-i={i}
                role="gridcell"
                className={`hm-cell l${c.level}${isToday ? " today" : ""}`}
                style={{ "--w": Math.floor(i / 7) } as React.CSSProperties}
                aria-selected={selected === c.date}
                aria-label={`${longDay(c.date)}${isToday ? "（今天）" : ""}：${describe(c.date, c.count)}`}
                tabIndex={i === selIndex ? 0 : -1}
                onClick={() => onSelect(c.date)}
                onKeyDown={(e) => {
                  const d = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[e.key];
                  if (d) {
                    e.preventDefault();
                    move(i, d);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Legend() {
  return (
    <span className="legend" aria-hidden="true">
      少
      <i className="l0" />
      <i className="l1" />
      <i className="l2" />
      <i className="l3" />
      <i className="l4" />多
    </span>
  );
}

/** 首页和登录页背后那面倾斜的“墙”：最近若干周的热力格子，纯装饰。 */
export function Wall({ grid, weeks = 36 }: { grid: Grid | null; weeks?: number }) {
  const cols = grid ? grid.weeks.slice(-weeks) : Array.from({ length: weeks }, () => Array.from({ length: 7 }, () => null));
  return (
    <div className="wall" aria-hidden="true">
      {cols.map((col, w) =>
        col.map((c, d) => (
          <i
            key={`${w}-${d}`}
            className={c ? (c.inRange ? `l${c.level}` : "lx") : "l0"}
            style={{ "--c": w } as React.CSSProperties}
          />
        )),
      )}
    </div>
  );
}

/** 一条小热力带：最近 26 周压成一行，每格一周，取那周最深的一档。 */
export function Strip({ grid }: { grid: Grid }) {
  const cols = grid.weeks.slice(-26);
  return (
    <span className="hm-strip" aria-hidden="true">
      {cols.map((col, i) => {
        const lv = Math.max(...col.map((c) => (c.inRange ? c.level : 0)));
        return <i key={i} className={`l${lv}`} />;
      })}
    </span>
  );
}
