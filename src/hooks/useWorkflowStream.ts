"use client";

import { useEffect, useState } from 'react';
import type { StreamState, WorkflowResult } from '@/types/workflow';

export function useWorkflowStream(workflowId: string | null): StreamState {
  const [state, setState] = useState<StreamState>({
    status: 'started',
    progress: 0,
    currentStep: '',
    streamedText: '',
    isComplete: false
  });

  useEffect(() => {
    if (!workflowId) {
      // Reset state when workflowId is cleared
      setState({
        status: 'started',
        progress: 0,
        currentStep: '',
        streamedText: '',
        isComplete: false
      });
      return;
    }

    // Reset state when new workflow starts
    setState({
      status: 'started',
      progress: 0,
      currentStep: '',
      streamedText: '',
      isComplete: false
    });

    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      eventSource = new EventSource(`/api/chat/stream/${workflowId}`);

      eventSource.addEventListener('token', (e) => {
        const { token } = JSON.parse(e.data);

        setState(prev => {
          const newText = prev.streamedText + token;

          // Apply same cleanup as the activity to prevent text from changing
          let cleanedText = newText;
          // Remove asterisk actions like *giggles*
          cleanedText = cleanedText.replace(/\s*\*[^*]+\*\s*/g, " ");
          // Remove parenthetical actions like (giggles)
          cleanedText = cleanedText.replace(/\s*\([a-z\s]+\)\s*/gi, " ");
          // Clean up whitespace
          cleanedText = cleanedText.replace(/\s+/g, " ");

          return {
            ...prev,
            streamedText: cleanedText
          };
        });
      });

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        setState(prev => ({
          ...prev,
          status: data.status,
          progress: data.progress,
          currentStep: data.currentStep
        }));
      });

      eventSource.addEventListener('complete', (e) => {
        const result = JSON.parse(e.data);
        setState(prev => ({
          ...prev,
          isComplete: true,
          finalResult: result,
          imageUrl: result.imageUrl
        }));
        eventSource?.close();
      });

      eventSource.addEventListener('error', (e: any) => {
        try {
          const data = JSON.parse(e.data || '{}');
          setState(prev => ({
            ...prev,
            error: data.error || 'Stream error',
            isComplete: true
          }));
        } catch {
          setState(prev => ({
            ...prev,
            error: 'Stream connection error',
            isComplete: true
          }));
        }
        eventSource?.close();
      });

      eventSource.onerror = () => {
        console.error('SSE connection error');
        eventSource?.close();

        // Retry with exponential backoff if not complete
        if (!state.isComplete && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          setTimeout(connect, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setState(prev => ({
            ...prev,
            error: 'Failed to connect after multiple attempts',
            isComplete: true
          }));
        }
      };
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [workflowId]);

  return state;
}
