/** @type {import('next').NextConfig} */
const nextConfig = {
	// Skip static generation for pages that need runtime data
	output: "standalone",

	// Skip static page generation
	skipTrailingSlashRedirect: true,

	// Disable static optimization for all pages
	images: {
		unoptimized: true,
	},

	// Disable strict mode to avoid double renders
	reactStrictMode: false,

	// Transpile packages
	transpilePackages: ["@borg/ui"],

	// Turbopack config (Next.js 16 default)
	turbopack: {
		root: require("path").resolve(__dirname, "..", ".."),
	},

	// Silence type errors during build
	typescript: {
		ignoreBuildErrors: false,
	},
};

module.exports = nextConfig;
