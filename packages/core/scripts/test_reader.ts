
import { ReaderTools } from '@hypercode/tools';
import fs from 'fs';

async function main() {
    console.log("TESTING ReaderTools...");
    const tool = ReaderTools.find(t => t.name === "read_page");
    if (!tool) throw new Error("Tool not found");

    const url = "https://example.com";
    console.log(`Reading ${url}...`);

    // @ts-ignore
    const result = await tool.handler({ url });

    console.log("Result:", JSON.stringify(result, null, 2));
    fs.writeFileSync('reader_output.json', JSON.stringify(result, null, 2));
}

main().catch(e => {
    console.error(e);
    fs.writeFileSync('reader_error.txt', e.stack || e.message);
});
