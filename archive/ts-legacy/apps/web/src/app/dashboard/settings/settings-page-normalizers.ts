export function formatSettingsConfig(payload: unknown): string {
    if (payload === undefined) {
        return '';
    }

    try {
        return JSON.stringify(payload, null, 2);
    } catch {
        return JSON.stringify({
            error: 'Configuration payload is not serializable.',
        }, null, 2);
    }
}

export function getSettingsSaveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim().length > 0) {
        return error.trim();
    }

    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) {
            return message.trim();
        }
    }

    return 'Unknown error';
}