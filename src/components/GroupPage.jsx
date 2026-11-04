import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Gift,
  Mail,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "../lib/api";
import { dateLabel, errorText, money } from "../lib/format";
import Wishlist, { WishList } from "./Wishlist";
import { Avatar, Button, Field, Icon, Loading, Modal, Notice } from "./ui";

export default function GroupPage({ id, user, tab, navigate }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const refresh = useCallback(async () => {
    const group = await api.group(id);
    const [members, wishes, assignment, invites, emailStatus] =
      await Promise.all([
        api.members(id),
        api.wishes(id, user.id),
        api.assignment(id),
        group.owner_id === user.id ? api.invites(id) : [],
        group.owner_id === user.id
          ? api.rpc("group_email_status", { p_group_id: id })
          : null,
      ]);
    const recipient = assignment
      ? members.find((member) => member.user_id === assignment.recipient_id)
      : null;
    const recipientWishes = assignment
      ? await api.wishes(id, assignment.recipient_id)
      : [];
    setData({
      group,
      members,
      wishes,
      recipient,
      recipientWishes,
      invites,
      emailStatus,
    });
  }, [id, user.id]);
  useEffect(() => {
    let active = true;
    refresh().catch(() => {
      if (active)
        setLoadError(
          "Não foi possível abrir este grupo. Confira se você aceitou o convite e está usando a conta correta.",
        );
    });
    return () => {
      active = false;
    };
  }, [refresh]);
  // Atualiza resultados e aceites sem compartilhar pares por canais públicos.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh().catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function action(task) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function sendMail() {
    try {
      await api.sendEmails(id);
      setMessage("Os avisos disponíveis foram enviados.");
    } catch (err) {
      setError(errorText(err));
    }
    await refresh();
  }
  async function invite(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await action(async () => {
      await api.rpc("create_group_invite", {
        p_group_id: id,
        p_email: form.get("email"),
      });
      formElement.reset();
      setMessage("Convite criado. Preparando o e-mail…");
      await refresh();
      await sendMail();
    });
  }
  async function draw() {
    await action(async () => {
      await api.rpc("draw_group", { p_group_id: id });
      setConfirmDraw(false);
      setMessage(
        "Sorteio realizado! Cada participante já pode consultar seu resultado.",
      );
      await refresh();
      await sendMail();
    });
  }
  if (loadError)
    return (
      <main id="main" className="page">
        <Notice>{loadError}</Notice>
        <Button onClick={() => navigate("/groups")}>
          Voltar aos meus grupos
        </Button>
      </main>
    );
  if (!data)
    return (
      <main id="main" className="page">
        <Loading />
      </main>
    );
  const {
    group,
    members,
    wishes,
    recipient,
    recipientWishes,
    invites,
    emailStatus,
  } = data;
  const owner = group.owner_id === user.id;
  const pending = invites.filter(
    (i) => i.status === "pending" && new Date(i.expires_at) > new Date(),
  );
  const open = group.status === "open";
  return (
    <main id="main" className="page">
      <button className="text-button back" onClick={() => navigate("/groups")}>
        <Icon as={ArrowLeft} />
        Meus grupos
      </button>
      <div className="group-heading">
        <div>
          <span className={`badge ${open ? "" : "rose"}`}>
            {open ? "Reunindo a turma" : "Sorteio realizado"}
          </span>
          <h1>{group.name}</h1>
          <div className="group-meta">
            <span>
              <Icon as={CalendarDays} />
              {dateLabel(group.event_date)}
            </span>
            <span>
              <Icon as={Gift} />
              Até {money(group.budget_cents, group.currency)}
            </span>
            <span>
              <Icon as={Users} />
              {members.length}/50 pessoas
            </span>
          </div>
        </div>
        {owner && open && (
          <Button
            onClick={() => setConfirmDraw(true)}
            disabled={busy || members.length < 2 || pending.length > 0}
          >
            <Icon as={Shuffle} />
            Realizar sorteio
          </Button>
        )}
      </div>
      {group.description && (
        <p className="group-description preserve-lines">{group.description}</p>
      )}
      {owner && open && pending.length > 0 && (
        <p className="muted">
          {pending.length} convite(s) aguardando aceite. Aguarde a turma ou
          cancele os pendentes para liberar o sorteio.
        </p>
      )}
      <Notice>{error}</Notice>
      <Notice type="success">{message}</Notice>
      {owner && emailStatus?.pending > 0 && (
        <div className="email-pending">
          <div>
            <Icon as={Mail} />
            <span>
              {emailStatus.pending} aviso(s) aguardando envio. Os resultados
              estão salvos.
            </span>
          </div>
          <Button
            variant="secondary"
            busy={busy}
            onClick={() =>
              action(async () => {
                await api.rpc("retry_group_emails", { p_group_id: id });
                await sendMail();
              })
            }
          >
            <Icon as={RefreshCw} />
            Tentar enviar
          </Button>
        </div>
      )}
      <nav className="tabs" aria-label="Seções do grupo">
        {[
          ["people", "Participantes", Users],
          ["wishes", "Minha lista", Gift],
          ["result", "Meu amigo secreto", ShieldCheck],
        ].map(([value, label, icon]) => (
          <button
            key={value}
            aria-current={tab === value ? "page" : undefined}
            className={tab === value ? "active" : ""}
            onClick={() => navigate(`/groups/${id}?tab=${value}`)}
          >
            <Icon as={icon} />
            {label}
          </button>
        ))}
      </nav>
      {tab === "people" && (
        <div className="people-layout">
          <section className="panel">
            <div className="section-heading">
              <h2>Quem está nessa?</h2>
              <span className="count">{members.length}</span>
            </div>
            <ul className="member-list">
              {members.map((member) => (
                <li key={member.user_id}>
                  <Avatar name={member.display_name} />
                  <div>
                    <strong>
                      {member.display_name}
                      {member.user_id === user.id ? " (você)" : ""}
                    </strong>
                    <span>
                      {member.user_id === group.owner_id
                        ? "Organizador"
                        : "Participante confirmado"}
                    </span>
                  </div>
                  <span
                    className="member-check"
                    aria-label="Participação confirmada"
                  >
                    ✓
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            {owner ? (
              <>
                <h2>{open ? "Chame sua turma" : "Convites do grupo"}</h2>
                {open && (
                  <>
                    <p className="muted">
                      O convite chega por e-mail e vale por 7 dias. Cada convite
                      pendente reserva uma vaga.
                    </p>
                    <form onSubmit={invite} className="invite-form">
                      <Field label="E-mail do participante">
                        <input
                          name="email"
                          type="email"
                          required
                          maxLength={254}
                          placeholder="pessoa@exemplo.com"
                          disabled={
                            busy || members.length + pending.length >= 50
                          }
                        />
                      </Field>
                      <Button
                        busy={busy}
                        disabled={members.length + pending.length >= 50}
                      >
                        <Icon as={Mail} />
                        Enviar convite
                      </Button>
                    </form>
                  </>
                )}
                <ul className="invitation-list">
                  {invites.map((inv) => {
                    const expired = new Date(inv.expires_at) <= new Date();
                    return (
                      <li key={inv.id}>
                        <div>
                          <strong>{inv.email}</strong>
                          <span>
                            {inv.status === "accepted"
                              ? "Aceito"
                              : inv.status === "revoked"
                                ? "Cancelado"
                                : expired
                                  ? "Expirado"
                                  : `Aguardando aceite · ${inv.email_state === "sent" ? "E-mail enviado" : inv.email_state === "failed" ? "Envio pendente" : "Na fila de envio"}`}
                          </span>
                        </div>
                        {inv.status === "pending" && !expired && (
                          <button
                            disabled={busy}
                            className="icon-button danger"
                            aria-label={`Cancelar convite de ${inv.email}`}
                            onClick={() =>
                              action(async () => {
                                await api.rpc("revoke_group_invite", {
                                  p_invite_id: inv.id,
                                });
                                await refresh();
                                setMessage("Convite cancelado.");
                              })
                            }
                          >
                            <Icon as={Trash2} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {!invites.length && (
                  <p className="muted">Seus convites aparecerão aqui.</p>
                )}
              </>
            ) : (
              <>
                <Icon as={ShieldCheck} size={32} />
                <h2>Seu espaço no grupo</h2>
                <p className="muted">
                  Enquanto a turma se reúne, prepare sua lista de desejos.
                  Depois do sorteio, só você poderá consultar quem tirou.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/groups/${id}?tab=wishes`)}
                >
                  Preencher minha lista
                </Button>
              </>
            )}
          </section>
        </div>
      )}
      {tab === "wishes" && (
        <Wishlist
          items={wishes}
          groupId={id}
          userId={user.id}
          refresh={refresh}
        />
      )}
      {tab === "result" && (
        <section className="result-panel panel">
          {open ? (
            <div className="empty">
              <Icon as={Shuffle} size={40} />
              <h2>A surpresa está sendo preparada.</h2>
              <p>
                O organizador fará o sorteio quando a turma estiver confirmada.
                Você receberá um aviso por e-mail.
              </p>
              <Button
                variant="secondary"
                onClick={() => action(refresh)}
                busy={busy}
              >
                Conferir novamente
              </Button>
            </div>
          ) : !recipient ? (
            <Notice>
              Seu resultado não foi encontrado. Peça ajuda ao organizador.
            </Notice>
          ) : !revealed ? (
            <div className="empty">
              <span className="result-gift">
                <Icon as={Gift} size={44} />
              </span>
              <h2>Tem alguém esperando seu carinho.</h2>
              <p>Seu amigo secreto já foi escolhido. Pronto para descobrir?</p>
              <Button onClick={() => setRevealed(true)}>
                Revelar meu amigo secreto
              </Button>
            </div>
          ) : (
            <>
              <div className="recipient-heading">
                <Avatar name={recipient.display_name} large />
                <p className="muted">Você tirou</p>
                <h2>{recipient.display_name}</h2>
                <p>Estas são as dicas para escolher o presente.</p>
                <button
                  className="text-button"
                  onClick={() => setRevealed(false)}
                >
                  Ocultar resultado
                </button>
              </div>
              <WishList items={recipientWishes} />
            </>
          )}
        </section>
      )}
      {confirmDraw && (
        <Modal
          title="Tudo pronto para a surpresa?"
          onClose={busy ? () => {} : () => setConfirmDraw(false)}
        >
          <p>
            O sorteio será realizado entre as{" "}
            <strong>{members.length} pessoas confirmadas</strong>. Ninguém tira
            a si mesmo e cada pessoa recebe um presente.
          </p>
          <p>
            Após confirmar, a lista de participantes fica fechada e o resultado
            não pode ser alterado nesta edição.
          </p>
          <Notice>{error}</Notice>
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirmDraw(false)}
            >
              Revisar participantes
            </Button>
            <Button busy={busy} onClick={draw}>
              Confirmar sorteio
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
