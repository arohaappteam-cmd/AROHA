import { cn } from "@/lib/utils";

export type ColumnPoint = {
  label: string;
  value: number;
  /** Extra line in the tooltip and table, e.g. "7 of 9 settled". */
  detail?: string;
};

const numberFormat = new Intl.NumberFormat("en");

/**
 * A single-series column chart in plain HTML: thin columns grown from one
 * baseline, a hairline at the top value, a tooltip on hover or keyboard focus,
 * and a table view so no value is only reachable by hovering.
 */
export function ColumnChart({
  points,
  title,
  unit,
  barClassName = "bg-primary",
  className,
}: {
  points: readonly ColumnPoint[];
  /** Names the series for the table view and screen readers. */
  title: string;
  unit: string;
  barClassName?: string;
  className?: string;
}) {
  const max = Math.max(...points.map((point) => point.value), 0);
  const hasDetail = points.some((point) => point.detail);
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

  return (
    <figure className={cn("space-y-2", className)}>
      <div className="relative">
        <div className="flex items-baseline justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>{max > 0 ? `${numberFormat.format(max)} ${unit}` : `No ${unit} yet`}</span>
        </div>
        <div className="relative mt-1 h-28 border-t border-b border-border/70">
          <div className="absolute inset-0 flex items-end gap-0.5">
            {points.map((point, index) => (
              <div
                key={`${point.label}-${index}`}
                tabIndex={0}
                aria-label={`${point.label}: ${numberFormat.format(point.value)} ${unit}${point.detail ? `, ${point.detail}` : ""}`}
                className="group/col relative flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:bg-muted/60 hover:bg-muted/40"
              >
                {point.value > 0 && (
                  <div
                    className={cn("w-full max-w-6 rounded-t-[4px]", barClassName)}
                    style={{ height: `${Math.max((point.value / max) * 100, 3)}%` }}
                  />
                )}
                <div
                  role="tooltip"
                  className={cn(
                    // Edge columns anchor their tooltip inward so the card never clips it.
                    index < points.length / 3 ? "left-0" : index >= (points.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                    "pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md group-hover/col:block group-focus-visible/col:block",
                  )}
                >
                  <span className="font-medium">{numberFormat.format(point.value)}</span> {unit}
                  <span className="block text-muted-foreground">Week of {point.label}</span>
                  {point.detail && <span className="block text-muted-foreground">{point.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-1 flex gap-0.5 text-[11px] text-muted-foreground" aria-hidden>
          {points.map((point, index) => (
            <span key={`${point.label}-axis-${index}`} className="flex-1 truncate text-center">
              {labelIndexes.has(index) ? point.label : ""}
            </span>
          ))}
        </div>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as table</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">{title}</caption>
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Week of</th>
              <th className="py-1 text-right font-medium">{unit}</th>
              {hasDetail && <th className="py-1 pl-3 text-right font-medium">Detail</th>}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {points.map((point, index) => (
              <tr key={`${point.label}-row-${index}`} className="border-t border-border/60">
                <td className="py-1">{point.label}</td>
                <td className="py-1 text-right">{numberFormat.format(point.value)}</td>
                {hasDetail && <td className="py-1 pl-3 text-right text-muted-foreground">{point.detail}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** A tiny unlabeled column strip for a row that already names its series. */
export function MiniColumns({ values, barClassName, label }: { values: readonly number[]; barClassName: string; label: string }) {
  const max = Math.max(...values, 0);
  return (
    <div role="img" aria-label={label} className="flex h-8 w-full items-end gap-0.5 border-b border-border/70">
      {values.map((value, index) => (
        <div key={index} className="flex h-full flex-1 items-end justify-center">
          {value > 0 && <div className={cn("w-full max-w-3 rounded-t-[3px]", barClassName)} style={{ height: `${Math.max((value / max) * 100, 8)}%` }} />}
        </div>
      ))}
    </div>
  );
}
