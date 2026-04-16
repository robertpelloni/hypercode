/**
 * Utility functions for color manipulation and contrast checking.
 */

/**
 * Convert a hex color string to RGB components.
 * Supports #RGB and #RRGGBB formats.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
}

/**
 * Calculate the relative luminance of a color.
 * Based on WCAG 2.0 formula.
 */
export function getLuminance(hex: string): number {
	const rgb = hexToRgb(hex);
	if (!rgb) return 0;

	const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determine whether black or white text should be used on a given background color
 * to ensure maximum readability and contrast.
 */
export function getContrastColor(backgroundHex: string): '#FFFFFF' | '#000000' {
	const luminance = getLuminance(backgroundHex);
	// Threshold of 0.179 is from WCAG guidelines
	return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Determine if a color is "dark" based on its luminance.
 */
export function isDarkColor(hex: string): boolean {
	return getLuminance(hex) < 0.5;
}
