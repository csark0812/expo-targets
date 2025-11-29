/**
 * Safari Extension Module
 *
 * Provides utilities and hooks for Safari Web Extensions.
 * These only work when running in a Safari extension context (web view).
 */

import { useEffect, useState, useCallback } from 'react';

// Browser API type definitions
declare global {
  interface Window {
    browser?: typeof browser;
  }

  namespace browser {
    namespace tabs {
      interface Tab {
        id?: number;
        url?: string;
        title?: string;
        active?: boolean;
        windowId?: number;
      }

      function query(queryInfo: {
        active?: boolean;
        currentWindow?: boolean;
      }): Promise<Tab[]>;

      function sendMessage(tabId: number, message: any): Promise<any>;

      function create(createProperties: { url: string }): Promise<Tab>;
    }

    namespace storage {
      namespace sync {
        function get(
          keys?: string | string[] | null
        ): Promise<Record<string, any>>;
        function set(items: Record<string, any>): Promise<void>;
        function remove(keys: string | string[]): Promise<void>;
        function clear(): Promise<void>;
      }

      namespace local {
        function get(
          keys?: string | string[] | null
        ): Promise<Record<string, any>>;
        function set(items: Record<string, any>): Promise<void>;
        function remove(keys: string | string[]): Promise<void>;
        function clear(): Promise<void>;
      }
    }

    namespace runtime {
      function sendNativeMessage(
        application: string,
        message: any
      ): Promise<any>;

      function sendMessage(message: any): Promise<any>;

      const onMessage: {
        addListener(
          callback: (
            message: any,
            sender: any,
            sendResponse: (response?: any) => void
          ) => boolean | void | Promise<any>
        ): void;
        removeListener(callback: (...args: any[]) => any): void;
      };
    }
  }
}

/**
 * Check if running in a Safari extension web context
 */
export function isSafariExtension(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.browser !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Get the browser API (Safari uses 'browser', Chrome uses 'chrome')
 */
export function getBrowserAPI(): typeof browser | null {
  if (typeof window === 'undefined') return null;
  return window.browser || (window as any).chrome || null;
}

// ============================================================================
// Hooks
// ============================================================================

export interface BrowserTab {
  id?: number;
  url: string;
  title: string;
  active: boolean;
}

/**
 * Hook to get the current active browser tab
 */
export function useBrowserTab(): BrowserTab | null {
  const [tab, setTab] = useState<BrowserTab | null>(null);

  useEffect(() => {
    const api = getBrowserAPI();
    if (!api?.tabs?.query) return;

    api.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (tabs[0]) {
          setTab({
            id: tabs[0].id,
            url: tabs[0].url || '',
            title: tabs[0].title || '',
            active: tabs[0].active || false,
          });
        }
      })
      .catch((err) => {
        console.warn('[expo-targets/safari] Failed to get active tab:', err);
      });
  }, []);

  return tab;
}

/**
 * Hook to manage browser storage (synced across devices)
 */
export function useBrowserStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const api = getBrowserAPI();
    if (!api?.storage?.sync?.get) {
      setLoading(false);
      return;
    }

    api.storage.sync
      .get(key)
      .then((result) => {
        if (result[key] !== undefined) {
          setValue(result[key]);
        }
      })
      .catch((err) => {
        console.warn('[expo-targets/safari] Failed to get storage:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key]);

  const setStoredValue = useCallback(
    async (newValue: T) => {
      const api = getBrowserAPI();
      if (!api?.storage?.sync?.set) {
        setValue(newValue);
        return;
      }

      setValue(newValue);
      try {
        await api.storage.sync.set({ [key]: newValue });
      } catch (err) {
        console.warn('[expo-targets/safari] Failed to set storage:', err);
      }
    },
    [key]
  );

  return [value, setStoredValue, loading];
}

/**
 * Hook to manage local browser storage (not synced)
 */
export function useLocalBrowserStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const api = getBrowserAPI();
    if (!api?.storage?.local?.get) {
      setLoading(false);
      return;
    }

    api.storage.local
      .get(key)
      .then((result) => {
        if (result[key] !== undefined) {
          setValue(result[key]);
        }
      })
      .catch((err) => {
        console.warn('[expo-targets/safari] Failed to get local storage:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key]);

  const setStoredValue = useCallback(
    async (newValue: T) => {
      const api = getBrowserAPI();
      if (!api?.storage?.local?.set) {
        setValue(newValue);
        return;
      }

      setValue(newValue);
      try {
        await api.storage.local.set({ [key]: newValue });
      } catch (err) {
        console.warn('[expo-targets/safari] Failed to set local storage:', err);
      }
    },
    [key]
  );

  return [value, setStoredValue, loading];
}

/**
 * Hook to send messages to content scripts
 */
export function useSendToContentScript() {
  return useCallback(async (message: any): Promise<any> => {
    const api = getBrowserAPI();
    if (!api?.tabs?.query || !api?.tabs?.sendMessage) {
      console.warn('[expo-targets/safari] Browser tabs API not available');
      return null;
    }

    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      console.warn('[expo-targets/safari] No active tab found');
      return null;
    }

    return api.tabs.sendMessage(tabs[0].id, message);
  }, []);
}

/**
 * Hook to send messages to the native Swift handler
 */
export function useSendToNative() {
  return useCallback(async (message: any): Promise<any> => {
    const api = getBrowserAPI();
    if (!api?.runtime?.sendNativeMessage) {
      console.warn('[expo-targets/safari] Native messaging not available');
      return null;
    }

    // The application ID is the bundle identifier of the extension
    // Safari automatically routes to the correct handler
    return api.runtime.sendNativeMessage('', message);
  }, []);
}

/**
 * Hook to listen for messages from content scripts or background
 */
export function useMessageListener(
  callback: (message: any, sender: any) => any | Promise<any>
) {
  useEffect(() => {
    const api = getBrowserAPI();
    if (!api?.runtime?.onMessage) return;

    const listener = (
      message: any,
      sender: any,
      sendResponse: (response?: any) => void
    ) => {
      const result = callback(message, sender);

      if (result instanceof Promise) {
        result.then(sendResponse);
        return true; // Keep channel open for async response
      }

      if (result !== undefined) {
        sendResponse(result);
      }
    };

    api.runtime.onMessage.addListener(listener);

    return () => {
      api.runtime.onMessage.removeListener(listener);
    };
  }, [callback]);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Open a new tab with the specified URL
 */
export async function openTab(url: string): Promise<void> {
  const api = getBrowserAPI();
  if (!api?.tabs?.create) {
    // Fallback to window.open
    window.open(url, '_blank');
    return;
  }

  await api.tabs.create({ url });
}

/**
 * Close the extension popup
 */
export function closePopup(): void {
  window.close();
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('[expo-targets/safari] Failed to copy to clipboard:', err);
    return false;
  }
}

// ============================================================================
// Web Rendering Bootstrap
// ============================================================================

/**
 * Bootstrap a React component for Safari extension popup
 * This is called internally by createTarget when in Safari web context
 */
export function bootstrapSafariExtension(
  targetName: string,
  Component: React.ComponentType<any>
): void {
  if (typeof document === 'undefined') {
    console.warn(
      '[expo-targets/safari] Cannot bootstrap: document not available'
    );
    return;
  }

  const container = document.getElementById('root');
  if (!container) {
    console.error(
      '[expo-targets/safari] Root element not found. Ensure popup.html has <div id="root"></div>'
    );
    return;
  }

  // Dynamic import using Function constructor to avoid bundling react-dom in native builds
  // This is intentional - we need to defer module resolution to runtime for web-only code
  /* eslint-disable no-new-func */
  const loadReactDOM = async () => {
    try {
      // Try React 18+ createRoot API
      const dynamicImport = Function('m', 'return import(m)');
      const ReactDOMClient = await (dynamicImport(
        'react-dom/client'
      ) as Promise<any>);
      const React = await (dynamicImport('react') as Promise<any>);

      const root = ReactDOMClient.createRoot(container);
      root.render(React.createElement(Component));
      console.log(`[expo-targets/safari] ${targetName} mounted (React 18+)`);
    } catch {
      // Fallback to React 17 render API
      try {
        const dynamicImport = Function('m', 'return import(m)');
        const ReactDOM = await (dynamicImport('react-dom') as Promise<any>);
        const React = await (dynamicImport('react') as Promise<any>);

        ReactDOM.render(React.createElement(Component), container);
        console.log(`[expo-targets/safari] ${targetName} mounted (React 17)`);
      } catch (fallbackErr) {
        console.error(
          '[expo-targets/safari] Failed to bootstrap:',
          fallbackErr
        );
      }
    }
  };
  /* eslint-enable no-new-func */

  loadReactDOM();
}
