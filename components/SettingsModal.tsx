import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useSettings,
  REFRESH_OPTIONS,
  type ColorMode,
  type Currency,
  type DateFormat,
  type TimeFormat,
  type TempUnit,
  type SidebarPosition,
} from "@/lib/settings-context";
import { THEME_COLORS } from "@/lib/theme-colors";
import { Sun, Moon, Monitor, PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_MODES: { id: ColorMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const SIDEBAR_POSITIONS: { id: SidebarPosition; label: string; icon: typeof PanelLeft }[] = [
  { id: "left", label: "Left", icon: PanelLeft },
  { id: "right", label: "Right", icon: PanelRight },
];

const CURRENCY_OPTIONS: Currency[] = ["EUR", "USD", "GBP"];
const DATE_FORMAT_OPTIONS: DateFormat[] = ["DD/MM", "MM/DD"];
const TIME_FORMAT_OPTIONS: TimeFormat[] = ["24h", "12h"];
const TEMP_OPTIONS: TempUnit[] = ["C", "F"];

interface SidebarMenuItem {
  href: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  menuItems: SidebarMenuItem[];
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-border my-4" />;
}

function SegmentedButtonRow<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: T[];
  value: T;
  onChange: (next: T) => void;
  renderLabel?: (option: T) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(option => {
        const active = value === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {renderLabel ? renderLabel(option) : option}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsModal({ open, onOpenChange, menuItems }: Props) {
  const { settings, setSetting } = useSettings();

  const setSidebarItemVisible = (href: string, visible: boolean) => {
    if (href === "/") return;
    const currentlyHidden = settings.hiddenSidebarItems;
    if (visible) {
      setSetting("hiddenSidebarItems", currentlyHidden.filter(path => path !== href));
      return;
    }
    if (currentlyHidden.includes(href)) return;
    setSetting("hiddenSidebarItems", [...currentlyHidden, href]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 pt-1">
          <SectionLabel>Appearance</SectionLabel>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Color theme</p>
              <div className="flex gap-1.5">
                {THEME_COLORS.map(color => {
                  const active = settings.themeColor === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => setSetting("themeColor", color.id)}
                      title={color.label}
                      className={cn(
                        "h-5 w-9 rounded-full transition-all",
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
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Color mode</p>
              <div className="flex gap-1.5">
                {COLOR_MODES.map(mode => {
                  const active = settings.colorMode === mode.id;
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSetting("colorMode", mode.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Divider />

          <SectionLabel>Layout</SectionLabel>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Sidebar position</p>
              <div className="flex gap-1.5">
                {SIDEBAR_POSITIONS.map(option => {
                  const active = settings.sidebarPosition === option.id;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSetting("sidebarPosition", option.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card px-4 divide-y divide-border">
              <ToggleRow
                label="Show sidebar counts"
                description="Item counts next to each link."
                checked={settings.showSidebarCounts}
                onChange={v => setSetting("showSidebarCounts", v)}
              />
              {menuItems.map(item => {
                const isDashboard = item.href === "/";
                const visible = isDashboard || !settings.hiddenSidebarItems.includes(item.href);
                return (
                  <ToggleRow
                    key={item.href}
                    label={item.label}
                    description={isDashboard ? "Always visible" : "Show in sidebar"}
                    checked={visible}
                    disabled={isDashboard}
                    onChange={v => setSidebarItemVisible(item.href, v)}
                  />
                );
              })}
            </div>
          </div>

          <Divider />

          <SectionLabel>Dashboard</SectionLabel>
          <div className="rounded-lg border border-border bg-card px-4 divide-y divide-border">
            <ToggleRow
              label="Weather"
              checked={settings.dashboardCards.weather}
              onChange={v => setSetting("dashboardCards", { ...settings.dashboardCards, weather: v })}
            />
            <ToggleRow
              label="System"
              checked={settings.dashboardCards.system}
              onChange={v => setSetting("dashboardCards", { ...settings.dashboardCards, system: v })}
            />
            <ToggleRow
              label="Tailscale"
              checked={settings.dashboardCards.tailscale}
              onChange={v => setSetting("dashboardCards", { ...settings.dashboardCards, tailscale: v })}
            />
            <ToggleRow
              label="Activity"
              checked={settings.dashboardCards.activity}
              onChange={v => setSetting("dashboardCards", { ...settings.dashboardCards, activity: v })}
            />
          </div>

          <Divider />

          <SectionLabel>Formatting</SectionLabel>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Currency</p>
              <SegmentedButtonRow
                options={CURRENCY_OPTIONS}
                value={settings.currency}
                onChange={value => setSetting("currency", value)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Date format</p>
              <SegmentedButtonRow
                options={DATE_FORMAT_OPTIONS}
                value={settings.dateFormat}
                onChange={value => setSetting("dateFormat", value)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Time format</p>
              <SegmentedButtonRow
                options={TIME_FORMAT_OPTIONS}
                value={settings.timeFormat}
                onChange={value => setSetting("timeFormat", value)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Temperature</p>
              <SegmentedButtonRow
                options={TEMP_OPTIONS}
                value={settings.temperatureUnit}
                onChange={value => setSetting("temperatureUnit", value)}
                renderLabel={value => (value === "C" ? "°C" : "°F")}
              />
            </div>
          </div>

          <Divider />

          <SectionLabel>Behavior</SectionLabel>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Refresh interval</p>
            <div className="flex gap-1.5">
              {REFRESH_OPTIONS.map(opt => {
                const active = settings.refreshInterval === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSetting("refreshInterval", opt.value)}
                    className={cn(
                      "rounded px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
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
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, disabled, onChange }: ToggleRowProps) {
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
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        className={cn(
          "relative shrink-0 inline-flex h-5 w-9 items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-input",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
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
