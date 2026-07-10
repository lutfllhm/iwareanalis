'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  height?: string;
}

export function ChartCard({ title, subtitle, badge, children, height = 'h-72' }: ChartCardProps) {
  return (
    <div className="bg-card border border-border/60 hover:border-border rounded-2xl p-5 shadow-sm transition-colors duration-300">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className={`${height} w-full`}>{children}</div>
    </div>
  );
}

interface ChartStateProps {
  icon?: LucideIcon;
  message: string;
}

export function ChartLoadingState({ message = 'Memuat data...' }: { message?: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2.5">
      <div className="flex items-end gap-1 h-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-primary/40 animate-pulse"
            style={{
              height: `${40 + (i % 3) * 20}%`,
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

export function ChartEmptyState({ icon: Icon, message }: ChartStateProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-center px-4">
      {Icon && <Icon size={28} className="text-muted-foreground/40" />}
      <p className="text-xs text-muted-foreground font-medium">{message}</p>
    </div>
  );
}
