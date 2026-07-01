type NormalizeN8nInput = {
  httpOk: boolean;
  status?: number;
  body?: any;
  error?: string;
};

export type NormalizedN8nResult = {
  ok: boolean;
  status?: number;
  body?: any;
  error?: string;
};

export function normalizeN8nResult(input: NormalizeN8nInput): NormalizedN8nResult {
  const bodyOk = input.body?.ok;
  const ok = input.httpOk && bodyOk !== false;
  const bodyError =
    input.body?.error ??
    input.body?.message ??
    input.body?.response?.message ??
    input.body?.raw;

  return {
    ok,
    status: input.status,
    body: input.body,
    error: ok ? undefined : input.error ?? bodyError ?? `HTTP ${input.status ?? "unknown"}`,
  };
}
