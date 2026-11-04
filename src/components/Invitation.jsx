import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { api } from "../lib/api";
import { dateLabel, errorText } from "../lib/format";
import { Button, Icon, Loading, Notice } from "./ui";

export default function Invitation({ token, navigate }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    api
      .rpc("inspect_group_invite", { p_token: token })
      .then((data) => {
        if (alive) setInvite(data);
      })
      .catch((err) => {
        if (alive) setError(errorText(err));
      });
    return () => {
      alive = false;
    };
  }, [token]);
  async function accept() {
    setBusy(true);
    setError("");
    try {
      const id = await api.rpc("accept_group_invite", { p_token: token });
      navigate(`/groups/${id}?tab=wishes`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }
  return (
    <main id="main" className="narrow panel invitation">
      <Icon as={Gift} size={48} />
      <Notice>{error}</Notice>
      {!invite && !error ? (
        <Loading />
      ) : (
        invite && (
          <>
            <p className="muted">Você foi convidado para</p>
            <h1>{invite.name}</h1>
            <p>{dateLabel(invite.event_date)}</p>
            <p>
              Confirme sua participação para entrar no sorteio e compartilhar
              sua lista de desejos.
            </p>
            <Button busy={busy} onClick={accept}>
              {invite.status === "accepted"
                ? "Abrir meu grupo"
                : "Aceitar convite e participar"}
            </Button>
          </>
        )
      )}
      <button className="text-button" onClick={() => navigate("/groups")}>
        Ir para meus grupos
      </button>
    </main>
  );
}
