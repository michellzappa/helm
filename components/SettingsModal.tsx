import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/lib/settings-context";
import { THEME_COLORS } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-border my-5" />;
}

export function SettingsModal({ open, onOpenChange }: Props) {
  const { settings, setSetting } = useSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="pt-1">
          {/* ── Color ── */}
          <SectionLabel>Color</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map(color => {
              const active = settings.themeColor === color.id;
              return (
                <button
                  key={color.id}
                  onClick={() => setSetting("themeColor", color.id)}
                  title={color.label}
                  className={cn(
                    "h-6 w-10 rounded-full transition-all",
                    active
                      ? "ring-2 ring-offset-2 ring-foreground/50 scale-110"
                      : "opacity-70 hover:opacity-100 hover:scale-105"
                  )}
                  style={{ backgroundColor: color.swatch }}
                />
              );
            })}
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground h-3 transition-all">
            {THEME_COLORS.find(c => c.id === settings.themeColor)?.label ?? "Gray"}
          </p>

          <Divider />

          {/* ── Sidebar ── */}
          <SectionLabel>Sidebar</SectionLabel>
          <div className="rounded-lg border border-border bg-card px-4 divide-y divide-border">
            <ToggleRow
              label="Show counts"
              description="Item counts next to each link."
              checked={settings.showSidebarCounts}
              onChange={v => setSetting("showSidebarCounts", v)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex flex-col gap-0.5 min-w-0 pr-4">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 inline-flex h-5 w-9 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
