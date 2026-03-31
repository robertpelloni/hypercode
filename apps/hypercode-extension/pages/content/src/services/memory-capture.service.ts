import { createLogger } from '@extension/shared/lib/logger';
import { eventBus } from '../events/event-bus';
import { useContextStore } from '../stores/context.store';
import { sendMessage } from 'webext-bridge/content-script';

const logger = createLogger('MemoryCaptureService');

/**
 * MemoryCaptureService - Automatically captures page content as memories
 */
export class MemoryCaptureService {
  private static instance: MemoryCaptureService | null = null;
  private isEnabled = true;
  private lastCapturedUrl = '';
  private captureTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): MemoryCaptureService {
    if (!MemoryCaptureService.instance) {
      MemoryCaptureService.instance = new MemoryCaptureService();
    }
    return MemoryCaptureService.instance;
  }

  private setupEventListeners(): void {
    // Listen for page load/navigation
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => this.scheduleCapture());
    }

    // Listen for URL changes
    eventBus.on('app:site-changed', () => this.scheduleCapture());
  }

  private scheduleCapture(): void {
    if (!this.isEnabled) return;

    // Wait for page to settle
    if (this.captureTimeout) clearTimeout(this.captureTimeout);
    this.captureTimeout = setTimeout(() => this.captureCurrentPage(), 3000);
  }

  private async captureCurrentPage(): Promise<void> {
    const currentUrl = window.location.href;
    if (currentUrl === this.lastCapturedUrl) return;
    if (currentUrl.startsWith('about:') || currentUrl.startsWith('chrome:')) return;

    try {
      logger.debug(`Capturing page: ${currentUrl}`);
      
      const content = this.extractPageContent();
      if (!content || content.length < 100) {
        logger.debug('Page content too short, skipping capture');
        return;
      }

      const title = document.title || currentUrl;
      
      // 1. Save to local context store
      useContextStore.getState().captureContext({
        content,
        name: title,
        source: 'auto-capture',
        sourceUrl: currentUrl,
        sourceTitle: title,
      });

      // 2. Send to background to save to HyperCode Core memory
      try {
        await sendMessage('mcp:save-context', {
          content,
          name: title,
          source: 'auto-capture',
          sourceUrl: currentUrl,
          sourceTitle: title,
          timestamp: Date.now(),
        }, 'background');
        logger.debug('Sent page capture to background for global memory');
      } catch (err) {
        logger.warn('Failed to send page capture to background', err);
      }

      this.lastCapturedUrl = currentUrl;
    } catch (error) {
      logger.error('Error during page capture:', error);
    }
  }

  private extractPageContent(): string {
    const url = window.location.href;
    const body = document.body;
    if (!body) return '';

    // Special handling for known AI chat interfaces to extract clean session logs
    if (url.includes('chatgpt.com') || url.includes('claude.ai')) {
      const messages = Array.from(document.querySelectorAll('.prose, .markdown-body, [data-message-author-role]'));
      if (messages.length > 0) {
        return messages.map(m => m.textContent?.trim()).filter(Boolean).join('\n\n---\n\n');
      }
    }

    // Default basic text extraction
    const clone = body.cloneNode(true) as HTMLElement;
    const toRemove = clone.querySelectorAll('script, style, nav, footer, header, iframe, noscript, [role="navigation"]');
    toRemove.forEach(el => el.remove());

    return clone.innerText || clone.textContent || '';
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) this.scheduleCapture();
  }
}

export const memoryCaptureService = MemoryCaptureService.getInstance();
