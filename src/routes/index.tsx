import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HOUSES } from "@/lib/spine";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spine — track every book and study hour" },
      {
        name: "description",
        content:
          "Spine is a Strava-style tracker for reading and studying: shelves, streaks, reading houses, and friends who cheer you on.",
      },
      { property: "og:title", content: "Spine — track every book and study hour" },
      {
        property: "og:description",
        content:
          "Log pages and study sessions, build a visible shelf, keep a streak, and share the week with friends.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-5 pt-10 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground pb-4">
        <h1 className="font-serif text-3xl">Spine</h1>
        <div className="flex items-center gap-4">
          <span className="label-xs">reading, tracked</span>
          <ThemeToggle />
        </div>
      </header>

      <section className="mt-14">
        <h2 className="max-w-xl font-serif text-5xl leading-[1.05]">
          Every page you turn, stood up on a shelf.
        </h2>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          Log pages and study sessions, watch your spines fill in, keep a streak alive, and pull
          friends into the habit with recommendations, kudos and a weekly leaderboard.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {signedIn ? (
            <Button onClick={() => navigate({ to: "/dashboard" })}>Open your shelf</Button>
          ) : (
            <>
              <Button asChild>
                <Link to="/auth">Create your shelf</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/auth">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="mt-20 flex items-end gap-0 border-b-[6px] border-foreground">
        {[
          { t: "The Odyssey", f: 0.8 },
          { t: "Piranesi", f: 0.45 },
          { t: "Stoner", f: 1 },
          { t: "Pachinko", f: 0.3 },
          { t: "Solaris", f: 0.6 },
          { t: "Wolf Hall", f: 0.15 },
        ].map((b, i) => (
          <div
            key={b.t}
            className="spine flex items-end justify-center"
            style={{ backgroundColor: HOUSES[i % HOUSES.length]!.color }}
          >
            <div
              className="absolute inset-x-0 bottom-0 bg-[oklch(1_0_0_/_0.22)]"
              style={{ height: `${b.f * 100}%` }}
            />
            <span className="spine-title relative z-10 py-2 text-[oklch(1_0_0_/_0.92)]">{b.t}</span>
          </div>
        ))}
      </section>

      <section className="mt-16 grid gap-8 sm:grid-cols-3">
        {[
          {
            h: "Shelf & history",
            p: "Books with pages, covers, notes and who recommended them. Finished ones stay in your history.",
          },
          {
            h: "Houses & levels",
            p: "Pick one of four reading houses. Pages and study minutes earn XP and levels.",
          },
          {
            h: "Friends",
            p: "Follow friends, send recommendations, give kudos, and compare the week.",
          },
        ].map((c) => (
          <div key={c.h}>
            <h3 className="font-serif text-lg">{c.h}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.p}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
