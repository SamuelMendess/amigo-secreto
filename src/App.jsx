import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "./supabaseClient";
import { errorText } from "./lib/format";
import AuthScreen, { UpdatePassword } from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import GroupPage from "./components/GroupPage";
import Invitation from "./components/Invitation";
import { Brand, Button, Icon, Loading, Notice } from "./components/ui";

export default function App() {
  const [route, setRoute] = useState(
    window.location.pathname + window.location.search,
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useCallback((path) => {
    window.history.pushState({}, "", path);
    setRoute(path);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const update = () =>
      setRoute(window.location.pathname + window.location.search);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          setUser(data.session?.user || null);
          setLoading(false);
          if (error) setError(errorText(error));
        }
      })
      .catch((err) => {
        if (active) {
          setLoading(false);
          setError(errorText(err));
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user || null);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") navigate("/update-password");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);
  useEffect(() => {
    if (user && (route === "/" || route.startsWith("/auth/callback")))
      navigate("/groups");
  }, [user, route, navigate]);
  async function signOut() {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      navigate("/");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSigningOut(false);
    }
  }
  const url = new URL(route, window.location.origin);
  const invitation = url.pathname.match(/^\/invite\/([a-f0-9]{64})\/?$/i);
  const group = url.pathname.match(/^\/groups\/([a-f0-9-]{36})\/?$/i);
  const tab = ["people", "wishes", "result"].includes(
    url.searchParams.get("tab"),
  )
    ? url.searchParams.get("tab")
    : "people";
  let content;
  if (loading)
    content = (
      <main id="main" className="page">
        <Loading />
      </main>
    );
  else if (!user)
    content = <AuthScreen inviteToken={invitation?.[1]} navigate={navigate} />;
  else if (url.pathname === "/update-password")
    content = <UpdatePassword navigate={navigate} />;
  else if (invitation)
    content = (
      <Invitation
        key={invitation[1]}
        token={invitation[1]}
        navigate={navigate}
      />
    );
  else if (group)
    content = (
      <GroupPage
        key={group[1]}
        id={group[1]}
        user={user}
        tab={tab}
        navigate={navigate}
      />
    );
  else if (["/", "/groups", "/auth/callback"].includes(url.pathname))
    content = <Dashboard user={user} navigate={navigate} />;
  else
    content = (
      <main id="main" className="narrow panel">
        <h1>Este caminho não foi encontrado.</h1>
        <Button onClick={() => navigate("/groups")}>Abrir meus grupos</Button>
      </main>
    );
  return (
    <>
      <a href="#main" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="site-header">
        <a
          href={user ? "/groups" : "/"}
          onClick={(e) => {
            e.preventDefault();
            navigate(user ? "/groups" : "/");
          }}
          aria-label="Amigo Secreto, início"
        >
          <Brand />
        </a>
        {user ? (
          <div className="header-account">
            <span>{user.user_metadata?.display_name || "Minha conta"}</span>
            <Button variant="ghost" busy={signingOut} onClick={signOut}>
              <Icon as={LogOut} />
              Sair
            </Button>
          </div>
        ) : (
          <span className="header-note">Mais encontros. Boas surpresas.</span>
        )}
      </header>
      {error && (
        <div className="page global-notice">
          <Notice>{error}</Notice>
        </div>
      )}
      {content}
      <footer className="site-footer">
        <Brand />
        <span>Feito para aproximar sua turma.</span>
      </footer>
    </>
  );
}
