import { cloneElement, useEffect, useId, useRef } from "react";
import { Gift, Loader2, X } from "lucide-react";

export function Icon({ as: Component, ...props }) {
  return <Component size={20} aria-hidden="true" {...props} />;
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <Icon as={Gift} />
      </span>
      amigo secreto<span className="brand-dot">.</span>
    </span>
  );
}
export function Button({
  children,
  busy,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      className={`button ${variant} ${className}`}
      {...props}
      disabled={busy || props.disabled}
      aria-busy={busy || undefined}
    >
      {busy && <Icon as={Loader2} className="spin" />}
      {children}
    </button>
  );
}
export function Notice({ children, type = "error" }) {
  return children ? (
    <div
      className={`notice ${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <Icon as={Loader2} className="spin" /> Carregando seu encontro…
    </div>
  );
}
export function Field({ label, hint, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-describedby": hint ? `${id}-hint` : undefined,
      })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Avatar({ name, large }) {
  return (
    <span className={`avatar ${large ? "large" : ""}`} aria-hidden="true">
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  const returnFocus = useRef(document.activeElement);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = returnFocus.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <Icon as={X} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function GiftArtwork() {
  return (
    <div className="gift-art" aria-hidden="true">
      <div className="gift-circle" />
      <div className="gift-box">
        <div className="gift-ribbon" />
        <div className="gift-lid" />
        <div className="gift-bow bow-left" />
        <div className="gift-bow bow-right" />
        <div className="gift-tag">
          feito para
          <br />
          <strong>alguém especial</strong>
        </div>
      </div>
      <span className="art-spark spark-one">✦</span>
      <span className="art-spark spark-two">✦</span>
    </div>
  );
}
