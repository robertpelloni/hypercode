export const runtime = 'nodejs';

const DEFAULT_UPSTREAM_TRPC_URL = 'http://127.0.0.1:3001/trpc';

function resolveUpstreamBase(): string {
  return process.env.BORG_TRPC_UPSTREAM?.trim() || DEFAULT_UPSTREAM_TRPC_URL;
}

function buildUpstreamUrl(req: Request): URL {
  const incomingUrl = new URL(req.url);
  const upstreamBase = resolveUpstreamBase().replace(/\/$/, '');
  const pathMatch = incomingUrl.pathname.match(/\/api\/trpc\/?(.*)$/);
  const procedurePath = pathMatch?.[1] ? `/${pathMatch[1]}` : '';
  const upstreamUrl = new URL(`${upstreamBase}${procedurePath}`);
  upstreamUrl.search = incomingUrl.search;
  return upstreamUrl;
}

function cloneHeaders(req: Request): Headers {
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');
  return headers;
}

async function handler(req: Request): Promise<Response> {
  const upstreamUrl = buildUpstreamUrl(req);
  const headers = cloneHeaders(req);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.text() : undefined;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: 'TRPC_UPSTREAM_UNAVAILABLE',
        message,
        upstream: upstreamUrl.toString(),
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}

export { handler as GET, handler as POST };
