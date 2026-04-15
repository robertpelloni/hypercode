declare module 'pdf-parse' {
    function PDF(dataBuffer: Buffer, options?: any): Promise<{
        numpages: number;
        numrender: number;
        info: any;
        metadata: any;
        text: string;
        version: string;
    }>;
    export = PDF;
}
