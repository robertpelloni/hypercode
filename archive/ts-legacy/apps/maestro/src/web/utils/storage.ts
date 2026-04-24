/**
 * Safe storage utility that falls back to in-memory storage if localStorage is unavailable
 */

class MemoryStorage implements Storage {
	private data: Record<string, string> = {};

	get length(): number {
		return Object.keys(this.data).length;
	}

	clear(): void {
		this.data = {};
	}

	getItem(key: string): string | null {
		return this.data[key] || null;
	}

	key(index: number): string | null {
		const keys = Object.keys(this.data);
		return keys[index] || null;
	}

	removeItem(key: string): void {
		delete this.data[key];
	}

	setItem(key: string, value: string): void {
		this.data[key] = value;
	}
}

function getSafeStorage(): Storage {
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			// Test if we can actually use it
			const testKey = '__storage_test__';
			window.localStorage.setItem(testKey, testKey);
			window.localStorage.removeItem(testKey);
			return window.localStorage;
		}
	} catch (e) {
		// Silence expected error in sandboxed contexts
	}
	return new MemoryStorage();
}

export const safeStorage = getSafeStorage();
