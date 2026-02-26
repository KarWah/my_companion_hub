"use client";

import { useEffect, useRef, useState } from 'react';
import type { StreamState, WorkflowResult } from '@/types';

export function useWorkflowStream(workflowId: string | null): StreamState {
  const [state, setState] = useState<StreamState>({
    status: 'started',
    progress: 0,
    currentStep: '',
    streamedText: '',
    isComplete: false
  });

  // Track last status change for debouncing
  const [lastStatusChangeTime, setLastStatusChangeTime] = useState(Date.now());
  const MIN_STATUS_DISPLAY_TIME = 300; // ms

  // Ref to track completion without stale closure issues in onerror
  const isCompleteRef = useRef(false);

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
    isCompleteRef.current = false;
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
    // Track received character count so reconnects can resume without duplication
    let receivedLength = 0;

    const connect = () => {
      const url = `/api/chat/stream/${workflowId}?from=${receivedLength}`;
      eventSource = new EventSource(url);

      eventSource.addEventListener('token', (e) => {
        const { token } = JSON.parse(e.data);
        receivedLength += token.length;
        setState(prev => ({
          ...prev,
          streamedText: prev.streamedText + token
        }));
      });

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        const now = Date.now();

        setState(prev => {
          // Only update status text if enough time has passed OR progress increased significantly
          const timeSinceLastChange = now - lastStatusChangeTime;
          const shouldUpdateStatus = timeSinceLastChange > MIN_STATUS_DISPLAY_TIME ||
                                     data.progress > prev.progress + 10;

          if (shouldUpdateStatus) {
            setLastStatusChangeTime(now);
            return {
              ...prev,
              status: data.status,
              progress: data.progress,
              currentStep: data.currentStep
            };
          } else {
            // Update progress but keep current status text
            return {
              ...prev,
              progress: data.progress
            };
          }
        });
      });

      eventSource.addEventListener('complete', (e) => {
        const result = JSON.parse(e.data);
        isCompleteRef.current = true;
        setState(prev => ({
          ...prev,
          isComplete: true,
          finalResult: result,
          imageUrl: result.imageUrl,
          audioUrl: result.audioUrl
        }));
        eventSource?.close();
      });

      eventSource.addEventListener('error', (e: Event) => {
        try {
          const messageEvent = e as MessageEvent;
          const data = JSON.parse(messageEvent.data || '{}');
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
        if (!isCompleteRef.current && reconnectAttempts < maxReconnectAttempts) {
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
