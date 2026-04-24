/**
 * Ambient type declaration for 'pdf-parse'.
 * pdf-parse does not ship its own types and @types/pdf-parse does not exist.
 * This stub satisfies the TypeScript strict mode check for dynamic imports.
 */
declare module 'pdf-parse' {
    interface PdfData {
        numpages: number;
        numrender: number;
        info: Record<string, unknown>;
        metadata: Record<string, unknown> | null;
        version: string;
        text: string;
    }

    function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PdfData>;
    export default pdfParse;
}
