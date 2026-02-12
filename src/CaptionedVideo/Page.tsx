import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TikTokPage } from "@remotion/captions";

export const Page: React.FC<{
  readonly page: TikTokPage;
}> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  // Find THE active chunk (1-2 words)
  const activeToken = page.tokens.find(
    (t) => t.fromMs <= timeInMs && t.toMs > timeInMs
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: `${(height * 2) / 3}px`,
      }}
    >
      {activeToken && (
        <div
          style={{
            fontSize: "110px", // VERY large like the image
            fontWeight: 900,
            fontFamily: "Arial Black, Impact, sans-serif", // Bold blocky font
            textTransform: "uppercase",
            color: "white",
            WebkitTextStroke: "12px black", // THICK black outline
            paintOrder: "stroke fill",
            textAlign: "center",
            background: "transparent",
            padding: "0 20px", // Side padding for long words
            width: "100%",
            display: "block",
            letterSpacing: "1px",
            lineHeight: "1.1", // Tight line height
          }}
        >
          {activeToken.text}
        </div>
      )}
    </AbsoluteFill>
  );
};