import { useEffect, useRef, useCallback } from 'react';
import type { BroadcastMessage } from '../types';

const CHANNEL_NAME = 'youroke-sync';

/**
 * Hook for cross-window communication via BroadcastChannel API
 * Used to sync state between main control window and projector window
 */
export function useBroadcastChannel(
  onMessage?: (message: BroadcastMessage) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Create channel on mount
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    // Set up message listener if callback provided
    if (onMessage) {
      channelRef.current.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        onMessage(event.data);
      };
    }

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [onMessage]);

  /**
   * Post a message to all other windows/tabs listening on this channel
   */
  const postMessage = useCallback((message: BroadcastMessage) => {
    if (channelRef.current) {
      channelRef.current.postMessage(message);
    }
  }, []);

  return { postMessage };
}

/**
 * Create a standalone broadcast channel for use outside React components
 * Useful for Zustand middleware
 */
export function createBroadcastChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL_NAME);
}
