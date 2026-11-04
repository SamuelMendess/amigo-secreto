import { useEffect, useState } from "react";
import {
  Plus,
  CalendarDays,
  ArrowUpRight,
  Gift,
  ShieldCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { dateLabel, errorText, money, today } from "../lib/format";
import {
  Avatar,
  Button,
  Field,
  GiftArtwork,
  Icon,
  Loading,
  Modal,
  Notice,
} from "./ui";

export default function Dashboard({ user, navigate }) {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    api
      .groups()
      .then((data) => {
        if (alive) setGroups(data);
      })
      .catch((err) => {
        if (alive) setError(errorText(err));
      });
    return () => {
      alive = false;
    };
  }, [version]);
  const name = user.user_metadata?.display_name?.split(" ")[0] || "amigo";
  return (
    <main id="main" className="page">
      <div className="page-heading">
        <div>
          <p className="greeting">Olá, {name}.</p>
          <h1>
            Boas surpresas
            <br className="mobile-break" /> começam em grupo.
          </h1>
          <p className="muted">
            Um lugar para reunir sua turma e acertar no presente.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Icon as={Plus} />
          Criar grupo
        </Button>
      </div>
      <div className="dashboard-layout">
        <section>
          <div className="section-heading">
            <h2>Meus grupos</h2>
            {groups && <span className="count">{groups.length}</span>}
          </div>
          <Notice>{error}</Notice>
          {error && (
            <Button
              variant="secondary"
              onClick={() => {
                setError("");
                setVersion((v) => v + 1);
              }}
            >
              Tentar novamente
            </Button>
          )}
          {!groups && !error ? (
            <Loading />
          ) : groups?.length ? (
            <div className="group-list">
              {groups.map((group) => (
                <a
                  className="group-card"
                  key={group.id}
                  href={`/groups/${group.id}`}
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey) {
                      e.preventDefault();
                      navigate(`/groups/${group.id}`);
                    }
                  }}
                >
                  <div className="group-card-top">
                    <span
                      className={`badge ${group.status === "drawn" ? "rose" : ""}`}
                    >
                      {group.status === "drawn"
                        ? "Sorteio realizado"
                        : "Reunindo a turma"}
                    </span>
                    <Icon as={ArrowUpRight} />
                  </div>
                  <h3>{group.name}</h3>
                  <p className="group-date">
                    <Icon as={CalendarDays} />
                    {dateLabel(group.event_date)}
                  </p>
                  <div className="group-card-bottom">
                    <span>
                      Presente até{" "}
                      <strong>
                        {money(group.budget_cents, group.currency)}
                      </strong>
                    </span>
                    <span>
                      {group.owner_id === user.id
                        ? "Você organiza"
                        : "Você participa"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            groups && (
              <div className="empty panel">
                <Icon as={Gift} size={40} />
                <h3>Sua turma ainda vai chegar.</h3>
                <p>
                  Crie seu primeiro grupo ou abra o convite que recebeu por
                  e-mail.
                </p>
                <Button variant="secondary" onClick={() => setCreating(true)}>
                  Criar meu primeiro grupo
                </Button>
              </div>
            )
          )}
        </section>
        <aside className="dashboard-aside">
          <GiftArtwork />
          <h2>
            Um pouco de mistério.
            <br />
            Muito carinho.
          </h2>
          <p>
            Você organiza o encontro. Cada pessoa compartilha seus desejos. O
            sorteio cuida da surpresa.
          </p>
          <div className="aside-tip">
            <Icon as={ShieldCheck} />
            <p>
              Só você vê quem tirou.
              <br />O organizador também participa da surpresa.
            </p>
          </div>
          <div className="avatar-line">
            <Avatar name="Sua turma" />
            <span>
              Família, amigos ou trabalho.
              <br />
              Cada grupo tem seu espaço.
            </span>
          </div>
        </aside>
      </div>
      {creating && (
        <CreateGroup onClose={() => setCreating(false)} navigate={navigate} />
      )}
    </main>
  );
}
function CreateGroup({ onClose, navigate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const id = await api.rpc("create_exchange_group", {
        p_name: form.get("name").trim(),
        p_event_date: form.get("date"),
        p_budget_cents: Math.round(Number(form.get("budget")) * 100),
        p_currency: form.get("currency"),
        p_description: form.get("description").trim(),
      });
      navigate(`/groups/${id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }
  const christmas = `${new Date().getFullYear()}-12-25`;
  return (
    <Modal title="Vamos reunir sua turma?" onClose={busy ? () => {} : onClose}>
      <p className="muted">
        Você entra como organizador e participante. O grupo pode ter até 50
        pessoas.
      </p>
      <Notice>{error}</Notice>
      <form onSubmit={submit}>
        <Field label="Nome do grupo">
          <input
            name="name"
            required
            minLength={3}
            maxLength={80}
            placeholder="Natal da família 2026"
            autoFocus
          />
        </Field>
        <Field label="Data do encontro">
          <input
            name="date"
            type="date"
            required
            min={today()}
            defaultValue={christmas >= today() ? christmas : today()}
          />
        </Field>
        <div className="form-row">
          <Field label="Valor máximo do presente">
            <input
              name="budget"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              placeholder="100,00"
            />
          </Field>
          <Field label="Moeda">
            <select name="currency">
              <option value="BRL">Real (R$)</option>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dólar (US$)</option>
            </select>
          </Field>
        </div>
        <Field label="Recado para a turma (opcional)">
          <textarea
            name="description"
            maxLength={1000}
            rows={3}
            placeholder="Onde vai ser? Tem alguma regra especial?"
          />
        </Field>
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Agora não
          </Button>
          <Button busy={busy}>Criar grupo</Button>
        </div>
      </form>
    </Modal>
  );
}
