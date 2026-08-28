"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 22 });
  const display = useTransform(spring, (v) =>
    `${prefix}${v.toFixed(decimals)}${suffix}`
  );
  const [text, setText] = useState(`${prefix}0${suffix}`);

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v));
    return () => unsub();
  }, [display]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

export function BallotLoader({ label = "Elaborazione…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2" role="status" aria-live="polite">
      <svg
        className="ballot-loader h-10 w-10 text-[var(--it-blue)]"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        <rect
          x="10"
          y="8"
          width="28"
          height="32"
          rx="3"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="rgba(37,99,235,0.15)"
        />
        <path
          d="M16 18h16M16 24h12M16 30h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="34" cy="36" r="6" fill="#009246" />
        <path
          d="M31.5 36l1.5 1.5 3.5-3.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-sm text-[var(--muted)]">{label}</span>
    </div>
  );
}

export function ItalySilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 360"
      className={className}
      aria-hidden
      fill="none"
    >
      <defs>
        <linearGradient id="itFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#009246" stopOpacity="0.35" />
          <stop offset="45%" stopColor="#2563EB" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#CE2B37" stopOpacity="0.4" />
        </linearGradient>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Stylized Italy peninsula + islands */}
      <path
        className="italy-pulse"
        filter="url(#softGlow)"
        fill="url(#itFill)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
        d="M118 18c8 4 18 14 22 28 3 12 2 22-2 34 6 2 14 8 18 16 6 12 4 28-2 40 8 6 16 18 14 32-2 12-12 22-22 28 4 10 6 24 2 34-4 12-16 22-28 26 2 14-2 30-12 40-8 8-20 12-30 10-6 8-16 14-26 12-12-2-18-14-16-26-10 0-22-8-26-20-4-14 2-28 12-36-8-8-12-22-8-34 4-12 16-20 28-22-2-12 2-26 12-34 8-6 18-8 28-6 2-10 8-20 18-26 8-4 16-4 22-2z"
      />
      <ellipse
        className="italy-pulse"
        cx="78"
        cy="268"
        rx="22"
        ry="14"
        fill="url(#itFill)"
        stroke="rgba(255,255,255,0.2)"
        opacity="0.85"
      />
      <ellipse
        className="italy-pulse"
        cx="62"
        cy="310"
        rx="28"
        ry="16"
        fill="url(#itFill)"
        stroke="rgba(255,255,255,0.2)"
        opacity="0.8"
      />
      {/* Data nodes */}
      {[
        [130, 70],
        [150, 120],
        [140, 170],
        [125, 220],
        [110, 260],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="3.5"
          fill="#2563EB"
          className="italy-pulse"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  );
}
