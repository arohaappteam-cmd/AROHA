import { polygonPoints } from "@/modules/journey/chart";
import type { AreaProgress } from "@/modules/journey/progress";
import { Glyph } from "@/components/common/glyph";

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 92;

const toPath = (points: [number, number][]) => `${points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("")}Z`;

/**
 * Where the effort went: completed quests per core area, as a stat
 * pentagon. The filled shape is this period, the outline the one before —
 * the comparison is the point, so both share one scale.
 */
export function EnergyMap({ areas, hasPrevious }: { areas: AreaProgress[]; hasPrevious: boolean }) {
  const max = Math.max(1, ...areas.map((area) => Math.max(area.completed, area.previousCompleted ?? 0)));
  const current = polygonPoints(areas.map((area) => area.completed / max), CENTER, RADIUS);
  const previous = polygonPoints(areas.map((area) => (area.previousCompleted ?? 0) / max), CENTER, RADIUS);
  const axes = polygonPoints(areas.map(() => 1), CENTER, RADIUS);
  const labels = polygonPoints(areas.map(() => 1), CENTER, RADIUS + 26);
  const total = areas.reduce((sum, area) => sum + area.completed, 0);
  const strongest = [...areas].sort((a, b) => b.completed - a.completed)[0];
  const quietest = [...areas].sort((a, b) => a.completed - b.completed)[0];

  return (
    <figure className="space-y-3">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto w-full max-w-[19rem]"
        role="img"
        aria-label={`Completed quests by area: ${areas.map((area) => `${area.label} ${area.completed}`).join(", ")}.`}
      >
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <path key={ring} d={toPath(polygonPoints(areas.map(() => ring), CENTER, RADIUS))} fill="none" className="stroke-border" strokeWidth={1} />
        ))}
        {axes.map(([x, y], index) => (
          <line key={index} x1={CENTER} y1={CENTER} x2={x} y2={y} className="stroke-border" strokeWidth={1} />
        ))}
        {hasPrevious && <path d={toPath(previous)} fill="none" className="stroke-muted-foreground/70" strokeWidth={1.5} strokeLinejoin="round" />}
        {total > 0 && (
          <path d={toPath(current)} className="glow-success fill-success/15 stroke-success" strokeWidth={2} strokeLinejoin="round" />
        )}
        {total > 0 &&
          current.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={4} className="fill-success stroke-card" strokeWidth={2} />)}
        {labels.map(([x, y], index) => (
          <g key={areas[index].lifeArea} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
            <text textAnchor="middle" dy="-0.2em" className="fill-foreground text-[15px]">
              <Glyph emoji={areas[index].emoji} />
            </text>
            <text textAnchor="middle" dy="1.1em" className="fill-muted-foreground font-mono text-[10px]">
              {areas[index].completed}
            </text>
          </g>
        ))}
      </svg>

      <figcaption className="space-y-2 text-center text-xs text-muted-foreground">
        <span className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-success" />
            This period
          </span>
          {hasPrevious && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-4 rounded-full bg-muted-foreground/70" />
              The period before
            </span>
          )}
        </span>
        {total > 0 ? (
          <span className="block text-pretty">
            Most of your effort went to <span className="text-foreground">{strongest.label.toLowerCase()}</span>
            {quietest.completed < strongest.completed && (
              <>
                ; <span className="text-foreground">{quietest.label.toLowerCase()}</span> was quietest
              </>
            )}
            .
          </span>
        ) : (
          <span className="block">Complete quests in this range to see where your energy goes.</span>
        )}
      </figcaption>
    </figure>
  );
}
