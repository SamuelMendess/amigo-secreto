import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmailHandler } from "../supabase/functions/_shared/handler.mjs";
const id = "11111111-1111-4111-8111-111111111111";
function fixture({
  owner = "user",
  validUser = true,
  providerStatus = 200,
} = {}) {
  const calls = [];
  const environment = {
    APP_URL: "https://amigo.example",
    RESEND_API_KEY: "only-server",
    EMAIL_FROM: "Amigo <convites@amigo.example>",
    EMAIL_WORKER_SECRET: "worker-only",
    SUPABASE_URL: "https://backend.example",
    SUPABASE_SERVICE_ROLE_KEY: "server-only",
  };
  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user: validUser
            ? { id: "user", email_confirmed_at: "2026-01-01" }
            : null,
        },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { owner_id: owner }, error: null }),
        }),
      }),
    }),
    rpc: async (name, args) => {
      calls.push({ name, args });
      return {
        data:
          name === "claim_group_emails"
            ? [
                {
                  id: "job-1",
                  recipient: "invited@example.test",
                  kind: "invitation",
                  group_id: id,
                  payload: { group_name: "Turma", token: "a".repeat(64) },
                },
              ]
            : null,
        error: null,
      };
    },
  };
  const handler = createEmailHandler({
    createClient: () => client,
    env: (key) => environment[key],
    pause: async () => {},
    send: async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify(
          providerStatus === 200 ? { id: "provider-1" } : { message: "falha" },
        ),
        { status: providerStatus },
      );
    },
  });
  return { calls, handler, environment };
}
const request = (headers) =>
  new Request("https://edge.example/process-emails", {
    method: "POST",
    headers,
    body: JSON.stringify({ groupId: id }),
  });
test("envio exige sessão válida e não aceita a chave pública como autenticação", async () => {
  const { handler, calls } = fixture();
  assert.equal((await handler(request({ apikey: "public" }))).status, 401);
  assert.equal(
    (await handler(request({ "x-worker-secret": "wrong" }))).status,
    401,
  );
  assert.equal(calls.length, 0);
  const invalid = fixture({ validUser: false });
  assert.equal(
    (await invalid.handler(request({ Authorization: "Bearer invalid" })))
      .status,
    401,
  );
});
test("participante que não organiza não consegue enviar avisos de outro grupo", async () => {
  const { handler, calls } = fixture({ owner: "another-user" });
  assert.equal(
    (await handler(request({ Authorization: "Bearer user-session" }))).status,
    403,
  );
  assert.equal(calls.length, 0);
});
test("envio autorizado usa destinatário da fila e chave estável para evitar duplicatas", async () => {
  const { handler, calls } = fixture();
  assert.equal(
    (
      await handler(
        request({
          Authorization: "Bearer user-session",
          Origin: "https://amigo.example",
        }),
      )
    ).status,
    200,
  );
  const sent = calls.find((c) => c.url);
  assert.equal(sent.options.headers["Idempotency-Key"], "group-email/job-1");
  assert.deepEqual(JSON.parse(sent.options.body).to, ["invited@example.test"]);
  assert.equal(
    calls.find((c) => c.name === "finish_group_email").args.p_sent,
    true,
  );
});
test("falha do provedor preserva mensagem para nova tentativa", async () => {
  const { handler, calls } = fixture({ providerStatus: 429 });
  const response = await handler(
    request({ Authorization: "Bearer user-session" }),
  );
  assert.equal((await response.json()).failed, 1);
  assert.equal(
    calls.find((c) => c.name === "finish_group_email").args.p_sent,
    false,
  );
});
test("agendador usa segredo próprio e e-mails indisponíveis não são descartados", async () => {
  const { handler, calls, environment } = fixture();
  assert.equal(
    (await handler(request({ "x-worker-secret": "worker-only" }))).status,
    200,
  );
  assert.equal(
    calls.find((c) => c.name === "claim_group_emails").args.p_group_id,
    null,
  );
  delete environment.RESEND_API_KEY;
  assert.equal(
    (await handler(request({ "x-worker-secret": "worker-only" }))).status,
    503,
  );
});
test("origem externa e payload malformado são recusados", async () => {
  const { handler, calls } = fixture();
  assert.equal(
    (
      await handler(
        request({
          Authorization: "Bearer user",
          Origin: "https://other.example",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handler(
        new Request("https://edge.example", {
          method: "POST",
          body: "invalid",
        }),
      )
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
});
