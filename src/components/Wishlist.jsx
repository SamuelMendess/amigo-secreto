import { useState } from "react";
import { ExternalLink, Gift, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { errorText, safeUrl } from "../lib/format";
import { Button, Field, Icon, Notice } from "./ui";

export function WishList({ items, onDelete, busy }) {
  return items.length ? (
    <ul className="wish-list">
      {items.map((item) => (
        <li key={item.id} className="wish-item">
          <span className="wish-icon">
            <Icon as={Gift} />
          </span>
          <div>
            <h3>{item.title}</h3>
            {item.notes && <p className="preserve-lines">{item.notes}</p>}
            {safeUrl(item.url) && (
              <a
                href={safeUrl(item.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                Ver sugestão de presente
                <Icon as={ExternalLink} size={16} />
              </a>
            )}
          </div>
          {onDelete && (
            <button
              className="icon-button danger"
              disabled={busy}
              aria-label={`Excluir ${item.title}`}
              onClick={() => onDelete(item.id)}
            >
              <Icon as={Trash2} />
            </button>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <div className="empty compact">
      <Icon as={Gift} size={32} />
      <p>
        {onDelete
          ? "Sua lista está esperando suas primeiras ideias."
          : "Esta pessoa ainda não adicionou desejos. Volte mais tarde para conferir."}
      </p>
    </div>
  );
}
export default function Wishlist({ items, groupId, userId, refresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function add(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    setMessage("");
    const url = form.get("url").trim();
    if (url && !safeUrl(url)) {
      setError("Use um link completo, começando com https:// ou http://.");
      setBusy(false);
      return;
    }
    try {
      await api.addWish({
        group_id: groupId,
        user_id: userId,
        title: form.get("title").trim(),
        url,
        notes: form.get("notes").trim(),
      });
      formElement.reset();
      await refresh();
      setMessage("Desejo adicionado.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.deleteWish(id);
      await refresh();
      setMessage("Desejo removido.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wishlist-layout">
      <section className="panel">
        <h2>O que faria você sorrir?</h2>
        <p className="muted">
          Dê ideias e conte seus tamanhos ou preferências. Sua lista é vista por
          você e por quem te tirar.
        </p>
        <Notice>{error}</Notice>
        <Notice type="success">{message}</Notice>
        <form onSubmit={add}>
          <Field label="Ideia de presente">
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Um livro, um quebra-cabeça, uma planta…"
            />
          </Field>
          <Field label="Link (opcional)">
            <input
              name="url"
              type="url"
              maxLength={2000}
              placeholder="https://"
            />
          </Field>
          <Field label="Dicas (opcional)">
            <textarea
              name="notes"
              maxLength={1000}
              rows={3}
              placeholder="Tamanho M, cor favorita, autores que você gosta…"
            />
          </Field>
          <Button busy={busy}>
            <Icon as={Plus} />
            Adicionar desejo
          </Button>
        </form>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Minha lista</h2>
          <span className="count">{items.length}</span>
        </div>
        <WishList items={items} onDelete={remove} busy={busy} />
      </section>
    </div>
  );
}
