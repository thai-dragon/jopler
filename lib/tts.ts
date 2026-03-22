const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const TTS_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-tts:generateContent";

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);
  let offset = 0;

  buffer.write("RIFF", offset);
  offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset);
  offset += 4;
  buffer.write("WAVE", offset);
  offset += 4;
  buffer.write("fmt ", offset);
  offset += 4;
  buffer.writeUInt32LE(16, offset);
  offset += 4;
  buffer.writeUInt16LE(1, offset);
  offset += 2;
  buffer.writeUInt16LE(numChannels, offset);
  offset += 2;
  buffer.writeUInt32LE(sampleRate, offset);
  offset += 4;
  buffer.writeUInt32LE(byteRate, offset);
  offset += 4;
  buffer.writeUInt16LE(numChannels * 2, offset);
  offset += 2;
  buffer.writeUInt16LE(16, offset);
  offset += 2;
  buffer.write("data", offset);
  offset += 4;
  buffer.writeUInt32LE(dataSize, offset);
  offset += 4;
  pcmBuffer.copy(buffer, offset);

  return buffer;
}

export async function generateTTSBuffer(text: string): Promise<Buffer> {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY not configured");
  }

  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GOOGLE_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: text.slice(0, 8000) }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `TTS failed: ${res.status}`);
  }

  const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) {
    throw new Error("No audio in response");
  }

  const pcm = Buffer.from(b64, "base64");
  return pcmToWav(pcm);
}
