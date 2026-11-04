import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEmail } from "../supabase/functions/_shared/email.mjs";
import { safeUrl, money } from "../src/lib/format.js";

test("convite escapa conteúdo do organizador e aponta para o domínio configurado", () => {
  const email = buildEmail(
    {
      kind: "invitation",
      group_id: "grupo",
      payload: {
        token: "a".repeat(64),
        group_name: "<img src=x onerror=alert(1)>",
      },
    },
    "https://amigo.example",
  );
  assert(!email.html.includes("<img"));
  assert(email.html.includes("&lt;img"));
  assert(email.text.includes(`https://amigo.example/invite/${"a".repeat(64)}`));
});
test("notificação de sorteio não contém o nome do presenteado nem o mapa de pares", () => {
  const email = buildEmail(
    {
      kind: "draw_ready",
      group_id: "grupo",
      payload: { group_name: "Natal", recipient_name: "NOME-SIGILOSO" },
    },
    "https://amigo.example",
  );
  assert(!JSON.stringify(email).includes("NOME-SIGILOSO"));
  assert(email.text.includes("/groups/grupo"));
});
test("links de presentes não aceitam protocolos executáveis e valores usam centavos", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,teste",
    "file:///x",
    "não é um link",
  ])
    assert.equal(safeUrl(value), "");
  assert.equal(safeUrl("https://example.com/gift"), "https://example.com/gift");
  assert.match(money(1050), /10,50/);
});
