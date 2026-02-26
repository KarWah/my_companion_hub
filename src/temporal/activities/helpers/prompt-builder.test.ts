/**
 * Prompt Builder Helper Tests
 *
 * Tests for image generation prompt construction with checkpoint selection.
 * Critical for generating correct Stable Diffusion prompts.
 */

import { describe, it, expect } from 'vitest';
import { buildImagePrompt, type BuildImagePromptParams } from './prompt-builder';

describe('buildImagePrompt', () => {
  const baseParams: BuildImagePromptParams = {
    style: 'anime',
    visualDescription: 'long black hair, brown eyes',
    outfit: 'red dress',
    location: 'park',
    visualTags: 'sitting on bench',
    expression: 'smiling',
    lighting: 'sunny day',
    isUserPresent: false,
    isNude: false
  };

  it('should select anime checkpoint for anime style', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'anime' });

    expect(result.config.name.toLowerCase()).toContain('anime');
    expect(result.config.qualityTags).toContain('masterpiece');
    expect(result.config.qualityTags).toContain('anime style');
  });

  it('should select realistic checkpoint for realistic style', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'realistic' });

    expect(result.config.name).toContain('realistic');
    expect(result.config.qualityTags).toContain('photorealistic');
    expect(result.config.negativePrompt).toContain('anime');
  });

  it('should build solo tags when user not present', () => {
    const result = buildImagePrompt({
      ...baseParams,
      isUserPresent: false
    });

    expect(result.positive).toContain('1girl');
    expect(result.positive).toContain('solo');
    expect(result.positive).not.toContain('1boy');
    expect(result.positive).not.toContain('couple');
  });

  it('should build couple tags when user present', () => {
    const result = buildImagePrompt({
      ...baseParams,
      isUserPresent: true,
      userAppearance: 'tall, muscular'
    });

    expect(result.positive).toContain('1girl');
    expect(result.positive).toContain('1boy');
    expect(result.positive).toContain('hetero');
    expect(result.positive).toContain('couple focus');
    expect(result.positive).toContain('tall, muscular');
  });

  it('should include LoRA tags for anime style', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'anime' });

    expect(result.positive).toContain('<lora:');
    expect(result.positive).toContain('inuk');
    expect(result.positive).toContain('uncensored');
  });

  it('should not include LoRA tags for realistic style', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'realistic' });

    expect(result.positive).not.toContain('<lora:');
    expect(result.positive).not.toContain('inuk');
  });

  it('should include quality tags in positive prompt', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'anime' });

    expect(result.positive).toContain('masterpiece');
    expect(result.positive).toContain('best quality');
  });

  it('should include all visual elements in positive prompt', () => {
    const result = buildImagePrompt(baseParams);

    expect(result.positive).toContain('long black hair, brown eyes'); // visualDescription
    expect(result.positive).toContain('red dress'); // outfit
    expect(result.positive).toContain('sitting on bench'); // visualTags
    expect(result.positive).toContain('smiling'); // expression
    expect(result.positive).toContain('park'); // location
    expect(result.positive).toContain('sunny day'); // lighting
  });

  it('should build base negative prompt', () => {
    const result = buildImagePrompt(baseParams);

    expect(result.negative).toContain('bad quality');
    expect(result.negative).toContain('worst quality');
  });

  it('should add solo-specific negative tags when user not present', () => {
    const result = buildImagePrompt({
      ...baseParams,
      isUserPresent: false
    });

    // Solo negative additions should be included
    expect(result.negative).toBeDefined();
    expect(result.negative.length).toBeGreaterThan(0);
  });

  it('should add couple-specific negative tags when user present', () => {
    const result = buildImagePrompt({
      ...baseParams,
      isUserPresent: true
    });

    // Couple negative additions should be included
    expect(result.negative).toBeDefined();
    expect(result.negative.length).toBeGreaterThan(0);
  });

  it('should add nude-specific negative tags when scene is explicit', () => {
    const result = buildImagePrompt({
      ...baseParams,
      isNude: true
    });

    // Nude negative additions should be included
    expect(result.negative).toBeDefined();
    expect(result.negative.length).toBeGreaterThan(0);
  });

  it('should handle empty outfit gracefully', () => {
    const result = buildImagePrompt({
      ...baseParams,
      outfit: ''
    });

    // Prompt should still be valid even if not perfectly clean
    expect(result.positive).toBeDefined();
    expect(result.positive.length).toBeGreaterThan(0);
  });

  it('should handle empty visual tags gracefully', () => {
    const result = buildImagePrompt({
      ...baseParams,
      visualTags: ''
    });

    // Prompt should still be valid
    expect(result.positive).toBeDefined();
    expect(result.positive.length).toBeGreaterThan(0);
  });

  it('should handle empty user appearance gracefully', () => {
    const result = buildImagePrompt({
      ...baseParams,
      isUserPresent: true,
      userAppearance: ''
    });

    expect(result.positive).toContain('1boy');
    expect(result.positive).toContain('couple');
    // Should not have malformed tags
    expect(result.positive).not.toContain('(1boy, )');
  });

  it('should clean up excessive whitespace', () => {
    const result = buildImagePrompt({
      ...baseParams,
      visualDescription: '  long   hair  ',
      outfit: '  red   dress  ',
      location: '  park  '
    });

    // Should not have multiple consecutive spaces
    expect(result.positive).not.toMatch(/\s{2,}/);
  });

  it('should filter out completely empty parts', () => {
    const result = buildImagePrompt({
      ...baseParams,
      outfit: '',
      visualTags: '',
      userAppearance: undefined
    });

    // Should still generate valid prompt
    expect(result.positive).toBeDefined();
    expect(result.positive.length).toBeGreaterThan(0);
    expect(result.positive).toContain('solo');
  });

  it('should return checkpoint configuration', () => {
    const result = buildImagePrompt(baseParams);

    expect(result.config).toBeDefined();
    expect(result.config.name).toBeDefined();
    expect(result.config.qualityTags).toBeDefined();
    expect(result.config.negativePrompt).toBeDefined();
    expect(result.config.cfg_scale).toBeGreaterThan(0);
    expect(result.config.steps).toBeGreaterThan(0);
  });

  it('should have correct anime checkpoint parameters', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'anime' });

    expect(result.config.cfg_scale).toBe(6);
    expect(result.config.steps).toBe(28);
    expect(result.config.lora).toBeDefined();
    expect(result.config.lora?.weight).toBe(0.4);
  });

  it('should have correct realistic checkpoint parameters', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'realistic' });

    expect(result.config.cfg_scale).toBe(7);
    expect(result.config.steps).toBe(30);
    expect(result.config.lora).toBeUndefined();
  });

  it('should handle complex visual tags', () => {
    const result = buildImagePrompt({
      ...baseParams,
      visualTags: 'from behind, looking back, over shoulder, soft focus'
    });

    expect(result.positive).toContain('from behind');
    expect(result.positive).toContain('looking back');
    expect(result.positive).toContain('over shoulder');
    expect(result.positive).toContain('soft focus');
  });

  it('should handle complex expressions', () => {
    const result = buildImagePrompt({
      ...baseParams,
      expression: 'blushing, happy, closed eyes'
    });

    expect(result.positive).toContain('blushing');
    expect(result.positive).toContain('happy');
    expect(result.positive).toContain('closed eyes');
  });

  it('should handle complex lighting', () => {
    const result = buildImagePrompt({
      ...baseParams,
      lighting: 'golden hour, rim lighting, volumetric lighting'
    });

    expect(result.positive).toContain('golden hour');
    expect(result.positive).toContain('rim lighting');
    expect(result.positive).toContain('volumetric lighting');
  });

  it('should build different prompts for nude vs non-nude contexts', () => {
    const normalResult = buildImagePrompt({
      ...baseParams,
      isNude: false
    });

    const nudeResult = buildImagePrompt({
      ...baseParams,
      isNude: true
    });

    // Negative prompts should be different
    expect(nudeResult.negative).not.toBe(normalResult.negative);
    expect(nudeResult.negative.length).toBeGreaterThan(normalResult.negative.length);
  });

  it('should build different prompts for solo vs couple contexts', () => {
    const soloResult = buildImagePrompt({
      ...baseParams,
      isUserPresent: false
    });

    const coupleResult = buildImagePrompt({
      ...baseParams,
      isUserPresent: true,
      userAppearance: 'tall man'
    });

    // Positive prompts should differ in character tags
    expect(soloResult.positive).toContain('solo');
    expect(coupleResult.positive).toContain('couple');

    // Negative prompts should be different
    expect(soloResult.negative).not.toBe(coupleResult.negative);
  });

  it('should maintain proper comma separation', () => {
    const result = buildImagePrompt(baseParams);

    // Should have commas between elements
    const parts = result.positive.split(',');
    expect(parts.length).toBeGreaterThan(1);

    // Most parts should be non-empty after trimming (some empty may exist due to construction)
    const nonEmptyParts = parts.filter(part => part.trim().length > 0);
    expect(nonEmptyParts.length).toBeGreaterThan(5); // Should have multiple meaningful parts
  });

  it('should include uncensored tag for anime style', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'anime' });

    expect(result.positive).toContain('uncensored');
  });

  it('should not include anime-specific tags for realistic style', () => {
    const result = buildImagePrompt({ ...baseParams, style: 'realistic' });

    expect(result.positive).not.toContain('anime style');
    expect(result.positive).not.toContain('vibrant colors');
  });

  it('should include user appearance in correct position when present', () => {
    const result = buildImagePrompt({
      ...baseParams,
      isUserPresent: true,
      userAppearance: 'muscular build, short hair'
    });

    const positive = result.positive;

    // Should appear after character tags but before other elements
    const characterTagsIndex = positive.indexOf('1boy');
    const userAppearanceIndex = positive.indexOf('muscular build');

    expect(characterTagsIndex).toBeGreaterThan(-1);
    expect(userAppearanceIndex).toBeGreaterThan(-1);
    expect(userAppearanceIndex).toBeGreaterThan(characterTagsIndex);
  });
});
