import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, useSignedUrl } from "@/lib/media";
import {
  useBooks,
  useMe,
  useProfile,
  useReadingSessions,
  useStudySessions,
  type Book,
} from "@/lib/spine-data";
import {
  HOUSES,
  daysAgoISO,
  formatClock,
  formatMinutes,
  houseById,
  levelFromXp,
  relativeDay,
  spineColorFor,
  streakFrom,
  todayISO,
  xpFrom,
} from "@/lib/spine";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your shelf — Spine" },
      { name: "description", content: "Your books, reading sessions, study hours and streak." },
      { property: "og:title", content: "Your shelf — Spine" },
      { property: "og:description", content: "Books, sessions, study hours and your streak." },
    ],
  }),
  component: Dashboard,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const uid = me?.id;
  const { data: profile } = useProfile(uid);
  const { data: books = [] } = useBooks(uid);
  const { data: reading = [] } = useReadingSessions(uid);
  const { data: study = [] } = useStudySessions(uid);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["books", uid] });
    qc.invalidateQueries({ queryKey: ["reading-sessions", uid] });
    qc.invalidateQueries({ queryKey: ["study-sessions", uid] });
  };

  const stats = useMemo(() => {
    const weekStart = daysAgoISO(6);
    const monthStart = daysAgoISO(29);
    const pagesIn = (from: string) =>
      reading.filter((r) => r.session_date >= from).reduce((s, r) => s + r.pages, 0);
    const minutesTotal =
      study.reduce((s, r) => s + r.minutes, 0) + reading.reduce((s, r) => s + r.minutes, 0);
    const pagesTotal = reading.reduce((s, r) => s + r.pages, 0);
    const dates = [...reading.map((r) => r.session_date), ...study.map((r) => r.session_date)];
    return {
      week: pagesIn(weekStart),
      month: pagesIn(monthStart),
      finished: books.filter((b) => b.status === "finished").length,
      streak: streakFrom(dates),
      xp: xpFrom(pagesTotal, minutesTotal),
      inProgress: books.filter((b) => b.status === "reading").length,
    };
  }, [reading, study, books]);

  const house = houseById(profile?.house);
  const { level, progress } = levelFromXp(stats.xp);

  const currentlyReading = books.filter((b) => b.status === "reading");
  const wantToRead = books.filter((b) => b.status === "want");
  const finished = books.filter((b) => b.status === "finished");

  const activity = useMemo(() => {
    const items = [
      ...reading.map((r) => ({
        id: r.id,
        date: r.session_date,
        created: r.created_at,
        text: `${r.pages} pages · ${books.find((b) => b.id === r.book_id)?.title ?? "a book"}`,
        note: r.note,
        photo: r.photo_url,
      })),
      ...study.map((s) => ({
        id: s.id,
        date: s.session_date,
        created: s.created_at,
        text: `${formatMinutes(s.minutes)} studying · ${s.subject}`,
        note: s.notes,
        photo: null as string | null,
      })),
    ];
    return items.sort((a, b) => (a.created < b.created ? 1 : -1)).slice(0, 20);
  }, [reading, study, books]);

  const subjectTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of study) map.set(s.subject, (map.get(s.subject) ?? 0) + s.minutes);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [study]);

  async function setHouse(id: string) {
    if (!uid) return;
    const { error } = await supabase.from("profiles").update({ house: id }).eq("id", uid);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["profile", uid] });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pt-7 pb-24">
      <AppHeader active="shelf" />

      {/* House banner */}
      <div
        className="mb-7 flex items-center gap-4 rounded-md px-4 py-4"
        style={{ backgroundColor: house.color }}
      >
        <div className="flex-1 text-[oklch(1_0_0_/_0.95)]">
          <div className="font-serif text-lg">House {house.name}</div>
          <div className="text-xs opacity-80">{house.motto}</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.25)]">
            <div
              className="h-full bg-[oklch(1_0_0_/_0.9)]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <div className="text-right text-[oklch(1_0_0_/_0.95)]">
          <div className="font-serif text-2xl leading-none">{level}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-75">level</div>
          <div className="text-[10px] opacity-75">{stats.xp} xp</div>
        </div>
      </div>

      <Section title="Your reading house">
        <div className="grid gap-2 sm:grid-cols-4">
          {HOUSES.map((h) => (
            <button
              key={h.id}
              onClick={() => setHouse(h.id)}
              className={`rounded-md px-3 py-3 text-left text-[oklch(1_0_0_/_0.95)] transition-opacity ${
                h.id === house.id ? "ring-2 ring-foreground ring-offset-2" : "opacity-80"
              }`}
              style={{ backgroundColor: h.color }}
            >
              <div className="font-serif text-sm">{h.name}</div>
              <div className="text-[11px] opacity-85">{h.motto}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
        <Stat value={stats.streak} label="day streak" accent />
        <Stat value={stats.week} label="pages this week" />
        <Stat value={stats.month} label="pages this month" />
        <Stat value={stats.finished} label="books finished" />
      </div>

      <Timer books={currentlyReading} uid={uid} onLogged={refresh} />

      <Section title="Shelf">
        <div className="flex min-h-[150px] flex-wrap items-end border-b-[6px] border-foreground">
          {books.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">
              Nothing on the shelf yet — add a book below.
            </p>
          )}
          {books
            .filter((b) => b.status !== "want")
            .map((b) => {
              const fill =
                b.total_pages > 0 ? Math.min(1, b.current_page / b.total_pages) : b.status === "finished" ? 1 : 0;
              return (
                <div
                  key={b.id}
                  title={`${b.title} — ${Math.round(fill * 100)}%`}
                  className={`spine flex items-end justify-center ${b.status === "finished" ? "opacity-60" : ""}`}
                  style={{ backgroundColor: b.spine_color ?? spineColorFor(b.id) }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 bg-[oklch(1_0_0_/_0.22)]"
                    style={{ height: `${fill * 100}%` }}
                  />
                  <span className="spine-title relative z-10 py-2 text-[oklch(1_0_0_/_0.92)]">
                    {b.title}
                  </span>
                </div>
              );
            })}
        </div>
      </Section>

      <Section title="Log today's reading">
        {currentlyReading.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a book below to start logging.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {currentlyReading.map((b) => (
              <ReadingLogRow key={b.id} book={b} uid={uid} onLogged={refresh} />
            ))}
          </div>
        )}
      </Section>

      <AddBook uid={uid} onAdded={refresh} />

      <Section title="Want to read">
        {wantToRead.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on your list yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {wantToRead.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-[15px]">{b.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.author || "Unknown author"}
                    {b.recommended_by ? ` · recommended by ${b.recommended_by}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await supabase.from("books").update({ status: "reading" }).eq("id", b.id);
                    refresh();
                  }}
                >
                  Start reading
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Log a study session">
        <StudyForm uid={uid} onLogged={refresh} />
        {subjectTotals.length > 0 && (
          <ul className="mt-4 flex flex-col">
            {subjectTotals.map(([subject, minutes]) => (
              <li
                key={subject}
                className="flex items-baseline justify-between border-b border-border py-2 text-sm"
              >
                <span className="font-serif">{subject}</span>
                <span className="text-muted-foreground">{formatMinutes(minutes)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="History — books you've finished">
        {finished.length === 0 ? (
          <p className="text-sm text-muted-foreground">No finished books yet.</p>
        ) : (
          <ul className="flex flex-col">
            {finished.map((b) => (
              <li
                key={b.id}
                className="flex items-baseline justify-between border-b border-border py-2.5 text-sm"
              >
                <span className="font-serif text-[15px]">
                  {b.title}
                  <span className="text-muted-foreground"> · {b.author || "—"}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {b.finished_at ? new Date(b.finished_at).toLocaleDateString() : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Activity">
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="flex flex-col">
            {activity.map((a) => (
              <li key={a.id} className="border-b border-border py-2.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-serif text-[15px]">{a.text}</span>
                  <span className="text-[11px] text-muted-foreground">{relativeDay(a.date)}</span>
                </div>
                {a.note && <p className="mt-1 text-xs text-muted-foreground">{a.note}</p>}
                {a.photo && <SessionPhoto path={a.photo} />}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Share card">
        <div className="rounded-lg bg-foreground p-6 text-[oklch(0.95_0.018_84.5)]">
          <div className="text-[11px] uppercase tracking-[0.15em] opacity-60">Spine · this week</div>
          <div className="mt-3 font-serif text-4xl">{stats.week} pages</div>
          <div className="mt-5 flex gap-8">
            <div>
              <div className="font-serif text-xl">{stats.streak}</div>
              <div className="text-[11px] opacity-60">day streak</div>
            </div>
            <div>
              <div className="font-serif text-xl">{stats.finished}</div>
              <div className="text-[11px] opacity-60">books finished</div>
            </div>
            <div>
              <div className="font-serif text-xl">{stats.inProgress}</div>
              <div className="text-[11px] opacity-60">in progress</div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Screenshot this card to share it.</p>
      </Section>
    </main>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="bg-background px-3 py-4 text-center">
      <span
        className={`block font-serif text-2xl leading-none ${accent ? "text-brick" : "text-foreground"}`}
      >
        {value}
      </span>
      <span className="mt-1.5 block text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function SessionPhoto({ path }: { path: string }) {
  const { data: url } = useSignedUrl(path);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Reading session"
      className="mt-2 h-16 w-16 rounded-sm border border-border object-cover"
    />
  );
}

function Timer({
  books,
  uid,
  onLogged,
}: {
  books: Book[];
  uid: string | undefined;
  onLogged: () => void;
}) {
  // Wall-clock timer: it keeps counting while the tab is hidden, in another
  // app, or closed entirely, because elapsed time is derived from timestamps.
  const [base, setBase] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, tick] = useState(0);
  const running = startedAt !== null;
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { base: number; startedAt: number | null };
      setBase(saved.base ?? 0);
      setStartedAt(saved.startedAt ?? null);
    } catch {
      localStorage.removeItem(TIMER_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify({ base, startedAt }));
  }, [base, startedAt]);

  useEffect(() => {
    if (!running) return;
    interval.current = setInterval(() => tick((n) => n + 1), 1000);
    const onVisible = () => tick((n) => n + 1);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (interval.current) clearInterval(interval.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [running]);

  const seconds = base + (startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0);

  const stop = () => {
    setBase(seconds);
    setStartedAt(null);
  };
  const start = () => setStartedAt(Date.now());
  const reset = () => {
    setBase(0);
    setStartedAt(null);
  };

  const minutes = Math.max(1, Math.round(seconds / 60));

  async function logAs(kind: "reading" | "study") {
    if (!uid || seconds < 30) { toast.error("Run the timer for at least 30 seconds."); return; }
    if (kind === "reading") {
      const book = books[0];
      const { error } = await supabase.from("reading_sessions").insert({
        user_id: uid,
        book_id: book?.id ?? null,
        pages: 0,
        minutes,
        session_date: todayISO(),
      });
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("study_sessions").insert({
        user_id: uid,
        subject: "Study",
        minutes,
        session_date: todayISO(),
      });
      if (error) { toast.error(error.message); return; }
    }
    reset();
    onLogged();
    toast.success(`Logged ${minutes} minutes`);
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
      <span className="min-w-[72px] font-serif text-xl">{formatClock(seconds)}</span>
      <Button size="sm" onClick={() => (running ? stop() : start())}>
        {running ? "Pause" : seconds ? "Resume" : "Start timer"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => logAs("reading")}>
        Log as reading
      </Button>
      <Button size="sm" variant="outline" onClick={() => logAs("study")}>
        Log as study
      </Button>
      {seconds > 0 && (
        <button
          className="text-xs text-muted-foreground underline"
          onClick={() => {
            setRunning(false);
            setSeconds(0);
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
}

function ReadingLogRow({
  book,
  uid,
  onLogged,
}: {
  book: Book;
  uid: string | undefined;
  onLogged: () => void;
}) {
  const [pages, setPages] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fill = book.total_pages > 0 ? Math.min(1, book.current_page / book.total_pages) : 0;

  async function log() {
    const count = parseInt(pages, 10);
    if (!uid || !count || count <= 0) { toast.error("Enter how many pages you read."); return; }
    setBusy(true);
    try {
      const photoPath = file ? await uploadMedia(file, "sessions") : null;
      const { error } = await supabase.from("reading_sessions").insert({
        user_id: uid,
        book_id: book.id,
        pages: count,
        note: note || null,
        photo_url: photoPath,
        session_date: todayISO(),
      });
      if (error) throw error;
      const nextPage = book.current_page + count;
      const done = book.total_pages > 0 && nextPage >= book.total_pages;
      await supabase
        .from("books")
        .update({
          current_page: done ? book.total_pages : nextPage,
          status: done ? "finished" : "reading",
          finished_at: done ? new Date().toISOString() : null,
        })
        .eq("id", book.id);
      setPages("");
      setNote("");
      setFile(null);
      onLogged();
      toast.success(done ? `Finished ${book.title}!` : `Logged ${count} pages`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log that");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-[15px]">{book.title}</div>
          <div className="text-xs text-muted-foreground">
            page {book.current_page}
            {book.total_pages ? ` of ${book.total_pages}` : ""}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-forest" style={{ width: `${fill * 100}%` }} />
          </div>
        </div>
        <Input
          className="w-20 text-center"
          inputMode="numeric"
          placeholder="pages"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
        />
        <Button size="sm" onClick={log} disabled={busy}>
          Log
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          className="h-9 flex-1"
          placeholder="A note about this session (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <label className="cursor-pointer rounded-sm border border-border px-2.5 py-1.5 text-xs">
          {file ? "Photo ready" : "Add photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            await supabase
              .from("books")
              .update({
                status: "finished",
                finished_at: new Date().toISOString(),
                current_page: book.total_pages || book.current_page,
              })
              .eq("id", book.id);
            onLogged();
          }}
        >
          Mark finished
        </Button>
      </div>
    </div>
  );
}

function AddBook({ uid, onAdded }: { uid: string | undefined; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [total, setTotal] = useState("");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [want, setWant] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!uid || !title.trim()) { toast.error("Give the book a title."); return; }
    setBusy(true);
    try {
      const coverPath = cover ? await uploadMedia(cover, "covers") : null;
      const { error } = await supabase.from("books").insert({
        user_id: uid,
        title: title.trim(),
        author: author.trim() || null,
        total_pages: parseInt(total, 10) || 0,
        status: want ? "want" : "reading",
        notes: notes || null,
        recommended_by: recommendedBy || null,
        cover_url: coverPath,
        spine_color: spineColorFor(title + author),
      });
      if (error) throw error;
      setTitle("");
      setAuthor("");
      setTotal("");
      setRecommendedBy("");
      setNotes("");
      setWant(false);
      setCover(null);
      onAdded();
      toast.success("Added to your shelf");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that book");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Add a book">
      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-[160px] flex-1"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            className="min-w-[140px] flex-1"
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            className="w-32"
            inputMode="numeric"
            placeholder="Pages"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
          <Input
            className="min-w-[160px] flex-1"
            placeholder="Recommended by"
            value={recommendedBy}
            onChange={(e) => setRecommendedBy(e.target.value)}
          />
        </div>
        <Textarea
          className="mt-2 min-h-[60px]"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={want} onChange={(e) => setWant(e.target.checked)} />
            Want to read (haven't started)
          </label>
          <label className="cursor-pointer rounded-sm border border-border px-2.5 py-1.5 text-xs">
            {cover ? "Cover ready" : "Add cover photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button className="ml-auto" onClick={add} disabled={busy}>
            Add to shelf
          </Button>
        </div>
      </div>
    </Section>
  );
}

function StudyForm({ uid, onLogged }: { uid: string | undefined; onLogged: () => void }) {
  const [subject, setSubject] = useState("");
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function log() {
    const mins = parseInt(minutes, 10);
    if (!uid || !subject.trim() || !mins) { toast.error("Add a subject and minutes."); return; }
    setBusy(true);
    const { error } = await supabase.from("study_sessions").insert({
      user_id: uid,
      subject: subject.trim(),
      minutes: mins,
      notes: notes || null,
      session_date: todayISO(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSubject("");
    setMinutes("");
    setNotes("");
    onLogged();
    toast.success("Study session logged");
  }

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[160px] flex-1"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Input
          className="w-28"
          inputMode="numeric"
          placeholder="Minutes"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          className="min-w-[160px] flex-1"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button onClick={log} disabled={busy}>
          Log session
        </Button>
      </div>
      <Label className="sr-only">Study session</Label>
    </div>
  );
}
