/**
 * Convert SRT subtitle file to JSON format for Remotion
 * Run: node convert-srt.js
 */

const fs = require('fs');
const path = require('path');

function parseSRTTime(timeStr) {
  // Format: HH:MM:SS,mmm
  const timePart = timeStr.trim();
  const [time, ms] = timePart.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + parseInt(ms, 10);
}

function convertSRTtoJSON(srtPath, jsonPath) {
  // Read and normalize line endings
  let srtContent = fs.readFileSync(srtPath, 'utf-8');
  srtContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into blocks (separated by double newlines)
  const blocks = srtContent.trim().split(/\n\n+/);
  
  const captions = blocks.map(block => {
    const lines = block.split('\n');
    if (lines.length < 3) return null;
    
    // Line 0: index (e.g., "1")
    // Line 1: timestamps (e.g., "00:00:00,000 --> 00:00:03,459")
    // Line 2+: text
    const timeLine = lines[1];
    const textLines = lines.slice(2);
    
    const [startTime, endTime] = timeLine.split(' --> ');
    
    if (!startTime || !endTime) return null;
    
    const startMs = parseSRTTime(startTime);
    const endMs = parseSRTTime(endTime);
    const text = textLines.join(' ').replace(/<[^>]+>/g, ''); // Remove HTML tags
    
    // Split text into words and group into 1-2 word chunks (like TikTok/Reels)
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const chunks = [];
    
    // Group words into pairs (1-2 words per chunk)
    for (let i = 0; i < words.length; i += 2) {
      const chunk = words.slice(i, i + 2).join(' ');
      chunks.push(chunk);
    }
    
    const durationMs = endMs - startMs;
    const chunkDurationMs = chunks.length > 0 ? durationMs / chunks.length : durationMs;
    
    // Create tokens array with chunk timings
    const tokens = chunks.map((chunk, index) => ({
      text: chunk,
      startMs: startMs + Math.floor(index * chunkDurationMs),
      endMs: startMs + Math.floor((index + 1) * chunkDurationMs)
    }));
    
    return {
      startMs,
      endMs,
      text,
      confidence: 1,
      tokens
    };
  }).filter(Boolean);
  
  fs.writeFileSync(jsonPath, JSON.stringify(captions, null, 2));
  console.log(`✓ Converted ${srtPath} -> ${jsonPath}`);
  console.log(`  ${captions.length} captions extracted`);
}

// Convert the sample video SRT
const srtPath = path.join(__dirname, 'public', 'sample-video.srt');
const jsonPath = path.join(__dirname, 'public', 'sample-video.json');

if (fs.existsSync(srtPath)) {
  convertSRTtoJSON(srtPath, jsonPath);
} else {
  console.error(`Error: SRT file not found at ${srtPath}`);
  process.exit(1);
}
