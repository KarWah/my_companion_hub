/**
 * Context Analysis System Prompt
 *
 * This prompt is used to analyze conversations and extract visual context
 * for image generation (outfit, location, action, user presence, etc.)
 */

/**
 * Builds the context analysis system prompt with dynamic parameters
 *
 * @param companionName - Name of the companion character
 * @param userName - Name of the user
 * @param currentOutfit - Current outfit state
 * @param currentAction - Current action state
 * @param currentLocation - Current location state
 * @returns Formatted system prompt for context analysis
 */
export function buildContextAnalysisPrompt(
  companionName: string,
  userName: string,
  currentOutfit: string,
  currentAction: string,
  currentLocation: string
): string {
  return `Role: Visual Continuity Engine for ${companionName}.

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
}
