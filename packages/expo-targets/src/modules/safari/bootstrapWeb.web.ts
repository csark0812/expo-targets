import type React from 'react';
import { createElement } from 'react';

type RootApi = {
  createRoot: (container: Element) => { render: (node: unknown) => void };
};

/**
 * Web-only Safari popup mount. Kept in a `.web.ts` file so Metro never
 * pulls `react-dom` into native extension bundles.
 *
 * Uses require() so package typecheck does not need @types/react-dom.
 */
export function mountSafariExtensionRoot(
  Component: React.ComponentType<any>
): void {
  if (typeof document === 'undefined') {
    return;
  }
  const container = document.getElementById('root');
  if (!container) {
    return;
  }
  const { createRoot } = require('react-dom/client') as RootApi;
  const root = createRoot(container);
  root.render(createElement(Component));
}
