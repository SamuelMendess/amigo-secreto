export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
export function buildEmail(job, appUrl) {
  const invitation = job.kind === "invitation";
  const name = String(job.payload.group_name);
  const url = new URL(
    invitation
      ? `/invite/${encodeURIComponent(job.payload.token)}`
      : `/groups/${job.group_id}`,
    appUrl,
  ).href;
  const subject = invitation
    ? "Você recebeu um convite para um amigo secreto"
    : "Seu amigo secreto já foi sorteado";
  const heading = invitation
    ? "Tem um encontro esperando por você."
    : "A surpresa já tem nome.";
  const message = invitation
    ? `Você foi convidado para o grupo “${name}”. Entre com este e-mail, confirme sua participação e preencha sua lista de desejos. O convite vale por 7 dias.`
    : `O sorteio do grupo “${name}” está pronto. Entre na sua conta para descobrir quem você tirou e consultar as dicas de presentes.`;
  const label = invitation ? "Aceitar convite" : "Ver meu amigo secreto";
  return {
    subject,
    text: `${heading}\n\n${message}\n\n${label}: ${url}\n\nSe você não conhece o grupo, ignore esta mensagem.`,
    html: `<html lang="pt-BR"><body style="margin:0;background:#f3f6f5;font:16px/1.6 Arial,sans-serif;color:#173b35"><main style="max-width:540px;margin:40px auto;background:white;padding:32px;border-radius:16px"><p style="font-weight:bold">Amigo Secreto</p><h1 style="font-size:28px;line-height:1.2">${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p><p style="margin:30px 0"><a href="${escapeHtml(url)}" style="background:#176449;color:white;padding:14px 20px;border-radius:8px;text-decoration:none;display:inline-block">${label}</a></p><p style="font-size:13px;color:#52675f">Se você não conhece o grupo, ignore esta mensagem.</p></main></body></html>`,
  };
}
