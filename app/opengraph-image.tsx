import { ImageResponse } from "next/og";
import { projects } from "@/lib/projects";

export const alt = "King of Hyperliquid — Vote the best front-end";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const count = projects.length;
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 80px",
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(151,252,228,0.35), transparent 65%), radial-gradient(ellipse 60% 40% at 110% 110%, rgba(151,252,228,0.18), transparent 65%), #050605",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#97fce4",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#97fce4",
              boxShadow: "0 0 18px rgba(151,252,228,0.9)",
            }}
          />
          Live community poll
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 124,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#ffffff" }}>King of&nbsp;</span>
          <span style={{ color: "#97fce4" }}>Hyperliquid</span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 600,
            letterSpacing: -1,
            color: "#a1a1aa",
          }}
        >
          Who&apos;s the best front-end?
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 28, color: "#71717a" }}>
            {count} contenders · One vote each
          </div>
          <div
            style={{
              display: "flex",
              padding: "16px 28px",
              borderRadius: 999,
              background: "#97fce4",
              color: "#050605",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            Cast your vote →
          </div>
        </div>
      </div>
    ),
    size,
  );
}
