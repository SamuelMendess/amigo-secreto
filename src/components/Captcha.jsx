import { useEffect, useRef } from "react";

// Opcional: habilite a mesma chave no Supabase Auth antes de publicar o cadastro.
export default function Captcha({ siteKey, onToken }) {
  const ref = useRef(null);
  useEffect(() => {
    let alive = true;
    let widget;
    const render = () => {
      if (alive && window.turnstile && ref.current)
        widget = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          language: "pt-br",
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
    };
    let script = document.getElementById("turnstile-script");
    if (window.turnstile) render();
    else if (script) script.addEventListener("load", render);
    else {
      script = document.createElement("script");
      script.id = "turnstile-script";
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.addEventListener("load", render);
      document.head.appendChild(script);
    }
    return () => {
      alive = false;
      script?.removeEventListener("load", render);
      if (widget !== undefined) window.turnstile?.remove(widget);
      onToken("");
    };
  }, [siteKey, onToken]);
  return <div className="captcha" ref={ref} />;
}
