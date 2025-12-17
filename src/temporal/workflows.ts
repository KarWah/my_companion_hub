import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const {
  generateLLMResponse,
  analyzeContext,
  generateCompanionImage,
  updateCompanionContext
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
});

export interface ChatWorkflowArgs {
  companionId: string;
  companionName: string;
  userMessage: string;
  userName: string;
  currentOutfit: string;
  currentLocation: string;
  currentAction: string;
  msgHistory: { role: "user" | "assistant"; content: string }[];
  shouldGenerateImage: boolean;
}

export async function ChatWorkflow({
  companionId,
  companionName,
  userMessage,
  userName,
  currentOutfit,
  currentLocation,
  currentAction,
  msgHistory,
  shouldGenerateImage
}: ChatWorkflowArgs) {

  // Analyze user's message to get initial state for companion's response
  const initialContext = await analyzeContext(
    currentOutfit,
    currentLocation,
    currentAction,
    userMessage,
    msgHistory,
    companionName,
    userName,
    "",
  );

  // Companion responds based on initial context
  const reply = await generateLLMResponse(
    companionId,
    userMessage,
    msgHistory,
    initialContext,
    initialContext.isUserPresent,
    userName
  );

  // Re-analyze including companion's response to catch any actions SHE described
  const updatedHistory: { role: "user" | "assistant"; content: string }[] = [
    ...msgHistory,
    { role: 'user' as const, content: userMessage },
    { role: 'assistant' as const, content: reply }
  ];

  const finalContext = await analyzeContext(
    currentOutfit,
    currentLocation,
    currentAction,
    userMessage, 
    updatedHistory,
    companionName,
    userName,
    reply
  );

  // Use final context that includes companion's actions
  const anyContextChanged =
    finalContext.outfit !== currentOutfit ||
    finalContext.location !== currentLocation ||
    finalContext.action !== currentAction;

  if (anyContextChanged) {
    await updateCompanionContext(
      companionId,
      finalContext.outfit,
      finalContext.location,
      finalContext.action
    );
  }

  // Use final context that includes both user AND companion actions
  let imageUrl = null;

  if (shouldGenerateImage) {
    imageUrl = await generateCompanionImage(
      companionId,
      finalContext.outfit,
      finalContext.location,
      finalContext.visualTags,
      finalContext.expression,
      finalContext.isUserPresent,
      finalContext.lighting,
    );
  }

  return {
    text: reply,
    imageUrl: imageUrl,
    updatedState: {
      outfit: finalContext.outfit,
      location: finalContext.location,
      action: finalContext.action,
      expression: finalContext.expression
    }
  };
}