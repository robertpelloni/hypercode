import { NextResponse } from 'next/server';

import { resolveLockedBorgBase } from '../../../../lib/hypercode-runtime';
import { resolveConfiguredOrchestratorBase } from '../../../../lib/orchestrator-config';

export const runtime = 'nodejs';

function resolveOrchestratorBase(): string | null {
  return resolveLockedBorgBase() ?? resolveConfiguredOrchestratorBase(process.env);
}

function buildProxyUrl(req: Request, orchestratorBase: string, pathSegments: string[]): URL {
  const incomingUrl = new URL(req.url);
  const targetUrl = new URL(`${orchestratorBase.replace(/\/$/, '')}/${pathSegments.join('/')}`);
  targetUrl.search = incomingUrl.search;
  return targetUrl;
}

function shouldStreamResponse(upstreamResponse: Response): boolean {
  const contentType = upstreamResponse.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.includes('text/event-stream');
}

async function buildProxyResponse(req: Request, upstreamResponse: Response): Promise<Response> {
  if (req.method === 'HEAD' || upstreamResponse.status === 204 || upstreamResponse.status === 205 || upstreamResponse.status === 304) {
    return new Response(null, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: upstreamResponse.headers,
    });
  }

  if (shouldStreamResponse(upstreamResponse)) {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: upstreamResponse.headers,
    });
  }

  const body = await upstreamResponse.arrayBuffer();
  return new Response(body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}

async function proxyRequest(
  req: Request,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const orchestratorBase = resolveOrchestratorBase();
  if (!orchestratorBase) {
    return NextResponse.json(
      { error: 'Orchestrator endpoint is not configured.' },
      { status: 503 },
    );
  }

  const { path = [] } = await context.params;
  const targetUrl = buildProxyUrl(req, orchestratorBase, path);
  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer(),
      duplex: req.method === 'GET' || req.method === 'HEAD' ? undefined : 'half',
    } as RequestInit);

    return await buildProxyResponse(req, upstreamResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'ORCHESTRATOR_UPSTREAM_UNAVAILABLE', message, upstream: targetUrl.toString() },
      { status: 502 },
    );
  }
}

export async function GET(req: Request, context: { params: Promise<{ path?: string[] }> }): Promise<Response> {
  return await proxyRequest(req, context);
}

export async function POST(req: Request, context: { params: Promise<{ path?: string[] }> }): Promise<Response> {
  return await proxyRequest(req, context);
}

export async function PUT(req: Request, context: { params: Promise<{ path?: string[] }> }): Promise<Response> {
  return await proxyRequest(req, context);
}

export async function PATCH(req: Request, context: { params: Promise<{ path?: string[] }> }): Promise<Response> {
  return await proxyRequest(req, context);
}

export async function DELETE(req: Request, context: { params: Promise<{ path?: string[] }> }): Promise<Response> {
  return await proxyRequest(req, context);
}
