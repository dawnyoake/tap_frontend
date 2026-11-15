import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";

const themes = [
  { value: "system", label: "跟随系统", icon: Monitor },
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
] as const;

type Theme = (typeof themes)[number]["value"];

export function ThemeMenu() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = document.documentElement.dataset.theme;
    return saved === "light" || saved === "dark" ? saved : "system";
  });
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = themes.findIndex((option) => option.value === theme);
  const current = themes[selected];

  useEffect(() => {
    if (!open) return;
    items.current[selected]?.focus();
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, selected]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function select(next: Theme) {
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("tee-theme", next);
    } catch {
      // The active theme still works when browser storage is unavailable.
    }
    close();
  }

  function handleKeys(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const index = items.current.findIndex((item) => item === document.activeElement);
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? themes.length - 1
        : (Math.max(index, 0) + (event.key === "ArrowDown" ? 1 : -1) + themes.length) % themes.length;
    items.current[next]?.focus();
  }

  return (
    <div
      className="theme-control"
      ref={root}
      onKeyDown={handleKeys}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        className="theme-trigger"
        aria-label={`界面外观 · ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "theme-menu" : undefined}
        onClick={() => setOpen((previous) => !previous)}
      >
        <current.icon size={14} aria-hidden="true" />
        {current.label}
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div id="theme-menu" className="theme-menu" role="menu" aria-label="界面外观">
          {themes.map(({ value, label, icon: Icon }, index) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={value === theme}
              tabIndex={-1}
              ref={(element) => { items.current[index] = element; }}
              onClick={() => select(value)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
              {value === theme && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
