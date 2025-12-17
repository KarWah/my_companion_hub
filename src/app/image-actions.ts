"use server";

import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { checkImageGenerationRateLimit } from "@/lib/rate-limit-db";
import type { ActionResult, SDGenerationParams } from "@/types/prisma";

export async function generateImage(params: SDGenerationParams): Promise<ActionResult<{ imageUrl: string }>> {
  try {
    // Verify user is authenticated
    const user = await getAuthenticatedUser();

    // Rate limiting check
    const rateLimit = await checkImageGenerationRateLimit(user.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Image generation rate limit exceeded" };
    }

    const response = await fetch(`${process.env.SD_API_URL}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: params.prompt,
        negative_prompt: params.negative_prompt,
        steps: params.steps,
        width: params.width,
        height: params.height,
        sampler_name: params.sampler_name,
        cfg_scale: params.cfg_scale,
        seed: params.seed
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("SD API Error:", error);
      return { success: false, error: `Image generation failed: ${error}` };
    }

    const data = await response.json();
    const imageUrl = `data:image/png;base64,${data.images[0]}`;

    return {
      success: true,
      data: { imageUrl }
    };
  } catch (error) {
    console.error("Image generation error:", error);
    return {
      success: false,
      error: "Failed to generate image. Please check your SD Forge connection."
    };
  }
}
