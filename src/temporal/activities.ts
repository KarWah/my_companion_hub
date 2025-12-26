import prisma from "../lib/prisma";
import type { MessageHistory } from "@/types/prisma";
import type { ContextAnalysis, ContextAnalysisResponse } from "@/types/context";
import { workflowLogger, startTimer, logError } from "@/lib/logger";
import { env } from "@/lib/env";
import { uploadImage } from "@/lib/storage";

// --- HELPERS ---

function extractJSON(text: string): Record<string, unknown> {
  try {
    // 1. Try parsing pure text first (fast path)
    return JSON.parse(text);
  } catch (e) {
    // 2. Locate the first '{' and the last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start === -1 || end === -1 || start >= end) {
      console.error("JSON Extraction Failed: No braces found", text);
      throw new Error("No JSON found");
    }
    
    let jsonCandidate = text.substring(start, end + 1);

    // 3. Aggressive Sanitization
    jsonCandidate = jsonCandidate
      .replace(/\\n/g, " ")                // Remove newlines
      .replace(/[\u0000-\u0019]+/g, "")    // Remove control chars
      .replace(/\/\/.*$/gm, "")            // Remove JS-style comments
      .replace(/:\s*TRUE/gi, ": true")     // Fix uppercase booleans
      .replace(/:\s*FALSE/gi, ": false")
      .replace(/,(\s*})/g, "$1");          // Remove trailing commas

    try {
      return JSON.parse(jsonCandidate);
    } catch (finalError) {
      console.error("JSON Extraction Failed after cleanup:", jsonCandidate);
      // Fallback: Return a safe default object with _failed flag
      return {
        _failed: true,
        reasoning: "JSON parsing failed",
        outfit: "",
        location: "",
        action_summary: "",
        is_user_present: false,
        visual_tags: "",
        expression: "neutral",
        lighting: "cinematic"
      };
    }
  }
}

function cleanTagString(str: string): string {
  if (!str) return "";
  return str.replace(/[()]/g, "").replace(/\.$/, "").trim();
}


// --- ACTIVITIES ---

export async function analyzeContext(
  currentOutfit: string,
  currentLocation: string,
  currentAction: string,
  userMessage: string,
  history: MessageHistory[],
  companionName: string,
  userName: string,
  aiResponse: string
): Promise<ContextAnalysis> {
  const timer = startTimer();
  const log = workflowLogger.child({
    activity: 'analyzeContext',
    companionName,
  });

  // Map history to explicit names to prevent 'Subject Confusion'
  const recentHistory = history.slice(-4).map(m => {
    const speaker = m.role === "user" ? `User (${userName})` : `Companion (${companionName})`;
    return `${speaker}: ${m.content}`;
  }).join("\n");
  
  const systemPrompt = `Role: Visual Continuity Engine for ${companionName}.
    
    TASK: specificially track ${companionName}'s physical state based on the narrative.
    
    ### CRITICAL PRIORITY:
    Analyze the "LATEST AI RESPONSE" to determine the current state. 
    If the ${companionName} describes taking off an item, IMMEDIATEY remove it from the outfit list.
    If the ${companionName} describes a specific pose, that is the ACTION.
  
    ### CURRENT STATE
    - Outfit: "${currentOutfit}" 
    - Action: "${currentAction}"
    - Location: "${currentLocation}"
    
    ### CRITICAL INSTRUCTIONS:
  
    1. **SUBJECT OWNERSHIP (ACTION)**: 
       ACTION RULES (STRICT):
       
       - "action_summary" MUST describe ONLY what ${companionName} is physically doing RIGHT NOW.
       - It must be present-tense, observable, and stable.
       - NEVER describe intentions, plans, or transitions that ${userName} is doing.
          only describe your own "actions"
       - Camera / photo actions MUST be literal:
          "Taking a selfie"
          "Posing for a photo"
          "taking a picture"
          but never include "camera" inside the actual SD prompt.
       - If nothing changes, REPEAT the previous action exactly.
       
       - NEVER describe what the User is doing.
       - If ${companionName} is cooking, write "Cooking dinner".
       - If User is cooking, write "Watching User cook".
  
    2. **PRESENCE LOGIC (STRICT)**:
       - **FALSE** if they are: texting, calling, video chatting, OR **planning to meet later**.
       - **FALSE** if the user says "I'm coming over", "See you soon", or "On my way".
       - **TRUE** ONLY if the narrative confirms they are currently in the same physical room right now.
       
    3. **OUTFIT MANAGEMENT**:
       - Master Inventory: "${currentOutfit}"
       - SUBTRACTION: If user says "take off [item]", remove it from the list.
       - ADDITION: If ${companionName} puts something on, add it.
       - Do not generalize (Keep "grey high waisted thong", don't change to "underwear").

    3. **VISUALS & POSE**:
      - If User asks for a pic ("send a pic", "show me"), include "looking at viewer" or "front view" in visual_tags unless specified otherwise.
      - If the location implies a pose (e.g., chillin on couch), specify it: use "sitting on couch" instead of just "living room".

    4. **LOCATION**:
       - Update only if ${companionName} moves. Be specific (e.g., "Kitchen counter" vs "House").

    5. **VISUAL_TAGS (CRITICAL FOR IMAGE GENERATION)**:
       - Capture BOTH the scene/state AND the companion's actions
       - Analyze the User's message for what's HAPPENING TO/WITH ${companionName} (scene state, position, physical context)
       - Analyze ${companionName}'s response for what ${companionName} IS DOING (actions, reactions)
       - Combine both into detailed visual tags

       Examples:
         * User: "Karl pulls out and cums on her back" + Response: "reaching back to scoop it up"
           → "rear view, cum on back, cum on ass, cum dripping, hand reaching back, scooping cum, looking over shoulder"

         * User: "send me a pic" + Response: "strikes a pose for you"
           → "front view, looking at viewer, modeling pose, confident stance, hand on hip"

         * User: "pushes her onto the bed" + Response: "landing on my back, spreading my legs"
           → "lying on bed, on back, legs spread, inviting pose, from above"

       - ALWAYS include visual state from user's actions (positions, fluids, clothing state, physical contact)
       - ALWAYS translate companion's actions into visible pose descriptions
       - Include camera angles: front view, rear view, side view, from above, close-up, etc.

    OUTPUT JSON ONLY:
    {
      "reasoning": "Explain why is_user_present is true/false and what changed",
      "outfit": "comma-separated tags",
      "location": "current specific location",
      "action_summary": "What is ${companionName} doing?",
      "is_user_present": false,
      "visual_tags": "detailed pose and camera angle tags for image generation (translate action into visual descriptors)",
      "expression": "facial expression",
      "lighting": "lighting tags"
    }`;

  log.debug({ historyLength: history.length }, 'Starting context analysis');

  try {
      const response = await fetch("https://api.novita.ai/v3/openai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.NOVITA_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "sao10k/l31-70b-euryale-v2.2",
          messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `CONTEXT HISTORY:\n${recentHistory}\n\nLATEST INPUT from ${userName}: "${userMessage}"\n\nLATEST AI RESPONSE (${companionName}): "${aiResponse}"` }
          ],
          max_tokens: 600, 
          temperature: 0.2, 
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log.error({ status: response.status, errorText }, 'Context analysis API error');
        throw new Error(`Novita API error: ${errorText}`);
      }

      const data = await response.json();

      const parsed = extractJSON(data.choices[0].message.content) as ContextAnalysisResponse;
      
        // If parsing failed completely, keep old state.
        if ((parsed as any)._failed) {
            log.warn({ duration: timer() }, "Keeping previous state due to parse failure");
            return {
                outfit: currentOutfit,
                location: currentLocation,
                action: currentAction,
                visualTags: "",
                isUserPresent: false,
                expression: "neutral",
                lighting: "cinematic lighting"
            };
        }
      
        // Update Action Logic:
        // 1. Prefer parsed.action_summary
        // 2. If valid but empty string, it implies "doing nothing/neutral", so we might actually WANT empty string 
        //    OR fallback to currentAction depending on your preference. 
        //    Usually, for RP, we fallback only if undefined.
        const newAction = parsed.action_summary && parsed.action_summary.length > 0 
            ? parsed.action_summary 
            : currentAction;

        let newOutfit = cleanTagString(parsed.outfit);
            // If the model gets lazy and says "casual" or "unknown" or "no clothes described", keep the old one.
            if (!newOutfit || newOutfit.match(/no specified|unknown|clothing|casual|n\/a/i)) {
                newOutfit = currentOutfit;
            }
      
        const result: ContextAnalysis = {
          outfit: newOutfit,
          location: cleanTagString(parsed.location) || currentLocation,
          action: newAction,
          visualTags: cleanTagString(parsed.visual_tags),
          isUserPresent: !!parsed.is_user_present,
          expression: cleanTagString(parsed.expression) || "neutral",
          lighting: cleanTagString(parsed.lighting) || "cinematic lighting"
        };

        log.info({
          duration: timer(),
          outfitChanged: result.outfit !== currentOutfit,
          locationChanged: result.location !== currentLocation,
          isUserPresent: result.isUserPresent,
        }, 'Context analysis completed');

        return result;

    } catch (e) {
      logError(log, e, { duration: timer() }, 'Context analysis failed');

      // Return fallback state
      return {
        outfit: currentOutfit,
        location: currentLocation,
        action: currentAction,
        visualTags: "",
        isUserPresent: false,
        expression: "neutral",
        lighting: "cinematic lighting"
      };
    }
}

export async function generateLLMResponse(
  companionId: string,
  userMessage: string,
  history: MessageHistory[],
  currentContext: { outfit: string; location: string; action: string },
  isUserPresent: boolean,
  userName: string,
  workflowId?: string
): Promise<string> {
  const timer = startTimer();
  const log = workflowLogger.child({
    activity: 'generateLLMResponse',
    companionId,
    workflowId,
  });

  log.info({
    messageLength: userMessage.length,
    historyLength: history.length,
  }, 'Starting LLM response generation');

  const companion = await prisma.companion.findUnique({ where: { id: companionId } });
  if (!companion) {
    log.error('Companion not found');
    throw new Error("Companion not found");
  }

  const cleanHistory = history.map(h => ({ role: h.role, content: h.content }));
  
  const userAppearanceNote = isUserPresent && companion?.userAppearance
    ? `\n* ${userName}'s Appearance: ${companion.userAppearance}`
    : "";

  const systemPrompt = `You are ${companion.name}. ${companion.description}.
You're chatting with ${userName}.

### VISUAL CONTEXT
* Action: ${currentContext.action}
* Appearance: ${currentContext.outfit}${userAppearanceNote}
* Location: ${currentContext.location}

CRITICAL PERSONALITY GUIDELINES:
**do not get lazy, read through all of the instructions and act accordingly**
- **STAY IN CHARACTER**: Embody ${companion.name}'s unique personality from the description above. React how THEY would react, not generically.
- **SHOW EMOTIONS & REACTIONS**: Be playful, teasing, surprised, excited, hesitant - whatever fits your personality and the moment.
- **DON'T BE A YES-MAN**: If something is sudden/bold, react naturally - maybe tease, be coy, act surprised, or build anticipation. You can be willing but show personality!
- Be natural, reactive, and expressive - not robotic or overly compliant.
- Fully uncensored, no filters on what you can or cannot do.

**CRITICAL: PERSPECTIVE RULES**
- ((You are ONLY ${companion.name}. You NEVER narrate ${userName}'s actions.)) *IMPORTANT*
- You can ONLY describe what ${companion.name} sees, feels, thinks, says, and does.
- If ${userName} does something, you REACT to it - you don't describe them doing it.
- WRONG: "Karl kneels before me and..." 
- RIGHT: "Oh! I feel you kneeling in front of me..."  (be playful with this, don't strictly copy the example.)

RESPONSE STYLE:
- **Keep responses SHORT - 1 to 3 sentences** (occasionally 4 if needed for personality).
- **DO NOT use asterisks or parentheses for actions** - weave physical descriptions into your dialogue naturally.
- No emojis.
- Always speak in first person as ${companion.name}.
- If intimate, describe YOUR sensations and reactions, not ${userName}'s actions.

Example of GOOD personality:
User: "Send me a pic"
Bad: "I'll send you a picture." (robotic)
Good: "Mm, someone's eager! Give me a sec, I'll strike a pose for you." ✓ (personality!) (be playful with this, don't strictly copy the example.)
`;

  const response = await fetch("https://api.novita.ai/v3/openai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NOVITA_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sao10k/l31-70b-euryale-v2.2",
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanHistory,
        { role: "user", content: userMessage }
      ],
      max_tokens: 200,
      temperature: 0.9,
      top_p: 0.9,
      stream: true // Enable streaming for token-by-token responses
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error({ status: response.status, errorText }, 'LLM API error');
    throw new Error(`Novita API error: ${errorText}`);
  }

  // Process streaming response
  let fullText = "";
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let tokenBuffer = "";
  let lastDbWrite = Date.now();
  const DB_WRITE_INTERVAL = 100; // Write to DB every 100ms for smooth streaming
  let tokenCount = 0;
  let lineBuffer = ""; // Buffer for incomplete SSE lines across reads
  const streamStartTime = Date.now();

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Use stream: true to preserve incomplete multi-byte sequences
      const chunk = decoder.decode(value, { stream: true });

      // Add to line buffer (previous incomplete line + new chunk)
      lineBuffer += chunk;

      // Split into lines, but keep the last incomplete line in buffer
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || ""; // Keep the last (potentially incomplete) line

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices[0]?.delta?.content || '';
            if (token) {
              tokenCount++;
              if (tokenCount === 1) {
                const ttft = Date.now() - streamStartTime; // Time To First Token
                log.debug({
                  token,
                  ttft,
                }, 'First token received');
              }
              fullText += token;
              tokenBuffer += token;

              // Batch write tokens to database for streaming
              const now = Date.now();
              if (workflowId && (now - lastDbWrite > DB_WRITE_INTERVAL || tokenBuffer.length > 50)) {
                try {
                  await prisma.workflowExecution.update({
                    where: { workflowId },
                    data: { streamedText: fullText }
                  });
                  lastDbWrite = now;
                  tokenBuffer = "";
                } catch (dbError) {
                  log.error({ error: dbError }, "Failed to write streaming tokens to DB");
                  // Continue even if DB write fails
                }
              }
            }
          } catch (e) {
            log.trace({ line: trimmedLine.substring(0, 100) }, "Failed to parse SSE line");
          }
        }
      }
    }

    // Flush the decoder at the end
    const finalChunk = decoder.decode();
    if (finalChunk) {
      lineBuffer += finalChunk;
    }
  }

  // Final DB write with any remaining tokens
  if (workflowId && tokenBuffer) {
    try {
      await prisma.workflowExecution.update({
        where: { workflowId },
        data: { streamedText: fullText }
      });
    } catch (dbError) {
      log.error({ error: dbError }, "Failed to write final streaming tokens to DB");
    }
  }

  // Clean up text - remove action markers but keep the actual speech
  const originalLength = fullText.length;

  // Remove scene/state tags if present
  fullText = fullText.replace(/\[.*?(SCENE|STATE).*?\][\s\S]*?\[\/.*?(SCENE|STATE).*?\]/gi, "");

  // Remove parenthetical actions like (giggles), (smiles) - only lowercase
  fullText = fullText.replace(/\s*\([a-z\s]+\)\s*/gi, " ");

  // Clean up extra whitespace
  fullText = fullText.replace(/\s+/g, " ").trim();

  log.info({
    duration: timer(),
    tokenCount,
    originalLength,
    cleanedLength: fullText.length,
  }, 'LLM response generation completed');

  return fullText;
}


export async function generateCompanionImage(
  companionId: string,
  visualState: string,
  location: string,
  visualTags: string, 
  expression: string,
  isUserPresent: boolean,
  lighting: string,
): Promise<string> {

  const companion = await prisma.companion.findUnique({
    where: { id: companionId },
    select: { defaultOutfit: true, visualDescription: true, userAppearance: true }
  });
  const explicitKeywords = /naked|nude|unclothed|topless|bottomless|pussy|hole|anus|anal|spreading|spread|asscheeks|cheek|exposed|undressing|stripping|no clothes/i;
  const isNude = explicitKeywords.test(visualState) || 
    explicitKeywords.test(visualTags) || 
    explicitKeywords.test(location);
  
  // --- SMART LAYERING LOGIC (NEW) ---
  // Problem: SD gets confused if we send "hoodie, shorts, bra, thong" all at once.
  // Solution: If outerwear exists, filter out underwear tags so only visible clothes are prompted.
  let finalOutfitString = visualState;

  // Only apply layering filter if we aren't explicitly in a "nude/sexy" context where underwear should be shown.
  if (!isNude && visualState) {
    const underwearKeywords = ['thong', 'panties', 'bra', 'sports bra', 'underwear', 'lingerie', 'boxers', 'briefs'];
    // Keywords that imply outer layers exist, meaning underwear should normally be hidden underneath.
    const outerwearKeywords = ['hoodie', 'sweatshirt', 'jacket', 'coat', 'shirt', 't-shirt', 'top', 'shorts', 'pants', 'jeans', 'skirt', 'dress', 'leggings', 'sweater'];

    const outfitTags = visualState.split(',').map(t => t.trim().toLowerCase());
    
    // Check if any tag contains an outerwear keyword
    const hasOuterwear = outfitTags.some(tag => outerwearKeywords.some(okw => tag.includes(okw)));

    if (hasOuterwear) {
      console.log("Outerwear detected. Filtering out visible underwear tags for cleaner image generation.");
      // Filter keep tags that DO NOT contain underwear keywords
      const filteredTags = outfitTags.filter(tag => !underwearKeywords.some(ukw => tag.includes(ukw)));
      // Rejoin the remaining tags, capitalizing first letters for neatness if desired, but lowercase is fine for SD.
      finalOutfitString = filteredTags.join(', ');
    }
  }

  // Use finalOutfitString here instead of visualState
  let safeOutfit = isNude ? finalOutfitString : (finalOutfitString || companion?.defaultOutfit || "casual clothes");


  // --- SAFETY NET FOR PRESENCE ---
  // Even if the LLM thinks user is present, if the tags imply remote/camera work, force SOLO.
  const isVirtualContext = /pov|viewer|eyes|from above|selfie|recording|filming|phone|camera|mirror/i.test(visualTags + location);
  const actualUserPresence = isUserPresent && !isVirtualContext;

  // --- TAG CONSTRUCTION ---
  let characterTags = "";
  let finalVisualTags = visualTags;
  
  if (actualUserPresence) {
    characterTags = "(1girl, 1boy, hetero), couple focus";
  } else {
    characterTags = "(1girl, solo)"; 
    
  }

  let userAppearanceTags = "";
  if (actualUserPresence && companion?.userAppearance) {
    userAppearanceTags = `(1boy, ${companion.userAppearance}),`;
  }

  const prompt = `
    (masterpiece, best quality:1.2), absurdres, highres, cinematic light,
    <lora:[inukai mofu] Artist Style Illustrious_2376885:0.4> inuk, uncensored,

    ${characterTags},

    (${finalVisualTags}), 
    (${expression}),
    (${location}),
    (${lighting}),

    ${userAppearanceTags}
    ${safeOutfit},
    ${companion?.visualDescription || ""}
  `.replace(/\s+/g, " ").trim(); 

  let negativePrompt = "(bad quality:1.15), (worst quality:1.3), neghands,monochrome,3d,long neck,ugly fingers,ugly hands,ugly,easynegative,text,watermark,deformed,mutated,cropped,ugly,disfigured,deformed face,ugly face,non-detailed,realistic,";
  
  if (actualUserPresence) {
    negativePrompt += ", extra limbs, extra arms, floating limbs,";
  } else {
    negativePrompt += ", multiple views, boyfriend, 1boy, man, male, penis, multiple people, 2boys, beard, male focus, from behind"; // Added "from behind" to negative for solo shots unless specified
  }
  
  if (isNude) {
    negativePrompt += ", clothes, clothing, shirt, pants, bra, panties";
  }

  const log = workflowLogger.child({
    activity: 'generateCompanionImage',
    companionId,
  });

  const timer = startTimer();

  log.debug({ promptLength: prompt.length }, 'Starting image generation');

  try {
    const response = await fetch(`${env.SD_API_URL}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: negativePrompt,
        steps: 28, 
        width: 832, 
        height: 1216,
        sampler_name: "DPM++ 2M",
        scheduler: "karras", 
        cfg_scale: 6, 
        seed: -1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, errorText }, 'Image generation API error');
      throw new Error(`Stable Diffusion API error: ${errorText}`);
    }

    const data = await response.json();
    const base64Image = `data:image/jpeg;base64,${data.images[0]}`;

    // Upload to file storage instead of returning base64
    const uploadResult = await uploadImage(
      base64Image,
      companionId,
      'companion-generated'
    );

    log.info({
      duration: timer(),
      originalSizeKB: Math.round(uploadResult.originalSizeBytes / 1024),
      optimizedSizeKB: Math.round(uploadResult.sizeBytes / 1024),
      compressionPercent: (uploadResult.compressionRatio * 100).toFixed(1),
      url: uploadResult.url,
    }, 'Image generation completed and uploaded');

    return uploadResult.url;

  } catch (error) {
    logError(log, error, { duration: timer() }, 'Image generation failed');
    throw error;
  }
}

export async function updateCompanionContext(
  companionId: string,
  outfit: string,
  location: string,
  action: string
) {
  const log = workflowLogger.child({
    activity: 'updateCompanionContext',
    companionId,
  });

  try {
    await prisma.companion.update({
      where: { id: companionId },
      data: {
        currentOutfit: outfit,
        currentLocation: location,
        currentAction: action
      }
    });

    log.info({
      outfit,
      location,
      action,
    }, 'Companion context updated');

  } catch (e) {
    logError(log, e, {}, 'Failed to update companion context');
    throw e;
  }
}