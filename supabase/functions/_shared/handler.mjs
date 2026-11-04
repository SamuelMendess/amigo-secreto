import { buildEmail } from "./email.mjs";

export function createEmailHandler({
  createClient,
  env,
  send = fetch,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  return async (req) => {
    const appUrl = env("APP_URL");
    let allowedOrigin = "";
    try {
      if (appUrl) allowedOrigin = new URL(appUrl).origin;
    } catch {
      /* Configuração inválida é tratada abaixo. */
    }
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    };
    const reply = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    const origin = req.headers.get("Origin");
    if (origin && origin !== allowedOrigin)
      return reply({ error: "Origem não permitida." }, 403);
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (req.method !== "POST")
      return reply({ error: "Método não permitido." }, 405);
    if (!allowedOrigin || !env("RESEND_API_KEY") || !env("EMAIL_FROM"))
      return reply(
        {
          error:
            "O envio de e-mails está temporariamente indisponível. Os avisos foram preservados.",
        },
        503,
      );
    try {
      const rawBody = await req.text();
      if (rawBody.length > 4096)
        return reply({ error: "Pedido inválido." }, 400);
      let body;
      try {
        body = JSON.parse(rawBody || "{}");
      } catch {
        return reply({ error: "Pedido inválido." }, 400);
      }
      const supabase = createClient(
        env("SUPABASE_URL"),
        env("SUPABASE_SERVICE_ROLE_KEY"),
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const workerSecret = env("EMAIL_WORKER_SECRET");
      const isWorker =
        !!workerSecret && req.headers.get("x-worker-secret") === workerSecret;
      let groupId = null;
      if (!isWorker) {
        const jwt = req.headers
          .get("Authorization")
          ?.replace(/^Bearer\s+/i, "");
        if (!jwt) return reply({ error: "Entre na sua conta." }, 401);
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(jwt);
        if (authError || !user?.email_confirmed_at)
          return reply({ error: "Sua sessão expirou. Entre novamente." }, 401);
        groupId = body?.groupId;
        if (
          typeof groupId !== "string" ||
          !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(groupId)
        )
          return reply({ error: "Grupo inválido." }, 400);
        const { data: group, error } = await supabase
          .from("exchange_groups")
          .select("owner_id")
          .eq("id", groupId)
          .single();
        if (error || group?.owner_id !== user.id)
          return reply(
            { error: "Somente o organizador pode enviar os avisos." },
            403,
          );
      }
      const { data: jobs, error: claimError } = await supabase.rpc(
        "claim_group_emails",
        { p_group_id: groupId },
      );
      if (claimError) throw claimError;
      let sent = 0;
      let failed = 0;
      for (const job of jobs || []) {
        const email = buildEmail(job, appUrl);
        let providerId = null;
        try {
          const response = await send("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env("RESEND_API_KEY")}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `group-email/${job.id}`,
            },
            body: JSON.stringify({
              from: env("EMAIL_FROM"),
              to: [job.recipient],
              ...email,
            }),
            signal: AbortSignal.timeout(10000),
          });
          const result = await response.json();
          if (response.ok && result.id) providerId = result.id;
        } catch {
          /* Mantém a mensagem para tentativa posterior. */
        }
        const { error: finishError } = await supabase.rpc(
          "finish_group_email",
          { p_job_id: job.id, p_sent: !!providerId, p_provider_id: providerId },
        );
        if (finishError) throw finishError;
        if (providerId) sent++;
        else failed++;
        await pause(600);
      }
      return reply({ sent, failed, processed: (jobs || []).length });
    } catch {
      return reply(
        {
          error:
            "Não foi possível concluir o envio. Os avisos continuam salvos.",
        },
        500,
      );
    }
  };
}
