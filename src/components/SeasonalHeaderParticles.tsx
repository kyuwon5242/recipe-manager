import type { CSSProperties } from "react";
import { currentSeason, type Season } from "@/lib/season";

type Particle = {
  left: string;
  top?: string;
  delay: string;
  duration: string;
  size: string;
  drift: string;
  spin: string;
};

// Math.random()はサーバー/クライアントで値が変わりhydration不一致を起こす
// ため、index由来の決定的な計算でばらけた見た目を作る(見た目は毎回同じで
// 問題ない演出用途のため)。
function buildFallingParticles(count: number, seed: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const left = (i * 37 + seed * 13) % 100;
    const duration = 7 + ((i * 5 + seed) % 6);
    const delay = -(((i * 3 + seed * 2) % (duration * 10)) / 10);
    const drift = ((i * 17 + seed) % 40) - 20;
    const spin = ((i * 29 + seed) % 160) - 80;
    const size = 10 + ((i * 7 + seed) % 7);
    return {
      left: `${left}%`,
      delay: `${delay}s`,
      duration: `${duration}s`,
      size: `${size}px`,
      drift: `${drift}px`,
      spin: `${spin}deg`,
    };
  });
}

function buildTwinkleParticles(count: number, seed: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const left = (i * 23 + seed * 11) % 100;
    const top = 15 + ((i * 19 + seed) % 60);
    const duration = 2.4 + ((i * 3 + seed) % 3);
    const delay = -(((i * 2 + seed) % (duration * 10)) / 10);
    const size = 8 + ((i * 5 + seed) % 5);
    return {
      left: `${left}%`,
      top: `${top}%`,
      delay: `${delay}s`,
      duration: `${duration}s`,
      size: `${size}px`,
      drift: "0px",
      spin: "0deg",
    };
  });
}

const SEASON_GLYPH: Record<Season, string> = {
  spring: "🌸",
  summer: "🫧",
  autumn: "🍁",
  winter: "❄️",
};

// ヘッダー背景にその季節らしい要素(桜・泡・落ち葉・雪)をうっすらと漂わせる
// 演出。主張しすぎないよう、個数・不透明度・サイズを控えめにしている
// (prefers-reduced-motionでは静止させる。globals.css参照)。
export function SeasonalHeaderParticles() {
  const season = currentSeason();
  const isTwinkle = season === "summer";
  const particles = isTwinkle ? buildTwinkleParticles(6, 3) : buildFallingParticles(7, 5);
  const glyph = SEASON_GLYPH[season];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className={isTwinkle ? "header-particle header-particle-twinkle" : "header-particle header-particle-fall"}
          style={
            {
              left: p.left,
              top: p.top ?? "-10%",
              fontSize: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              "--drift": p.drift,
              "--spin": p.spin,
            } as CSSProperties
          }
        >
          {glyph}
        </span>
      ))}
    </div>
  );
}
