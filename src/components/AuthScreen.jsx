import { useState } from "react";
import { ArrowRight, ShieldCheck, Users, Gift } from "lucide-react";
import { supabase, isConfigured } from "../supabaseClient";
import { errorText } from "../lib/format";
import { Button, Field, GiftArtwork, Icon, Notice } from "./ui";
import Captcha from "./Captcha";

export default function AuthScreen({ inviteToken, navigate }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const captchaKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const redirect = `${window.location.origin}${inviteToken ? `/invite/${inviteToken}` : "/auth/callback"}`;
  const titles = {
    login: "Que bom ter você aqui.",
    signup: "A surpresa começa aqui.",
    reset: "Vamos recuperar seu acesso.",
  };
  function changeMode(next) {
    setMode(next);
    setError("");
    setMessage("");
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: form.get("password"),
          options: { captchaToken },
        });
        if (error) throw error;
        navigate(inviteToken ? `/invite/${inviteToken}` : "/groups");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: form.get("password"),
          options: {
            captchaToken,
            data: { display_name: form.get("name").trim() },
            emailRedirectTo: redirect,
          },
        });
        if (error) throw error;
        if (data.session)
          navigate(inviteToken ? `/invite/${inviteToken}` : "/groups");
        else
          setMessage(
            "Confira seu e-mail para confirmar o cadastro. Depois, volte aqui para entrar. Se já tiver uma conta, use “Entrar”.",
          );
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            captchaToken,
            redirectTo: `${window.location.origin}/update-password`,
          },
        );
        if (error) throw error;
        setMessage(
          "Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha.",
        );
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      setCaptchaToken("");
      setCaptchaVersion((v) => v + 1);
    }
  }
  return (
    <main id="main" className="auth-layout">
      <section className="welcome">
        <h1>
          O melhor presente
          <br />é estar junto.
        </h1>
        <p>
          Junte sua turma, compartilhe desejos e deixe a surpresa por nossa
          conta.
        </p>
        <GiftArtwork />
        <div className="welcome-points">
          <span>
            <Icon as={Users} /> Até 50 pessoas por grupo
          </span>
          <span>
            <Icon as={ShieldCheck} /> Seu resultado é só seu
          </span>
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        {inviteToken && (
          <div className="invite-banner">
            <Icon as={Gift} />
            <span>
              Você recebeu um convite. Entre com o e-mail que foi convidado para
              participar.
            </span>
          </div>
        )}
        <h2 id="auth-title">{titles[mode]}</h2>
        <p className="muted">
          {mode === "signup"
            ? "Uma conta, todos os seus encontros."
            : mode === "reset"
              ? "Enviaremos um link para o seu e-mail."
              : "Entre para cuidar das próximas surpresas."}
        </p>
        {!isConfigured && (
          <Notice type="info">
            Estamos preparando os novos grupos. Os cadastros estarão disponíveis
            em breve.
          </Notice>
        )}
        <Notice>{error}</Notice>
        <Notice type="success">{message}</Notice>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <Field label="Seu nome">
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                minLength={1}
                placeholder="Como sua turma te chama?"
              />
            </Field>
          )}
          <Field label="E-mail">
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              maxLength={254}
              placeholder="voce@exemplo.com"
            />
          </Field>
          {mode !== "reset" && (
            <Field
              label="Senha"
              hint={
                mode === "signup" ? "Use pelo menos 8 caracteres." : undefined
              }
            >
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={mode === "signup" ? 8 : 1}
                maxLength={128}
              />
            </Field>
          )}
          {mode === "login" && (
            <button
              type="button"
              className="text-button forgot"
              onClick={() => changeMode("reset")}
            >
              Esqueci minha senha
            </button>
          )}
          {captchaKey && (
            <Captcha
              key={`${mode}-${captchaVersion}`}
              siteKey={captchaKey}
              onToken={setCaptchaToken}
            />
          )}
          <Button
            className="full"
            busy={busy}
            disabled={!isConfigured || (Boolean(captchaKey) && !captchaToken)}
            type="submit"
          >
            {mode === "login"
              ? "Entrar"
              : mode === "signup"
                ? "Criar minha conta"
                : "Enviar link de recuperação"}
            <Icon as={ArrowRight} />
          </Button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}{" "}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => changeMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Criar conta" : "Entrar"}
          </button>
        </p>
        <p className="auth-note">
          Presentes escolhidos com carinho.
          <br />
          Grupos organizados sem complicação.
        </p>
      </section>
    </main>
  );
}

export function UpdatePassword({ navigate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmation")) {
      setError("As senhas precisam ser iguais.");
      setBusy(false);
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: form.get("password"),
      });
      if (error) throw error;
      navigate("/groups");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="narrow panel">
      <h1>Crie uma nova senha</h1>
      <Notice>{error}</Notice>
      <form onSubmit={submit}>
        <Field label="Nova senha">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Repita a nova senha">
          <input
            name="confirmation"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
        </Field>
        <Button busy={busy}>Salvar nova senha</Button>
      </form>
    </main>
  );
}
