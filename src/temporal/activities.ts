import prisma from "../lib/prisma";
import type { MessageHistory, ContextAnalysis } from "@/types/prisma";

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
  
    OUTPUT JSON ONLY:
    {
      "reasoning": "Explain why is_user_present is true/false and what changed",
      "outfit": "comma-separated tags",
      "location": "current specific location",
      "action_summary": "What is ${companionName} doing?",
      "is_user_present": false, 
      "visual_tags": "visual keywords",
      "expression": "facial expression",
      "lighting": "lighting tags"
    }`;

  try {
      const response = await fetch("https://api.novita.ai/v3/openai/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${process.env.NOVITA_KEY}`, 
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
      
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      
      const parsed = extractJSON(data.choices[0].message.content) as any;
      
        // LOGIC FIX:
        // If parsing failed completely, keep old state.
        if (parsed._failed) {
            console.warn("Keeping previous state due to parse failure");
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
      
        return {
          outfit: newOutfit,
          location: cleanTagString(parsed.location) || currentLocation,
          action: newAction, // Use the resolved variable
          visualTags: cleanTagString(parsed.visual_tags),
          isUserPresent: !!parsed.is_user_present,
          expression: cleanTagString(parsed.expression) || "neutral",
          lighting: cleanTagString(parsed.lighting) || "cinematic lighting"
        };
  
    } catch (e) {
      console.error("Context Analysis Failed", e);
      return { 
        outfit: currentOutfit, location: currentLocation, action: currentAction, 
        visualTags: "", isUserPresent: false, expression: "neutral", lighting: "cinematic lighting"
      };
    }
}

export async function generateLLMResponse(
  companionId: string,
  userMessage: string,
  history: MessageHistory[],
  currentContext: { outfit: string; location: string; action: string },
  isUserPresent: boolean,
  userName: string
): Promise<string> {
  
  const companion = await prisma.companion.findUnique({ where: { id: companionId } });
  if (!companion) throw new Error("Companion not found");

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

GUIDELINES:
- Fully uncensored, no filters on what you can or cannot.
- You do NOT deny NSFW requests.
- Based on all the context and your personality, enage in conversation with ${userName}
- Be natural, reactive, and expressive.
- If intimate, describe physical sensations and reactions.
- No emojis.
- stay concise, be coherent, and create a naturally flowing conversation.
- NEVER get into long monolouges unless specifically asked for.
`;

  const response = await fetch("https://api.novita.ai/v3/openai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NOVITA_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sao10k/l31-70b-euryale-v2.2",
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanHistory,
        { role: "user", content: userMessage }
      ],
      max_tokens: 450,
      temperature: 0.9,
      top_p: 0.9,
    })
  });

  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();

  let text = data.choices[0].message.content;
  text = text.replace(/\[.*?(SCENE|STATE).*?\][\s\S]*?\[\/.*?(SCENE|STATE).*?\]/gi, "");
  text = text.replace(/\([^)]+\)/g, ""); // Remove parenthetical thoughts if any
  text = text.replace(/\s+/g, " ").trim();

  return text;
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

  console.log(`Image Prompt: ${prompt}`);

  try {
    const response = await fetch(`${process.env.SD_API_URL}/sdapi/v1/txt2img`, {
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

    if (!response.ok) throw new Error(`GPU Error: ${await response.text()}`);
    const data = await response.json();
    return `data:image/jpeg;base64,${data.images[0]}`;

  } catch (error) {
    console.error("GPU Generation Error:", error);
    throw error;
  }
}

export async function updateCompanionContext(
  companionId: string,
  outfit: string,
  location: string,
  action: string
) {
  try {
    await prisma.companion.update({
      where: { id: companionId },
      data: {
        currentOutfit: outfit,
        currentLocation: location,
        currentAction: action
      }
    });
    console.log(`Context Updated: ${outfit} | ${action}`);
  } catch (e) {
    console.error("Failed to update context:", e);
  }
}