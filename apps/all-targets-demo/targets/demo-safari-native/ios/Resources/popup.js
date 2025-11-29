/* global browser, document, navigator */
// Demo Safari Native Extension - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI elements
  const tabInfo = document.getElementById('tab-info');
  const counterValue = document.getElementById('counter-value');
  const btnIncrement = document.getElementById('btn-increment');
  const btnCopy = document.getElementById('btn-copy');
  const btnOpen = document.getElementById('btn-open');
  const btnNative = document.getElementById('btn-native');
  const nativeResponse = document.getElementById('native-response');

  let currentTab = null;

  // Load current tab info
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    currentTab = tabs[0];

    if (currentTab) {
      tabInfo.innerHTML = `
        <div class="tab-title">${escapeHtml(currentTab.title || 'Untitled')}</div>
        <div class="tab-url">${escapeHtml(currentTab.url || '')}</div>
      `;
      btnCopy.disabled = false;
    }
  } catch (error) {
    console.error('Failed to get tab info:', error);
    tabInfo.innerHTML = '<div class="loading">Unable to get tab info</div>';
  }

  // Load counter from storage
  try {
    const result = await browser.storage.sync.get('clickCount');
    counterValue.textContent = result.clickCount || 0;
  } catch (error) {
    console.error('Failed to load counter:', error);
  }

  // Increment counter
  btnIncrement.addEventListener('click', async () => {
    const current = parseInt(counterValue.textContent) || 0;
    const newValue = current + 1;
    counterValue.textContent = newValue;

    try {
      await browser.storage.sync.set({ clickCount: newValue });
    } catch (error) {
      console.error('Failed to save counter:', error);
    }
  });

  // Copy URL
  btnCopy.addEventListener('click', async () => {
    if (currentTab?.url) {
      try {
        await navigator.clipboard.writeText(currentTab.url);
        const originalText = btnCopy.textContent;
        btnCopy.textContent = '✓ Copied!';
        btnCopy.classList.add('primary');
        setTimeout(() => {
          btnCopy.textContent = originalText;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  });

  // Open Expo Docs
  btnOpen.addEventListener('click', () => {
    browser.tabs.create({ url: 'https://docs.expo.dev' });
  });

  // Send message to native handler
  btnNative.addEventListener('click', async () => {
    btnNative.textContent = 'Sending...';
    btnNative.disabled = true;

    try {
      const response = await browser.runtime.sendNativeMessage('', {
        type: 'ping',
        timestamp: Date.now(),
        tabUrl: currentTab?.url,
      });

      nativeResponse.textContent = JSON.stringify(response, null, 2);
      nativeResponse.classList.add('visible');
    } catch (error) {
      nativeResponse.textContent = `Error: ${error.message}`;
      nativeResponse.classList.add('visible');
    } finally {
      btnNative.textContent = 'Send to Native Handler';
      btnNative.disabled = false;
    }
  });
});

// Helper to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
