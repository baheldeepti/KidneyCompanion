// ElevenLabs TTS integration (via Replit connector)
import { ElevenLabsClient } from 'elevenlabs';

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - warm, caring medical voice

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('ElevenLabs connector token not available');
  }

  const res = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=elevenlabs',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  const data = await res.json();
  const connection = data.items?.[0];

  if (!connection || !connection.settings.api_key) {
    throw new Error('ElevenLabs not connected');
  }
  return connection.settings.api_key;
}

export async function textToSpeech(text: string): Promise<Buffer> {
  const apiKey = await getCredentials();
  const client = new ElevenLabsClient({ apiKey });

  const audioStream = await client.textToSpeech.convert(VOICE_ID, {
    text,
    model_id: "eleven_flash_v2_5",
    voice_settings: {
      stability: 0.65,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true,
    },
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
