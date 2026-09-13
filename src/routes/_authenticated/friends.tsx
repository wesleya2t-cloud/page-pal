import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useFriendships, useMe, useProfilesByIds } from "@/lib/spine-data";
import { daysAgoISO, formatMinutes, houseById, relativeDay } from "@/lib/spine";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Friends — Spine" },
      {
        name: "description",
        content: "Friends, recommendations, kudos and the weekly reading leaderboard on Spine.",
      },
      { property: "og:title", content: "Friends — Spine" },
      { property: "og:description", content: "Recommendations, kudos and a weekly leaderboard." },
    ],
  }),
  component: FriendsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function FriendsPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const uid = me?.id;
  const { data: edges = [] } = useFriendships(uid);

  const accepted = edges.filter((e) => e.status === "accepted");
  const incoming = edges.filter((e) => e.status === "pending" && e.incoming);
  const outgoing = edges.filter((e) => e.status === "pending" && !e.incoming);
  const circleIds = useMemo(
    () => [...accepted.map((e) => e.other?.id).filter(Boolean), uid].filter(Boolean) as string[],
    [accepted, uid],
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["friendships", uid] });
    qc.invalidateQueries({ queryKey: ["friend-feed"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
    qc.invalidateQueries({ queryKey: ["recommendations", uid] });
  };

  return (
    <main className="mx-auto max-w-3xl px-5 pt-7 pb-24">
      <AppHeader active="friends" />

      <FindFriends uid={uid} edges={edges} onChanged={refresh} />

      {incoming.length > 0 && (
        <Section title="Friend requests">
          <ul className="flex flex-col gap-2">
            {incoming.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
              >
                <span className="flex-1 font-serif text-[15px]">
                  {e.other?.display_name ?? e.other?.username ?? "Someone"}
                </span>
                <Button
                  size="sm"
                  onClick={async () => {
                    await supabase.from("friendships").update({ status: "accepted" }).eq("id", e.id);
                    refresh();
                  }}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await supabase.from("friendships").delete().eq("id", e.id);
                    refresh();
                  }}
                >
                  Decline
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Your circle">
        {accepted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No friends yet — search for a username above.
          </p>
        ) : (
          <ul className="flex flex-col">
            {accepted.map((e) => {
              const house = houseById(e.other?.house);
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 border-b border-border py-2.5 text-sm"
                >
                  <span
                    className="h-6 w-2 rounded-sm"
                    style={{ backgroundColor: house.color }}
                    aria-hidden
                  />
                  <span className="flex-1 font-serif text-[15px]">
                    {e.other?.display_name ?? e.other?.username}
                    <span className="text-muted-foreground"> · @{e.other?.username}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{house.name}</span>
                  <button
                    className="text-xs text-muted-foreground underline"
                    onClick={async () => {
                      await supabase.from("friendships").delete().eq("id", e.id);
                      refresh();
                    }}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {outgoing.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Waiting on {outgoing.length} sent request{outgoing.length > 1 ? "s" : ""}.
          </p>
        )}
      </Section>

      <Leaderboard circleIds={circleIds} uid={uid} />
      <Recommendations uid={uid} friends={accepted} onChanged={refresh} />
      <FriendFeed circleIds={circleIds} uid={uid} />
    </main>
  );
}

function FindFriends({
  uid,
  edges,
  onChanged,
}: {
  uid: string | undefined;
  edges: { other: { id: string } | null }[];
  onChanged: () => void;
}) {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");

  const { data: results = [] } = useQuery({
    queryKey: ["search-profiles", query],
    enabled: query.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const knownIds = new Set([uid, ...edges.map((e) => e.other?.id)].filter(Boolean) as string[]);

  return (
    <Section title="Find readers">
      <div className="flex gap-2">
        <Input
          placeholder="Search by username or name"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQuery(term)}
        />
        <Button onClick={() => setQuery(term)}>Search</Button>
      </div>
      {results.length > 0 && (
        <ul className="mt-3 flex flex-col">
          {results.map((p) => (
            <li key={p.id} className="flex items-center gap-3 border-b border-border py-2.5 text-sm">
              <span className="flex-1 font-serif text-[15px]">
                {p.display_name ?? p.username}
                <span className="text-muted-foreground"> · @{p.username}</span>
              </span>
              {knownIds.has(p.id) ? (
                <span className="text-xs text-muted-foreground">Already connected</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!uid) return;
                    const { error } = await supabase
                      .from("friendships")
                      .insert({ requester_id: uid, addressee_id: p.id });
                    if (error) return toast.error(error.message);
                    toast.success("Request sent");
                    onChanged();
                  }}
                >
                  Add friend
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Leaderboard({ circleIds, uid }: { circleIds: string[]; uid: string | undefined }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["leaderboard", circleIds],
    enabled: circleIds.length > 0,
    queryFn: async () => {
      const from = daysAgoISO(6);
      const [reading, study, profiles] = await Promise.all([
        supabase
          .from("reading_sessions")
          .select("user_id,pages,minutes")
          .in("user_id", circleIds)
          .gte("session_date", from),
        supabase
          .from("study_sessions")
          .select("user_id,minutes")
          .in("user_id", circleIds)
          .gte("session_date", from),
        supabase.from("profiles").select("*").in("id", circleIds),
      ]);
      const totals = new Map<string, { pages: number; minutes: number }>();
      for (const id of circleIds) totals.set(id, { pages: 0, minutes: 0 });
      for (const r of reading.data ?? []) {
        const t = totals.get(r.user_id)!;
        t.pages += r.pages;
        t.minutes += r.minutes;
      }
      for (const s of study.data ?? []) totals.get(s.user_id)!.minutes += s.minutes;
      return (profiles.data ?? [])
        .map((p) => ({ profile: p, ...totals.get(p.id)! }))
        .sort((a, b) => b.pages - a.pages || b.minutes - a.minutes);
    },
  });

  return (
    <Section title="This week's leaderboard">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add friends to see a leaderboard.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r, i) => (
            <li
              key={r.profile.id}
              className={`flex items-baseline gap-3 border-b border-border py-2.5 text-sm ${
                r.profile.id === uid ? "font-medium" : ""
              }`}
            >
              <span className="w-5 text-muted-foreground">{i + 1}</span>
              <span className="flex-1 font-serif text-[15px]">
                {r.profile.display_name ?? r.profile.username}
                {r.profile.id === uid ? " (you)" : ""}
              </span>
              <span>{r.pages} pages</span>
              <span className="w-20 text-right text-xs text-muted-foreground">
                {formatMinutes(r.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Recommendations({
  uid,
  friends,
  onChanged,
}: {
  uid: string | undefined;
  friends: { other: { id: string; username: string; display_name: string | null } | null }[];
  onChanged: () => void;
}) {
  const [to, setTo] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [note, setNote] = useState("");

  const { data: recs = [] } = useQuery({
    queryKey: ["recommendations", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const peopleIds = recs.flatMap((r) => [r.from_user, r.to_user]);
  const { data: people } = useProfilesByIds(peopleIds);

  async function send() {
    if (!uid || !to || !title.trim()) return toast.error("Pick a friend and a book title.");
    const { error } = await supabase.from("recommendations").insert({
      from_user: uid,
      to_user: to,
      title: title.trim(),
      author: author.trim() || null,
      note: note.trim() || null,
    });
    if (error) return toast.error(error.message);
    setTitle("");
    setAuthor("");
    setNote("");
    toast.success("Recommendation sent");
    onChanged();
  }

  async function addToShelf(rec: (typeof recs)[number]) {
    if (!uid) return;
    const from = people?.get(rec.from_user);
    const { error } = await supabase.from("books").insert({
      user_id: uid,
      title: rec.title,
      author: rec.author,
      status: "want",
      recommended_by: from?.display_name ?? from?.username ?? "a friend",
    });
    if (error) return toast.error(error.message);
    toast.success("Added to your want-to-read list");
  }

  return (
    <Section title="Recommendations">
      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 min-w-[150px] flex-1 rounded-sm border border-input bg-background px-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          >
            <option value="">Send to…</option>
            {friends.map(
              (f) =>
                f.other && (
                  <option key={f.other.id} value={f.other.id}>
                    {f.other.display_name ?? f.other.username}
                  </option>
                ),
            )}
          </select>
          <Input
            className="min-w-[140px] flex-1"
            placeholder="Book title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            className="min-w-[120px] flex-1"
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            className="min-w-[160px] flex-1"
            placeholder="Why they should read it"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button onClick={send}>Recommend</Button>
        </div>
      </div>

      {recs.length > 0 && (
        <ul className="mt-4 flex flex-col">
          {recs.map((r) => {
            const mine = r.from_user === uid;
            const other = people?.get(mine ? r.to_user : r.from_user);
            return (
              <li key={r.id} className="border-b border-border py-2.5">
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="flex-1 font-serif text-[15px]">
                    {r.title}
                    <span className="text-muted-foreground"> · {r.author || "—"}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {mine ? "to" : "from"} {other?.display_name ?? other?.username ?? "friend"}
                  </span>
                  {!mine && (
                    <Button size="sm" variant="outline" onClick={() => addToShelf(r)}>
                      Add to list
                    </Button>
                  )}
                </div>
                {r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function FriendFeed({ circleIds, uid }: { circleIds: string[]; uid: string | undefined }) {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["friend-feed", circleIds],
    enabled: circleIds.length > 0,
    queryFn: async () => {
      const [reading, study, books, profiles, kudos] = await Promise.all([
        supabase
          .from("reading_sessions")
          .select("*")
          .in("user_id", circleIds)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("study_sessions")
          .select("*")
          .in("user_id", circleIds)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase.from("books").select("id,title").in("user_id", circleIds),
        supabase.from("profiles").select("*").in("id", circleIds),
        supabase.from("kudos").select("*"),
      ]);
      const titles = new Map((books.data ?? []).map((b) => [b.id, b.title]));
      const who = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      const kudosList = kudos.data ?? [];
      const items = [
        ...(reading.data ?? []).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          kind: "reading" as const,
          created: r.created_at,
          date: r.session_date,
          text:
            r.pages > 0
              ? `read ${r.pages} pages of ${titles.get(r.book_id ?? "") ?? "a book"}`
              : `read for ${formatMinutes(r.minutes)}`,
          note: r.note,
        })),
        ...(study.data ?? []).map((s) => ({
          id: s.id,
          user_id: s.user_id,
          kind: "study" as const,
          created: s.created_at,
          date: s.session_date,
          text: `studied ${s.subject} for ${formatMinutes(s.minutes)}`,
          note: s.notes,
        })),
      ]
        .sort((a, b) => (a.created < b.created ? 1 : -1))
        .slice(0, 30);
      return { items, who, kudosList };
    },
  });

  async function toggleKudos(sessionId: string, kind: "reading" | "study") {
    if (!uid) return;
    const existing = data?.kudosList.find((k) => k.session_id === sessionId && k.user_id === uid);
    if (existing) {
      await supabase.from("kudos").delete().eq("id", existing.id);
    } else {
      const { error } = await supabase
        .from("kudos")
        .insert({ user_id: uid, session_id: sessionId, session_kind: kind });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["friend-feed"] });
  }

  return (
    <Section title="Friend activity">
      {!data || data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing from your circle yet.</p>
      ) : (
        <ul className="flex flex-col">
          {data.items.map((item) => {
            const person = data.who.get(item.user_id);
            const count = data.kudosList.filter((k) => k.session_id === item.id).length;
            const mineGiven = data.kudosList.some(
              (k) => k.session_id === item.id && k.user_id === uid,
            );
            return (
              <li key={item.id} className="border-b border-border py-2.5">
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="flex-1 font-serif text-[15px]">
                    <strong className="font-medium">
                      {person?.display_name ?? person?.username ?? "Someone"}
                    </strong>{" "}
                    {item.text}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{relativeDay(item.date)}</span>
                  <button
                    onClick={() => toggleKudos(item.id, item.kind)}
                    className={`rounded-sm border px-2 py-1 text-xs ${
                      mineGiven
                        ? "border-brick text-brick"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Kudos{count > 0 ? ` ${count}` : ""}
                  </button>
                </div>
                {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
