import { useTheme, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { id: ThemeChoice; label: string; title: string }[] = [
  { id: "light", label: "Paper", title: "Light paper theme" },
  { id: "dark", label: "Ink", title: "Dark ink theme" },
  { id: "system", label: "Auto", title: "Follow your device" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      className="flex items-center gap-0.5 rounded-sm border border-border p-0.5"
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          title={o.title}
          aria-pressed={theme === o.id}
          onClick={() => setTheme(o.id)}
          className={`rounded-[3px] px-2 py-1 text-[11px] transition-colors ${
            theme === o.id
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
