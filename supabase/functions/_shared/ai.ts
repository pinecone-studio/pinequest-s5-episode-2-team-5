import { GoogleGenAI } from 'npm:@google/genai@2.29.1';
import { openAiCompatibleText, type AiConfig } from './ai-text.ts';

/** One text answer from the configured AI (see ai-text.ts for how it is chosen). */
export async function generateText(config: AiConfig, system: string, input: string): Promise<string> {
  if (config.provider === 'openai') return openAiCompatibleText(config, system, input);
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const interaction = await ai.interactions.create({ model: config.model, store: false, system_instruction: system, input });
  return interaction.output_text ?? '';
}
