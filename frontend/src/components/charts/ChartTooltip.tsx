'use client';

import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string | number;
  }>;
  formatter?: (value: number | string, name: string) => string;
  labelFormatter?: (label: string | number) => string;
}

export default function ChartTooltip({ active, label, payload, formatter, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[160px] rounded-xl border border-border bg-popover/95 backdrop-blur-sm px-3.5 py-2.5 shadow-lg">
      {label !== undefined && (
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined)
          .map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-popover-foreground/80 font-medium">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-bold text-popover-foreground tabular-nums">
                {formatter ? formatter(entry.value as number, entry.name || '') : entry.value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
