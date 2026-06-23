"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProgressData, ProgressPoint } from "@/lib/types";

// Two stacked panels share one time axis (past 30 days through today). Each is a
// daily-count bar series with its OWN vertical scale, so the "reviewed per day"
// and "added per day" counts are both readable instead of one crushing the
// other. SVGs render at the measured pixel width so text stays crisp from phone
// to desktop.

const PAD_L = 34;
const PAD_R = 12;
const REVIEWED_H = 130; // "reviewed each day" panel plot height
const ADD_H = 96; // "added per day" panel plot height
const TOP_PAD = 14; // headroom above each plot for the max gridline label
const AXIS_H = 20; // x-axis label strip under the bottom panel

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const scaled = value / pow;
  const step = scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * pow;
}

function formatDay(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export default function ProgressChart({ data }: { data: ProgressData }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { points } = data;
  const n = points.length;

  const plotW = Math.max(1, width - PAD_L - PAD_R);
  const slotW = plotW / Math.max(1, n);
  const barW = Math.max(2, Math.min(20, slotW * 0.62));

  const maxReviewed = useMemo(
    () => niceMax(Math.max(1, ...points.map((p) => p.reviewed))),
    [points]
  );
  const maxAdded = useMemo(
    () => niceMax(Math.max(1, ...points.map((p) => p.added))),
    [points]
  );

  const cx = (i: number) => PAD_L + slotW * (i + 0.5);

  // Roughly one x label per ~64px of width, plus always the last (today).
  const xLabelStep = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(width / 64))));

  const lastIdx = n - 1;

  const hoveredPoint: ProgressPoint | null = hovered != null ? points[hovered] : null;
  const tooltipLeftPct = hovered != null ? ((cx(hovered) / width) * 100).toFixed(2) : "0";
  const tooltipFlip = hovered != null && cx(hovered) > width * 0.6;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <BarPanel
        title="Sentences reviewed each day"
        points={points}
        getValue={(p) => p.reviewed}
        max={maxReviewed}
        plotH={REVIEWED_H}
        color="var(--color-primary)"
        todayColor="var(--color-error)"
        width={width}
        slotW={slotW}
        barW={barW}
        cx={cx}
        hovered={hovered}
        setHovered={setHovered}
        showXLabels={false}
        xLabelStep={xLabelStep}
        lastIdx={lastIdx}
      />

      <BarPanel
        title="Sentences added each day"
        style={{ marginTop: "var(--space-md)" }}
        points={points}
        getValue={(p) => p.added}
        max={maxAdded}
        plotH={ADD_H}
        color="var(--color-success)"
        todayColor="var(--color-success)"
        width={width}
        slotW={slotW}
        barW={barW}
        cx={cx}
        hovered={hovered}
        setHovered={setHovered}
        showXLabels
        xLabelStep={xLabelStep}
        lastIdx={lastIdx}
      />

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${tooltipLeftPct}%`,
            transform: `translateX(${tooltipFlip ? "-100%" : "0"}) translateX(${tooltipFlip ? "-8px" : "8px"})`,
            pointerEvents: "none",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: "var(--space-sm) var(--space-md)",
            fontSize: "var(--text-caption)",
            color: "var(--color-text)",
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--color-text-secondary)" }}>
            {hoveredPoint.isToday ? "Today" : formatDay(hoveredPoint.date)}
          </div>
          <TooltipRow color="var(--color-primary)" label="Reviewed that day" value={hoveredPoint.reviewed} />
          <TooltipRow color="var(--color-success)" label="Added that day" value={hoveredPoint.added} />
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-lg)",
          justifyContent: "center",
          marginTop: "var(--space-lg)",
        }}
      >
        <LegendItem color="var(--color-primary)" label="Reviewed each day" />
        <LegendItem color="var(--color-success)" label="Added each day" />
      </div>
    </div>
  );
}

function BarPanel({
  title,
  style,
  points,
  getValue,
  max,
  plotH,
  color,
  todayColor,
  width,
  slotW,
  barW,
  cx,
  hovered,
  setHovered,
  showXLabels,
  xLabelStep,
  lastIdx,
}: {
  title: string;
  style?: React.CSSProperties;
  points: ProgressPoint[];
  getValue: (p: ProgressPoint) => number;
  max: number;
  plotH: number;
  color: string;
  todayColor: string;
  width: number;
  slotW: number;
  barW: number;
  cx: (i: number) => number;
  hovered: number | null;
  setHovered: (updater: number | null | ((cur: number | null) => number | null)) => void;
  showXLabels: boolean;
  xLabelStep: number;
  lastIdx: number;
}) {
  const svgH = TOP_PAD + plotH + (showXLabels ? AXIS_H : 6);
  const y = (v: number) => TOP_PAD + plotH - (v / max) * plotH;
  const gridT = [0, 0.5, 1];

  return (
    <div style={style}>
      <PanelLabel>{title}</PanelLabel>
      <svg
        viewBox={`0 0 ${width} ${svgH}`}
        width="100%"
        height={svgH}
        role="img"
        aria-label={title}
        style={{ display: "block", overflow: "visible" }}
      >
        {gridT.map((t) => {
          const gy = TOP_PAD + plotH - t * plotH;
          return (
            <g key={t}>
              <line
                x1={PAD_L}
                x2={width - PAD_R}
                y1={gy}
                y2={gy}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text x={PAD_L - 8} y={gy + 3} textAnchor="end" fontSize={11} fill="var(--color-text-muted)">
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          const v = getValue(p);
          if (v <= 0) return null;
          const h = TOP_PAD + plotH - y(v);
          const active = hovered === i;
          return (
            <rect
              key={p.date}
              x={cx(i) - barW / 2}
              y={y(v)}
              width={barW}
              height={h}
              rx={Math.min(2, barW / 3)}
              fill={p.isToday ? todayColor : color}
              opacity={hovered == null || active ? 1 : 0.45}
            />
          );
        })}

        {showXLabels &&
          points.map((p, i) =>
            i % xLabelStep === 0 || i === lastIdx ? (
              <text
                key={`x-${p.date}`}
                x={cx(i)}
                y={TOP_PAD + plotH + 14}
                textAnchor="middle"
                fontSize={10}
                fontWeight={p.isToday ? 600 : 400}
                fill={p.isToday ? "var(--color-text-secondary)" : "var(--color-text-muted)"}
              >
                {p.isToday ? "Today" : formatDay(p.date)}
              </text>
            ) : null
          )}

        {/* Hover capture columns */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.date}`}
            x={PAD_L + slotW * i}
            y={0}
            width={slotW}
            height={TOP_PAD + plotH}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((cur) => (cur === i ? null : cur))}
            style={{ cursor: "pointer" }}
          />
        ))}
      </svg>
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "var(--text-caption)",
        fontWeight: 600,
        color: "var(--color-text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: "var(--space-2xs, 4px)",
      }}
    >
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, lineHeight: 1.6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ marginLeft: "auto", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
      <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-secondary)" }}>{label}</span>
    </div>
  );
}
