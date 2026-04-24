
import { BrowserService } from '../src/services/BrowserService.js';

async function main() {
    console.log("🚀 Verifying Phase 48: The Navigator (Puppeteer)...");
    const browser = new BrowserService();

    try {
        console.log("1. Launching Browser...");
        await browser.launch();

        console.log("2. Navigating to Example.com...");
        // Use example.com as it's stable and light
        const page = await browser.navigate('https://example.com');

        console.log(`✅ Page Loaded: "${page.title}" (ID: ${page.id})`);
        console.log(`📄 Content Preview:\n${page.content.substring(0, 200)}...`);

        if (!page.content.includes("Example Domain")) {
            throw new Error("Content mismatch! Expected 'Example Domain'");
        }

        console.log("3. Screenshotting...");
        const b64 = await browser.screenshot(page.id);
        if (b64.length > 100) {
            console.log(`✅ Screenshot captured (${b64.length} bytes base64)`);
        } else {
            throw new Error("Screenshot failed (too small)");
        }

        console.log("3.5. Extracting Content...");
        const extractedMarkdown = await browser.extract(page.id);
        console.log(`extractedMarkdown preview: ${extractedMarkdown.substring(0, 100)}...`);
        if (!extractedMarkdown.includes("Example Domain")) {
            throw new Error("Extraction failed: Content mismatch");
        }
        console.log("✅ Content Extraction Verified");

        console.log("4. Closing...");
        await browser.close(page.id);
        await browser.closeAll();

        console.log("🎉 Verification SUCCESS!");
        process.exit(0);

    } catch (e) {
        console.error("❌ Verification FAILED:", e);
        if (browser) await browser.closeAll();
        process.exit(1);
    }
}

main();
