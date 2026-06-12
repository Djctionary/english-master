"use client";

import { useMemo, useState } from "react";
import type { ProgressData, ProgressPoint } from "@/lib/types";

const VIEW_W = 760;
const VIEW_H = 340;
const PAD_L = 44;
const PAD_R = 44;
const PAD_T = 24;
const PAD_B = 48;

const PLOT_X0 = PAD_L;
const PLOT_X1 = VIEW_W - PAD_R;
const PLOT_Y0 = PAD_T;
const PLOT_Y1 = VIEW_H - PAD_B;
const PLOT_W = PLOT_X1 - PLOT_X0;
const PLOT_H = PLOT_Y1 - PLOT_Y0;

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
  const [hovered, setHovered] = useState<number | null>(null);

  const { points } = data;
  const n = points.length;

  const maxCumulative = useMemo(
    () => niceMax(Math.max(1, ...points.map((p) => p.cumulative))),
    [points]
  );
  const maxDaily = useMemo(
    () => niceMax(Math.max(1, ...points.map((p) => Math.max(p.added, p.dueForecast)))),
    [points]
  );

  const slotW = PLOT_W / Math.max(1, n);
  const barW = Math.max(2, Math.min(9, slotW * 0.3));

  const cx = (i: number) => PLOT_X0 + slotW * (i + 0.5);
  const yCumulative = (v: number) => PLOT_Y1 - (v / maxCumulative) * PLOT_H;
  const yDaily = (v: number) => PLOT_Y1 - (v / maxDaily) * PLOT_H;

  const todayIndex = points.findIndex((p) => p.isToday);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${cx(i).toFixed(1)} ${yCumulative(p.cumulative).toFixed(1)}`)
    .join(" ");

  const areaPath =
    `M ${cx(0).toFixed(1)} ${PLOT_Y1} ` +
    points.map((p, i) => `L ${cx(i).toFixed(1)} ${yCumulative(p.cumulative).toFixed(1)}`).join(" ") +
    ` L ${cx(n - 1).toFixed(1)} ${PLOT_Y1} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const xLabelStep = Math.max(1, Math.ceil(n / 8));

  const hoveredPoint: ProgressPoint | null = hovered != null ? points[hovered] : null;
  const tooltipLeftPct =
    hovered != null ? ((cx(hovered) / VIEW_W) * 100).toFixed(2) : "0";
  const tooltipFlip = hovered != null && cx(hovered) > VIEW_W * 0.6;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        role="img"
        aria-label="Learning progress over time"
        style={{ display: "block", overflow: "visible" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid + left (cumulative) axis labels */}
        {gridLines.map((t) => {
          const y = PLOT_Y1 - t * PLOT_H;
          return (
            <g key={t}>
              <line
                x1={PLOT_X0}
                x2={PLOT_X1}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text
                x={PLOT_X0 - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="var(--color-text-muted)"
              >
                {Math.round(maxCumulative * t)}
              </text>
              <text
                x={PLOT_X1 + 8}
                y={y + 3}
                textAnchor="start"
                fontSize={10}
                fill="var(--color-text-muted)"
              >
                {Math.round(maxDaily * t)}
              </text>
            </g>
          );
        })}

        {/* Today divider */}
        {todayIndex >= 0 && (
          <g>
            <line
              x1={cx(todayIndex)}
              x2={cx(todayIndex)}
              y1={PLOT_Y0 - 6}
              y2={PLOT_Y1}
              stroke="var(--color-border-strong)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={cx(todayIndex)}
              y={PLOT_Y0 - 10}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="var(--color-text-secondary)"
            >
              Today
            </text>
          </g>
        )}

        {/* Cumulative area + line (left scale) */}
        <path d={areaPath} fill="var(--color-primary)" opacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Daily bars (right scale) */}
        {points.map((p, i) => {
          const center = cx(i);
          const addedH = p.added > 0 ? PLOT_Y1 - yDaily(p.added) : 0;
          const dueH = p.dueForecast > 0 ? PLOT_Y1 - yDaily(p.dueForecast) : 0;
          const dueColor = p.isToday
            ? "var(--color-error)"
            : "var(--color-warning)";
          return (
            <g key={p.date}>
              {addedH > 0 && (
                <rect
                  x={center - barW - 1}
                  y={yDaily(p.added)}
                  width={barW}
                  height={addedH}
                  rx={1.5}
                  fill="var(--color-success)"
                />
              )}
              {dueH > 0 && (
                <rect
                  x={center + 1}
                  y={yDaily(p.dueForecast)}
                  width={barW}
                  height={dueH}
                  rx={1.5}
                  fill={dueColor}
                />
              )}
            </g>
          );
        })}

        {/* Cumulative dot on hover */}
        {hoveredPoint && hovered != null && (
          <circle
            cx={cx(hovered)}
            cy={yCumulative(hoveredPoint.cumulative)}
            r={3.5}
            fill="var(--color-primary)"
            stroke="var(--color-surface)"
            strokeWidth={1.5}
          />
        )}

        {/* X axis labels */}
        {points.map((p, i) =>
          i % xLabelStep === 0 || p.isToday ? (
            <text
              key={`x-${p.date}`}
              x={cx(i)}
              y={PLOT_Y1 + 16}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-text-muted)"
            >
              {formatDay(p.date)}
            </text>
          ) : null
        )}

        {/* Hover capture columns */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.date}`}
            x={PLOT_X0 + slotW * i}
            y={PLOT_Y0}
            width={slotW}
            height={PLOT_H}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((cur) => (cur === i ? null : cur))}
            style={{ cursor: "pointer" }}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            top: 8,
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
          <div
            style={{
              fontWeight: 600,
              marginBottom: 4,
              color: "var(--color-text-secondary)",
            }}
          >
            {formatDay(hoveredPoint.date)}
            {hoveredPoint.isToday ? " · Today" : hoveredPoint.isFuture ? " · Upcoming" : ""}
          </div>
          <TooltipRow color="var(--color-primary)" label="Cumulative learned" value={hoveredPoint.cumulative} />
          <TooltipRow color="var(--color-success)" label="Learned that day" value={hoveredPoint.added} />
          <TooltipRow
            color={hoveredPoint.isToday ? "var(--color-error)" : "var(--color-warning)"}
            label={hoveredPoint.isToday ? "Due now" : "Due to review"}
            value={hoveredPoint.dueForecast}
          />
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-lg)",
          justifyContent: "center",
          marginTop: "var(--space-md)",
        }}
      >
        <LegendItem color="var(--color-primary)" label="Cumulative learned" shape="line" />
        <LegendItem color="var(--color-success)" label="Learned that day" shape="bar" />
        <LegendItem color="var(--color-warning)" label="Due to review" shape="bar" />
        <LegendItem color="var(--color-error)" label="Due now (overdue)" shape="bar" />
      </div>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, lineHeight: 1.6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ marginLeft: "auto", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function LegendItem({ color, label, shape }: { color: string; label: string; shape: "line" | "bar" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: shape === "line" ? 16 : 10,
          height: shape === "line" ? 3 : 10,
          borderRadius: shape === "line" ? 2 : 2,
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}
