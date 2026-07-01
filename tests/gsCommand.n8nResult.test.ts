import assert from "node:assert/strict";
import test from "node:test";

import { normalizeN8nResult } from "../src/lib/gsCommand.n8nResult.ts";

test("treats HTTP 200 with ok false body as failed n8n command", () => {
  const result = normalizeN8nResult({
    httpOk: true,
    status: 200,
    body: { ok: false, error: "invalid_action" },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_action");
});

test("treats HTTP 200 with ok true body as successful n8n command", () => {
  const result = normalizeN8nResult({
    httpOk: true,
    status: 200,
    body: { ok: true, status: "done" },
  });

  assert.equal(result.ok, true);
  assert.equal(result.error, undefined);
});
