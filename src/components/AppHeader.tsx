import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ active }: { active: "shelf" | "friends" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkClass = (key: string) =>
    `text-sm ${active === key ? "text-foreground underline underline-offset-4" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <header className="mb-8 flex items-baseline justify-between border-b-2 border-foreground pb-4">
      <Link to="/" className="font-serif text-2xl">
        Spine
      </Link>
      <nav className="flex flex-wrap items-center gap-4">
        <Link to="/dashboard" className={linkClass("shelf")}>
          Shelf
        </Link>
        <Link to="/friends" className={linkClass("friends")}>
          Friends
        </Link>
        <ThemeToggle />
        <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">
          Sign out
        </button>
      </nav>
    </header>
  );
}
