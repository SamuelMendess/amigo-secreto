import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text unique, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon, service_role;
    grant execute on function auth.uid() to authenticated, anon, service_role;
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202611040001_platform.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202611040002_email_retries.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
after(async () => {
  await db?.close();
});
async function admin() {
  await db.exec("reset role");
}
async function as(id, role = "authenticated") {
  await admin();
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    id || "",
  ]);
  await db.exec(`set role ${role}`);
}
async function person(confirmed = true) {
  await admin();
  const id = randomUUID();
  const email = `${id}@example.test`;
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ($1,$2,$3,$4)",
    [
      id,
      email,
      confirmed ? new Date().toISOString() : null,
      { display_name: `Pessoa ${id.slice(0, 4)}` },
    ],
  );
  return { id, email };
}
async function group(owner, size = 1) {
  await as(owner.id);
  const { rows } = await db.query(
    "select public.create_exchange_group('Encontro de teste', current_date + 30, 10000, 'BRL', '') as id",
  );
  const id = rows[0].id;
  const people = [owner];
  for (let i = 1; i < size; i++) {
    const user = await person();
    people.push(user);
    await db.query(
      "insert into public.group_members(group_id,user_id,display_name) values($1,$2,$3)",
      [id, user.id, `Pessoa ${i}`],
    );
  }
  return { id, people };
}
async function invite(owner, groupId, email) {
  await as(owner.id);
  const { rows } = await db.query(
    "select public.create_group_invite($1,$2) as id",
    [groupId, email],
  );
  await admin();
  const job = (
    await db.query(
      "select payload->>'token' as token, id as job_id from amigo_private.email_jobs where invite_id = $1",
      [rows[0].id],
    )
  ).rows[0];
  return { id: rows[0].id, ...job };
}

test("cadastro não confirmado e escrita direta não criam grupos nem associações", async () => {
  const user = await person(false);
  await as(user.id);
  await assert.rejects(
    db.query(
      "select public.create_exchange_group('Turma', current_date + 1, 100, 'BRL', '')",
    ),
    /Confirme seu e-mail/,
  );
  await assert.rejects(
    db.query(
      "insert into public.exchange_groups(owner_id,name,event_date,budget_cents) values($1,'Turma',current_date,100)",
      [user.id],
    ),
    /permission denied/,
  );
});
test("criador participa automaticamente e outro usuário não enxerga o grupo", async () => {
  const owner = await person();
  const stranger = await person();
  const g = await group(owner);
  await as(owner.id);
  assert.equal(
    (await db.query("select * from public.exchange_groups")).rows.length,
    1,
  );
  assert.equal(
    (
      await db.query("select * from public.group_members where group_id=$1", [
        g.id,
      ])
    ).rows[0].user_id,
    owner.id,
  );
  await as(stranger.id);
  assert.equal(
    (await db.query("select * from public.exchange_groups where id=$1", [g.id]))
      .rows.length,
    0,
  );
  await assert.rejects(
    db.query("select public.create_group_invite($1,$2)", [
      g.id,
      stranger.email,
    ]),
    /Somente o organizador/,
  );
});
test("convite é vinculado ao e-mail, usa hash e tem aceite idempotente", async () => {
  const owner = await person();
  const guest = await person();
  const stranger = await person();
  const g = await group(owner);
  const inv = await invite(owner, g.id, guest.email.toUpperCase());
  assert.match(inv.token, /^[a-f0-9]{64}$/);
  const hash = (
    await db.query("select token_hash from public.group_invites where id=$1", [
      inv.id,
    ])
  ).rows[0].token_hash;
  assert.notEqual(hash, inv.token);
  await as(stranger.id);
  await assert.rejects(
    db.query("select public.inspect_group_invite($1)", [inv.token]),
    /Convite indisponível/,
  );
  await assert.rejects(
    db.query("select public.accept_group_invite($1)", [inv.token]),
    /Convite indisponível/,
  );
  await as(guest.id);
  const inspection = (
    await db.query("select public.inspect_group_invite($1) as value", [
      inv.token,
    ])
  ).rows[0].value;
  assert.equal(inspection.group_id, g.id);
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await db.query("select public.accept_group_invite($1) as id", [
          inv.token,
        ])
      ).rows[0].id,
      g.id,
    );
  assert.equal(
    (
      await db.query("select * from public.group_members where group_id=$1", [
        g.id,
      ])
    ).rows.length,
    2,
  );
  assert.equal(
    (
      await db.query("select * from public.group_invites where group_id=$1", [
        g.id,
      ])
    ).rows.length,
    0,
  );
});
test("convite expirado ou cancelado não permite entrada", async () => {
  const owner = await person();
  const guest = await person();
  const g = await group(owner);
  const expired = await invite(owner, g.id, guest.email);
  await db.query(
    "update public.group_invites set expires_at=now()-interval '1 minute' where id=$1",
    [expired.id],
  );
  await as(guest.id);
  await assert.rejects(
    db.query("select public.accept_group_invite($1)", [expired.token]),
    /expirou/,
  );
  const fresh = await invite(owner, g.id, guest.email);
  await as(owner.id);
  await db.query("select public.revoke_group_invite($1)", [fresh.id]);
  await as(guest.id);
  await assert.rejects(
    db.query("select public.accept_group_invite($1)", [fresh.token]),
    /indisponível/,
  );
});
test("limite de 50 inclui vagas reservadas e cancelamento libera vaga", async () => {
  const owner = await person();
  const g = await group(owner, 49);
  const guest = await person();
  const inv = await invite(owner, g.id, guest.email);
  await as(owner.id);
  await assert.rejects(
    db.query("select public.create_group_invite($1,$2)", [
      g.id,
      "extra@example.test",
    ]),
    /50 vagas/,
  );
  await db.query("select public.revoke_group_invite($1)", [inv.id]);
  const replacement = await invite(owner, g.id, guest.email);
  await as(guest.id);
  await db.query("select public.accept_group_invite($1)", [replacement.token]);
  await as(owner.id);
  assert.equal(
    (
      await db.query("select * from public.group_members where group_id=$1", [
        g.id,
      ])
    ).rows.length,
    50,
  );
  await assert.rejects(
    db.query("select public.create_group_invite($1,$2)", [
      g.id,
      "extra@example.test",
    ]),
    /50 vagas/,
  );
});
test("sorteio exige dois participantes, organizador e ausência de convites pendentes", async () => {
  const owner = await person();
  const g = await group(owner);
  const guest = await person();
  await as(owner.id);
  await assert.rejects(
    db.query("select public.draw_group($1)", [g.id]),
    /2 a 50/,
  );
  const inv = await invite(owner, g.id, guest.email);
  await as(owner.id);
  await assert.rejects(
    db.query("select public.draw_group($1)", [g.id]),
    /convites pendentes/,
  );
  await as(guest.id);
  await db.query("select public.accept_group_invite($1)", [inv.token]);
  await assert.rejects(
    db.query("select public.draw_group($1)", [g.id]),
    /Somente o organizador/,
  );
});
for (const size of [2, 10, 50])
  test(`sorteio com ${size}: todos dão e recebem uma vez, sem tirar a si mesmos`, async () => {
    const owner = await person();
    const g = await group(owner, size);
    await as(owner.id);
    await db.query("select public.draw_group($1)", [g.id]);
    await admin();
    const pairs = (
      await db.query(
        "select * from public.draw_assignments where group_id=$1 order by giver_id",
        [g.id],
      )
    ).rows;
    assert.equal(pairs.length, size);
    assert.equal(new Set(pairs.map((p) => p.recipient_id)).size, size);
    assert(pairs.every((p) => p.giver_id !== p.recipient_id));
    for (const user of g.people) {
      await as(user.id);
      const visible = (
        await db.query(
          "select * from public.draw_assignments where group_id=$1",
          [g.id],
        )
      ).rows;
      assert.equal(visible.length, 1);
      assert.equal(visible[0].giver_id, user.id);
    }
    await as(owner.id);
    await db.query("select public.draw_group($1)", [g.id]);
    await admin();
    assert.deepEqual(
      (
        await db.query(
          "select * from public.draw_assignments where group_id=$1 order by giver_id",
          [g.id],
        )
      ).rows,
      pairs,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from amigo_private.email_jobs where group_id=$1 and kind='draw_ready'",
          [g.id],
        )
      ).rows[0].n,
      size,
    );
    await as(owner.id);
    await assert.rejects(
      db.query("select public.create_group_invite($1,$2)", [
        g.id,
        "late@example.test",
      ]),
      /já foi sorteado/,
    );
  });
test("desejos só podem ser escritos pelo dono e lidos por ele ou por quem o tirou", async () => {
  const owner = await person();
  const g = await group(owner, 10);
  const stranger = await person();
  for (const user of g.people) {
    await as(user.id);
    await db.query(
      "insert into public.wishlist_items(group_id,user_id,title) values($1,$2,'Livro')",
      [g.id, user.id],
    );
  }
  await as(owner.id);
  assert.equal(
    (
      await db.query("select * from public.wishlist_items where group_id=$1", [
        g.id,
      ])
    ).rows.length,
    1,
  );
  await assert.rejects(
    db.query(
      "insert into public.wishlist_items(group_id,user_id,title) values($1,$2,'Fraude')",
      [g.id, g.people[1].id],
    ),
    /row-level security/,
  );
  await db.query("select public.draw_group($1)", [g.id]);
  const ownResult = (
    await db.query(
      "select recipient_id from public.draw_assignments where group_id=$1",
      [g.id],
    )
  ).rows[0].recipient_id;
  const visible = (
    await db.query("select * from public.wishlist_items where group_id=$1", [
      g.id,
    ])
  ).rows;
  assert.equal(visible.length, 2);
  assert(visible.some((w) => w.user_id === ownResult));
  const targetWish = visible.find((w) => w.user_id === ownResult);
  assert.equal(
    (
      await db.query(
        "update public.wishlist_items set title='Fraude' where id=$1 returning *",
        [targetWish.id],
      )
    ).rows.length,
    0,
  );
  await as(stranger.id);
  assert.equal(
    (
      await db.query("select * from public.wishlist_items where group_id=$1", [
        g.id,
      ])
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into public.wishlist_items(group_id,user_id,title) values($1,$2,'Fraude')",
      [g.id, stranger.id],
    ),
    /row-level security/,
  );
});
test("tokens e fila de e-mail são privados; reenvio não reclama jobs já em processamento", async () => {
  const owner = await person();
  const guest = await person();
  const g = await group(owner);
  const inv = await invite(owner, g.id, guest.email);
  await as(owner.id);
  await assert.rejects(
    db.query("select * from amigo_private.email_jobs"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select public.claim_group_emails($1)", [g.id]),
    /permission denied/,
  );
  await as(null, "service_role");
  const jobs = (
    await db.query("select public.claim_group_emails($1) as job", [g.id])
  ).rows;
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].job.payload.token, inv.token);
  assert.equal(
    (await db.query("select public.claim_group_emails($1)", [g.id])).rows
      .length,
    0,
  );
  await db.query("select public.finish_group_email($1,true,$2)", [
    inv.job_id,
    "provider-123",
  ]);
  assert.equal(
    (await db.query("select public.claim_group_emails($1)", [g.id])).rows
      .length,
    0,
  );
  await admin();
  assert.deepEqual(
    (
      await db.query("select payload from amigo_private.email_jobs where id=$1", [
        inv.job_id,
      ])
    ).rows[0].payload,
    {},
  );
  await as(owner.id);
  assert.equal(
    (
      await db.query(
        "select email_state from public.group_invites where id=$1",
        [inv.id],
      )
    ).rows[0].email_state,
    "sent",
  );
});
test("inválido, anônimo e tentativa de acessar desejos com javascript: são recusados", async () => {
  await as(null, "anon");
  await assert.rejects(
    db.query("select * from public.exchange_groups"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select public.draw_group($1)", [randomUUID()]),
    /permission denied/,
  );
  const owner = await person();
  const g = await group(owner);
  await as(owner.id);
  await assert.rejects(
    db.query(
      "insert into public.wishlist_items(group_id,user_id,title,url) values($1,$2,'Link','javascript:alert(1)')",
      [g.id, owner.id],
    ),
    /check constraint/,
  );
});
test("fila limita tentativas automáticas e somente o organizador pode solicitar nova tentativa", async () => {
  const owner = await person();
  const guest = await person();
  const g = await group(owner);
  const inv = await invite(owner, g.id, guest.email);
  await db.query("update amigo_private.email_jobs set attempts=5 where id=$1", [
    inv.job_id,
  ]);
  await as(null, "service_role");
  assert.equal(
    (await db.query("select public.claim_group_emails($1)", [g.id])).rows
      .length,
    0,
  );
  await as(guest.id);
  await assert.rejects(
    db.query("select public.retry_group_emails($1)", [g.id]),
    /Somente o organizador/,
  );
  await as(owner.id);
  await db.query("select public.retry_group_emails($1)", [g.id]);
  await as(null, "service_role");
  assert.equal(
    (await db.query("select public.claim_group_emails($1)", [g.id])).rows
      .length,
    1,
  );
});
