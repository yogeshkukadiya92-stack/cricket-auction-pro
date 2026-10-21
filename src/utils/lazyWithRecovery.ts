import { lazy, ComponentType } from 'react';
import { shouldRecoverChunk } from '../../shared/chunkRecovery.js';

export function lazyWithRecovery<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try { return await loader(); }
    catch (error) {
      try {
        if (shouldRecoverChunk(error, window.sessionStorage)) window.location.reload();
      } catch { /* The error boundary provides a manual reload if storage is unavailable. */ }
      throw error;
    }
  });
}
