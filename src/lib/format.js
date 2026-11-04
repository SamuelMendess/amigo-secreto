export function money(cents, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    cents / 100,
  );
}
export function dateLabel(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
    new Date(`${value}T12:00:00`),
  );
}
export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function errorText(error) {
  const message = error?.message || "";
  if (message.includes("Invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (message.includes("Email not confirmed"))
    return "Confirme seu e-mail para entrar. Confira também a pasta de spam.";
  if (/rate limit|too many/i.test(message))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (/fetch|network/i.test(message))
    return "Não foi possível conectar. Confira sua internet e tente novamente.";
  if (/already registered/i.test(message))
    return "Este e-mail já tem uma conta. Entre ou recupere sua senha.";
  if (
    /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ].*[.!]$/.test(message) &&
    !/relation|constraint|permission|schema|column|JWT|JSON/.test(message)
  )
    return message;
  return "Não foi possível concluir. Tente novamente em instantes.";
}
