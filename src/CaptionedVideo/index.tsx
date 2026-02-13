import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  cancelRender,
  getStaticFiles,
  OffthreadVideo,
  useDelayRender,
  watchStaticFile,
} from "remotion";
import { z } from "zod";
import SubtitlePage from "./SubtitlePage";
import { getVideoMetadata } from "@remotion/media-utils";
import { loadFont } from "../load-font";
import { NoCaptionFile } from "./NoCaptionFile";
import { Caption } from "@remotion/captions";

export type SubtitleProp = {
  startInSeconds: number;
  text: string;
};

// Extended caption type with word-level tokens
export type CaptionWithTokens = Caption & {
  tokens?: Array<{
    text: string;
    startMs: number;
    endMs: number;
  }>;
};

export const captionedVideoSchema = z.object({
  src: z.string(),
});

export const calculateCaptionedVideoMetadata: CalculateMetadataFunction<
  z.infer<typeof captionedVideoSchema>
> = async ({ props }) => {
  const fps = 30;
  const metadata = await getVideoMetadata(props.src);

  return {
    fps,
    durationInFrames: Math.floor(metadata.durationInSeconds * fps),
  };
};

const getFileExists = (file: string) => {
  const files = getStaticFiles();
  const fileExists = files.find((f) => {
    return f.src === file;
  });
  return Boolean(fileExists);
};

// Smart word grouping: 1 word at a time, unless both are ≤3 chars
const createSmartChunks = (text: string): string[] => {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const currentWord = words[i];
    const nextWord = words[i + 1];

    // Check if both current and next are short (≤3 chars)
    if (nextWord && currentWord.length <= 3 && nextWord.length <= 3) {
      // Group them together
      chunks.push(`${currentWord} ${nextWord}`);
      i += 2; // Skip both words
    } else {
      // Show current word alone
      chunks.push(currentWord);
      i += 1;
    }
  }

  return chunks;
};

// Create TikTok-style captions with smart word grouping
const createSmartTikTokCaptions = (captions: Caption[]) => {
  const pages: Array<{
    text: string;
    startMs: number;
    endMs: number;
    durationMs: number;
    tokens: Array<{ text: string; fromMs: number; toMs: number }>;
  }> = [];

  for (const caption of captions) {
    const { startMs, endMs, text } = caption;
    const durationMs = endMs - startMs;

    // Create smart chunks
    const chunks = createSmartChunks(text);

    // Distribute time evenly across chunks
    const timePerChunk = durationMs / chunks.length;

    const tokens = chunks.map((chunk, index) => ({
      text: chunk,
      fromMs: startMs + Math.floor(index * timePerChunk),
      toMs: startMs + Math.floor((index + 1) * timePerChunk),
    }));

    pages.push({
      text,
      startMs,
      endMs,
      durationMs,
      tokens,
    });
  }

  return { pages };
};

// How many captions should be displayed at a time?
// Try out:
// - 1500 to display a lot of words at a time
// - 200 to only display 1 word at a time
// Note: This is now handled by smart word grouping logic

export const CaptionedVideo: React.FC<{
  src: string;
}> = ({ src }) => {
  const [subtitles, setSubtitles] = useState<CaptionWithTokens[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const subtitlesFile = src
    .replace(/.mp4$/, ".json")
    .replace(/.mkv$/, ".json")
    .replace(/.mov$/, ".json")
    .replace(/.webm$/, ".json");

  const fetchSubtitles = useCallback(async () => {
    try {
      await loadFont();
      const res = await fetch(subtitlesFile);
      const data = (await res.json()) as CaptionWithTokens[];
      setSubtitles(data);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, handle, subtitlesFile]);

  useEffect(() => {
    fetchSubtitles();

    const c = watchStaticFile(subtitlesFile, () => {
      fetchSubtitles();
    });

    return () => {
      c.cancel();
    };
  }, [fetchSubtitles, src, subtitlesFile]);

  const { pages } = useMemo(() => {
    // If captions already have tokens (from SRT conversion), use them directly
    if (subtitles && subtitles.length > 0 && (subtitles[0] as CaptionWithTokens).tokens) {
      const tokenCaptions = subtitles as CaptionWithTokens[];
      // Convert our tokens to TikTokPage format
      return {
        pages: tokenCaptions.map((caption) => ({
          text: caption.text,
          startMs: caption.startMs,
          endMs: caption.endMs,
          durationMs: caption.endMs - caption.startMs,
          tokens: caption.tokens!.map((token) => ({
            text: token.text,
            fromMs: token.startMs,
            toMs: token.endMs,
          })),
        })),
      };
    }
    // Otherwise use smart word grouping
    return createSmartTikTokCaptions(subtitles ?? []);
  }, [subtitles]);

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <AbsoluteFill>
        <OffthreadVideo
          style={{
            objectFit: "cover",
          }}
          src={src}
        />
      </AbsoluteFill>
      {pages.map((page, index) => (
        <SubtitlePage key={index} page={page} />
      ))}
      {getFileExists(subtitlesFile) ? null : <NoCaptionFile />}
    </AbsoluteFill>
  );
};
