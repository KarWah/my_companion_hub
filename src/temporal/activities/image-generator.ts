// src/temporal/activities/image-generator.ts

import { workflowLogger, startTimer } from '@/lib/logger';
import { env } from '@/lib/env';
import { uploadImage } from '@/lib/storage';

/**
 * Calls the Stable Diffusion API with a pre-built prompt and uploads the result.
 *
 * Prompt construction is handled entirely by generateSDPrompt (sd-prompt-generator.ts)
 * which uses a dedicated LLM to craft a contextually accurate, properly weighted
 * SD prompt from the full conversation context.
 *
 * @param companionId - Used for the image upload path
 * @param positive    - Full positive SD prompt (LLM-generated)
 * @param negative    - Full negative SD prompt (LLM-generated)
 * @param cfg_scale   - CFG scale from checkpoint config
 * @param steps       - Sampling steps from checkpoint config
 * @returns URL of the uploaded generated image
 */
export async function generateCompanionImage(
  companionId: string,
  positive: string,
  negative: string,
  cfg_scale: number,
  steps: number,
): Promise<string> {
  const log = workflowLogger.child({ activity: 'generateCompanionImage', companionId });
  const timer = startTimer();

  const baseUrl = env.SD_API_URL.replace(/\/$/, '');
  const apiUrl = `${baseUrl}/sdapi/v1/txt2img`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.NOVITA_KEY) {
    headers['Authorization'] = `Bearer ${process.env.NOVITA_KEY}`;
  }

  log.debug({ apiUrl, hasAuth: !!headers['Authorization'], promptLength: positive.length }, 'Sending generation request');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: positive,
        negative_prompt: negative,
        steps,
        cfg_scale,
        width: 832,
        height: 1216,
        sampler_name: 'DPM++ 2M',
        scheduler: 'karras',
        seed: -1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, apiUrl, errorText }, 'Stable Diffusion API error');
      throw new Error(`SD API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const base64Image = `data:image/jpeg;base64,${data.images[0]}`;

    const uploadResult = await uploadImage(base64Image, companionId, 'companion-generated');

    log.info({ duration: timer(), url: uploadResult.url }, 'Image generation success');
    return uploadResult.url;

  } catch (error) {
    log.error({ error, duration: timer() }, 'Image generation failed');
    throw error;
  }
}
