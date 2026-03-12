import type { ChatSurfaceMessageRole } from './chatObserver';

export type ChatSurfaceRoleSelectors = Partial<Record<ChatSurfaceMessageRole, string[]>>;
export type ChatSurfaceStreamingSelectors = string[];

type MessageRoleInferenceOptions = {
    roleSelectors?: ChatSurfaceRoleSelectors;
};

type MessageStreamingInferenceOptions = {
    streamingSelectors?: ChatSurfaceStreamingSelectors;
};

type MessageSourceIdOptions = {
    adapterId?: string;
};

function collectSignalElements(element: Element): Element[] {
    const elements: Element[] = [];
    let current: Element | null = element;
    let depth = 0;

    while (current && depth < 6) {
        elements.push(current);
        current = current.parentElement;
        depth += 1;
    }

    return elements;
}

function collectSignalText(elements: Element[]): string {
    return elements
        .flatMap((element) => [
            element.getAttribute('data-message-author-role'),
            element.getAttribute('data-role'),
            element.getAttribute('role'),
            element.getAttribute('aria-label'),
            element.getAttribute('data-testid'),
            (element as HTMLElement).dataset?.author,
            (element as HTMLElement).dataset?.messageAuthorRole,
            (element as HTMLElement).className,
        ])
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ')
        .toLowerCase();
}

function matchesSelectors(element: Element, selectors: string[] | undefined): boolean {
    if (!selectors?.length) {
        return false;
    }

    return selectors.some((selector) => {
        try {
            return element.matches(selector)
                || Boolean(element.closest(selector))
                || Boolean(element.querySelector(selector));
        } catch {
            return false;
        }
    });
}

export function inferChatSurfaceRole(element: Element, options: MessageRoleInferenceOptions = {}): ChatSurfaceMessageRole {
    const roleSelectors = options.roleSelectors;

    if (roleSelectors) {
        if (matchesSelectors(element, roleSelectors.user)) return 'user';
        if (matchesSelectors(element, roleSelectors.assistant)) return 'assistant';
        if (matchesSelectors(element, roleSelectors.system)) return 'system';
        if (matchesSelectors(element, roleSelectors.tool)) return 'tool';
    }

    const roleSignals = collectSignalText(collectSignalElements(element));

    if (/(^|\b)(user|human|prompt)(\b|$)/.test(roleSignals)) return 'user';
    if (/(^|\b)(assistant|model|bot|ai|response)(\b|$)/.test(roleSignals)) return 'assistant';
    if (/(^|\b)(system)(\b|$)/.test(roleSignals)) return 'system';
    if (/(^|\b)(tool|function)(_result|_call)?(\b|$)/.test(roleSignals)) return 'tool';
    return 'unknown';
}

export function inferChatSurfaceStreaming(element: Element, options: MessageStreamingInferenceOptions = {}): boolean {
    if (matchesSelectors(element, options.streamingSelectors)) {
        return true;
    }

    const streamingSignals = collectSignalText(collectSignalElements(element));

    if (element.getAttribute('aria-busy') === 'true') {
        return true;
    }

    if (/(stream|streaming|typing|loading|thinking|pending|generating|cursor)/.test(streamingSignals)) {
        return true;
    }

    return matchesSelectors(element, [
        '[aria-busy="true"]',
        '[data-is-streaming="true"]',
        '[class*="typing"]',
        '[class*="stream"]',
        '[class*="thinking"]',
        '[class*="loading"]',
        '[class*="cursor"]',
    ]);
}

function normalizeSourceIdSegment(value: string): string {
    return value
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9:_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function isLikelyStableAttributeValue(attributeName: string, value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }

    if (attributeName === 'data-message-id' || attributeName === 'data-id' || attributeName === 'id') {
        return true;
    }

    if (attributeName === 'data-testid') {
        return /\d|[a-f0-9]{8,}/i.test(trimmed);
    }

    return false;
}

export function deriveChatSurfaceSourceId(element: Element, options: MessageSourceIdOptions = {}): string | undefined {
    const adapterPrefix = normalizeSourceIdSegment(options.adapterId ?? 'surface');

    for (const signalElement of collectSignalElements(element)) {
        for (const attributeName of ['data-message-id', 'data-id', 'id', 'data-testid']) {
            const attributeValue = signalElement.getAttribute(attributeName);
            if (!attributeValue || !isLikelyStableAttributeValue(attributeName, attributeValue)) {
                continue;
            }

            const normalizedAttribute = normalizeSourceIdSegment(attributeName);
            const normalizedValue = normalizeSourceIdSegment(attributeValue);
            if (!normalizedValue) {
                continue;
            }

            return `dom:${adapterPrefix}:${normalizedAttribute}:${normalizedValue}`;
        }
    }

    return undefined;
}