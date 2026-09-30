import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { providerFailure } from '../server/src/ai.js';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: `${root}server/.env`, quiet: true });
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;
if (!apiKey?.trim() || !/^gemini-[a-zA-Z0-9.-]+$/.test(model || '')) {
  console.error('NEEDS SETUP: Configure GEMINI_API_KEY and an explicit GEMINI_MODEL in the backend environment. No request sent.');
  process.exitCode = 1;
} else {
  try {
    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({ model, contents: 'Reply with OK.', config: { maxOutputTokens: 128, httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } } } });
    if (!result.text?.trim()) throw new Error('No provider text returned.');
    console.log(`PASS: Live generation succeeded using ${model}.`);
    console.log('The application flag was not changed. Enable AI_GENERATION_ENABLED and restart only when ready.');
  } catch (failure) {
    const safe = providerFailure(failure);
    console.error(`BLOCKED (${safe.code}): ${safe.message}`);
    console.error('AI_GENERATION_ENABLED and authentication configuration were not changed.');
    process.exitCode = 1;
  }
}
