import React from "react";
import { AbsoluteFill } from "remotion";
import { Page } from "./Page";
import { TikTokPage } from "@remotion/captions";

const SubtitlePage: React.FC<{ readonly page: TikTokPage }> = ({ page }) => {
  return (
    <AbsoluteFill>
      <Page page={page} />
    </AbsoluteFill>
  );
};

export default SubtitlePage;
