declare module 'express' {
  export interface Request<P = any, ResBody = any, ReqBody = any, ReqQuery = any> {
    params: P;
    body: ReqBody;
    query: ReqQuery;
  }

  export interface Response<ResBody = any> {
    status(code: number): this;
    json(body: ResBody): this;
    send(body?: any): this;
    setHeader(name: string, value: string): this;
  }

  export type Handler = (...args: any[]) => any;

  export interface Router {
    get: (...handlers: any[]) => Router;
    post: (...handlers: any[]) => Router;
    put: (...handlers: any[]) => Router;
    use: (...handlers: any[]) => Router;
  }

  export interface Express extends Router {
    listen(port: number, cb?: () => void): void;
  }

  export default function express(): Express;
  export function Router(): Router;
}

declare module 'pdfkit' {
  interface PDFOptions {
    margin?: number;
  }

  class PDFDocument {
    constructor(options?: PDFOptions);
    pipe(destination: any): void;
    fontSize(size: number): PDFDocument;
    text(text: string, options?: any): PDFDocument;
    moveDown(lines?: number): PDFDocument;
    end(): void;
  }

  export default PDFDocument;
}

declare module 'dotenv' {
  interface DotenvConfigOutput {
    error?: Error;
    parsed?: Record<string, string>;
  }
  export function config(): DotenvConfigOutput;
  export default { config }: { config: typeof config };
}

declare const process: {
  env: Record<string, string | undefined>;
};
