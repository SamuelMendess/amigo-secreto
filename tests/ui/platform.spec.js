import { test, expect } from "@playwright/test";

const ownerId = "11111111-1111-4111-8111-111111111111";
const groupId = "22222222-2222-4222-8222-222222222222";
const recipientId = "33333333-3333-4333-8333-333333333333";
const user = {
  id: ownerId,
  email: "samuel@example.test",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: new Date().toISOString(),
  user_metadata: { display_name: "Samuel" },
};
const session = {
  access_token: `e30.${Buffer.from(JSON.stringify({ sub: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`,
  refresh_token: "test-refresh",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user,
};

async function setup(
  page,
  { loggedIn = true, count = 2, pending = false, mailFailure = false } = {},
) {
  const state = {
    group: {
      id: groupId,
      owner_id: ownerId,
      name: "Natal da família 2026",
      event_date: "2026-12-25",
      budget_cents: 10000,
      currency: "BRL",
      description: "Nosso encontro de fim de ano.",
      status: "open",
    },
    members: Array.from({ length: count }, (_, i) => ({
      group_id: groupId,
      user_id: i === 0 ? ownerId : i === 1 ? recipientId : `member-${i}`,
      display_name: i === 0 ? "Samuel" : i === 1 ? "Marina" : `Convidado ${i}`,
    })),
    wishes: [],
    invites: pending
      ? [
          {
            id: "invite-1",
            email: "pessoa@example.test",
            status: "pending",
            email_state: "sent",
            expires_at: "2099-12-31",
          },
        ]
      : [],
    calls: [],
  };
  if (loggedIn)
    await page.addInitScript(
      (value) =>
        localStorage.setItem(
          "sb-test-project-auth-token",
          JSON.stringify(value),
        ),
      session,
    );
  await page.route("https://test-project.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const body = request.postDataJSON();
    state.calls.push({ path, body });
    let response = {};
    let status = 200;
    if (path.endsWith("/token")) response = session;
    else if (path.endsWith("/user")) response = user;
    else if (path.endsWith("/signup")) response = { user, session: null };
    else if (path.endsWith("/recover")) response = {};
    else if (path.endsWith("/logout")) response = {};
    else if (path.endsWith("/rpc/create_exchange_group")) response = groupId;
    else if (path.endsWith("/rpc/create_group_invite")) {
      state.invites.push({
        id: "new-invite",
        email: body.p_email,
        status: "pending",
        email_state: "queued",
        expires_at: "2099-12-31",
      });
      response = "new-invite";
    } else if (path.endsWith("/rpc/revoke_group_invite")) {
      state.invites = state.invites.map((i) =>
        i.id === body.p_invite_id ? { ...i, status: "revoked" } : i,
      );
      response = null;
    } else if (path.endsWith("/rpc/group_email_status"))
      response = { pending: mailFailure ? state.invites.length : 0, sent: 0 };
    else if (path.endsWith("/rpc/retry_group_emails")) response = null;
    else if (path.endsWith("/rpc/draw_group")) {
      state.group.status = "drawn";
      response = null;
    } else if (path.endsWith("/rpc/inspect_group_invite"))
      response = {
        group_id: groupId,
        name: state.group.name,
        event_date: state.group.event_date,
        status: "pending",
      };
    else if (path.endsWith("/rpc/accept_group_invite")) response = groupId;
    else if (path.endsWith("/functions/v1/process-emails")) {
      response = mailFailure
        ? { error: "Serviço indisponível" }
        : { sent: 1, failed: 0, processed: 1 };
      if (mailFailure) status = 503;
    } else if (path.endsWith("/exchange_groups"))
      response = url.searchParams.has("id") ? state.group : [state.group];
    else if (path.endsWith("/group_members")) response = state.members;
    else if (path.endsWith("/group_invites")) response = state.invites;
    else if (path.endsWith("/draw_assignments"))
      response =
        state.group.status === "drawn" ? [{ recipient_id: recipientId }] : [];
    else if (path.endsWith("/wishlist_items")) {
      if (request.method() === "POST") {
        state.wishes.push({ ...body, id: `wish-${state.wishes.length}` });
        response = null;
      } else if (request.method() === "DELETE") {
        state.wishes = state.wishes.filter(
          (w) => `eq.${w.id}` !== url.searchParams.get("id"),
        );
        response = null;
      } else
        response =
          url.searchParams.get("user_id") === `eq.${recipientId}`
            ? [
                {
                  id: "recipient-wish",
                  title: "Livro de mistério",
                  notes: "Adoro histórias com enigmas.",
                  url: "https://example.com/livro",
                },
              ]
            : state.wishes;
    } else {
      await route.abort();
      return;
    }
    await route.fulfill({
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    });
  });
  return state;
}
test("cadastro, entrada e recuperação de senha têm fluxos reais de formulário", async ({
  page,
}) => {
  const state = await setup(page, { loggedIn: false });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/desktop-login.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.getByLabel("Seu nome").fill("Samuel");
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("status")).toContainText("Confira seu e-mail");
  expect(
    state.calls.find((c) => c.path.endsWith("/signup")).body.data.display_name,
  ).toBe("Samuel");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await page
    .getByRole("button", { name: "Enviar link de recuperação" })
    .click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta");
});
test("criar grupo envia data, moeda e orçamento em centavos", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/groups");
  await page.getByRole("button", { name: "Criar grupo", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Criar grupo", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Criar grupo", exact: true }).click();
  await page.getByLabel("Nome do grupo").fill("Turma de amigos");
  await page.getByLabel("Data do encontro").fill("2099-12-25");
  await page.getByLabel("Valor máximo do presente").fill("125.50");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Criar grupo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Natal da família 2026", exact: true }),
  ).toBeVisible();
  const call = state.calls.find((c) =>
    c.path.endsWith("/rpc/create_exchange_group"),
  );
  expect(call.body.p_budget_cents).toBe(12550);
  expect(call.body.p_currency).toBe("BRL");
});
test("desejos podem ser adicionados e removidos", async ({ page }) => {
  await setup(page);
  await page.goto(`/groups/${groupId}?tab=wishes`);
  await page.getByLabel("Ideia de presente").fill("Quebra-cabeça");
  await page.getByLabel("Dicas (opcional)").fill("Mil peças");
  await page.getByRole("button", { name: "Adicionar desejo" }).click();
  await expect(
    page.getByRole("heading", { name: "Quebra-cabeça" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Excluir Quebra-cabeça" }).click();
  await expect(
    page.getByRole("heading", { name: "Quebra-cabeça" }),
  ).toHaveCount(0);
});
test("falha do provedor preserva convite e mostra como tentar novamente", async ({
  page,
}) => {
  const state = await setup(page, { mailFailure: true });
  await page.goto(`/groups/${groupId}`);
  await page.getByLabel("E-mail do participante").fill("pessoa@example.test");
  await page
    .getByRole("button", { name: "Enviar convite", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("avisos estão salvos");
  expect(state.invites).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Tentar enviar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tentar enviar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("avisos estão salvos");
  expect(
    state.calls.filter((c) => c.path.endsWith("/rpc/create_group_invite")),
  ).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Realizar sorteio" }),
  ).toBeDisabled();
});
test("sorteio tem confirmação, resultado pessoal e dicas do presenteado", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto(`/groups/${groupId}`);
  await page.getByRole("button", { name: "Realizar sorteio" }).click();
  await expect(page.getByRole("dialog")).toContainText("2 pessoas confirmadas");
  await page
    .getByRole("button", { name: "Confirmar sorteio", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Meu amigo secreto", exact: true })
    .click();
  await page.getByRole("button", { name: "Revelar meu amigo secreto" }).click();
  await expect(
    page.getByRole("heading", { name: "Marina", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Livro de mistério" }),
  ).toBeVisible();
  expect(
    state.calls.filter((c) => c.path.endsWith("/rpc/draw_group")),
  ).toHaveLength(1);
});
test("50 participantes bloqueiam novos convites na interface", async ({
  page,
}) => {
  await setup(page, { count: 50 });
  await page.goto(`/groups/${groupId}`);
  await expect(page.getByText("50/50 pessoas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enviar convite", exact: true }),
  ).toBeDisabled();
});
test("convite preserva seu destino durante o login e pode ser aceito", async ({
  page,
}) => {
  await setup(page, { loggedIn: false });
  const token = "a".repeat(64);
  await page.goto(`/invite/${token}`);
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Aceitar convite e participar" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Aceitar convite e participar" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/groups/${groupId}\\?tab=wishes`));
});
test("celular tem navegação legível e não apresenta rolagem horizontal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  await page.goto(`/groups/${groupId}?tab=wishes`);
  await expect(
    page.getByRole("heading", { name: "O que faria você sorrir?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-wishlist.png",
    fullPage: true,
  });
});
