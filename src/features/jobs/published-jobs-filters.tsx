import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Filter,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { PublishedJobsFilters } from "@/lib/jobs/fetch-published-jobs";
import { SERVICENOW_JOB_MODULES } from "@/lib/jobs/servicenow-job-taxonomy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type FilterOption = { value: string; label: string };

type FilterIcon = ComponentType<{ className?: string }>;

const ROLE_OPTIONS: FilterOption[] = [
  { value: "_any", label: "Any role" },
  { value: "developer", label: "Developer" },
  { value: "architect", label: "Architect" },
  { value: "consultant", label: "Consultant" },
  { value: "admin", label: "Admin" },
  { value: "analyst", label: "Analyst" },
  { value: "manager", label: "Manager" },
  { value: "other", label: "Other" },
];

const EXPERIENCE_OPTIONS: FilterOption[] = [
  { value: "_any", label: "Any" },
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "principal", label: "Principal" },
];

const WORK_OPTIONS: FilterOption[] = [
  { value: "_any", label: "Work mode" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const TOP_COUNTRY_OPTIONS: FilterOption[] = [
  { value: "_any", label: "Location" },
  { value: "India", label: "India" },
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Germany", label: "Germany" },
  { value: "Australia", label: "Australia" },
  { value: "Singapore", label: "Singapore" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
];

const EMPLOYMENT_OPTIONS: FilterOption[] = [
  { value: "_any", label: "Any" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
];

const MODULE_OPTIONS: FilterOption[] = [
  { value: "_any", label: "Any module" },
  ...SERVICENOW_JOB_MODULES.map((m) => ({ value: m, label: m })),
];

const POSTED_OPTIONS: FilterOption[] = [
  { value: "_any", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

/** Detailed (non-search) filters, used for the popover, chips, and active count. */
const DETAILED_FILTER_DEFS: Array<{
  key: keyof PublishedJobsFilters;
  options?: FilterOption[];
  label: string;
  icon: FilterIcon;
}> = [
  {
    key: "role",
    options: ROLE_OPTIONS,
    label: "Role",
    icon: BriefcaseBusiness,
  },
  {
    key: "experience",
    options: EXPERIENCE_OPTIONS,
    label: "Experience",
    icon: Sparkles,
  },
  {
    key: "work",
    options: WORK_OPTIONS,
    label: "Work mode",
    icon: BriefcaseBusiness,
  },
  {
    key: "type",
    options: EMPLOYMENT_OPTIONS,
    label: "Employment type",
    icon: BriefcaseBusiness,
  },
  { key: "module", options: MODULE_OPTIONS, label: "Module", icon: Layers3 },
  {
    key: "posted",
    options: POSTED_OPTIONS,
    label: "Date posted",
    icon: CalendarDays,
  },
  {
    key: "location",
    options: TOP_COUNTRY_OPTIONS,
    label: "Location",
    icon: Filter,
  },
];

const QUICK_FILTER_KEYS: Array<keyof PublishedJobsFilters> = [
  "role",
  "location",
  "work",
];

const ADVANCED_FILTER_DEFS = DETAILED_FILTER_DEFS.filter(
  (def) => !QUICK_FILTER_KEYS.includes(def.key),
);

/** Narrow enough for `/` (merged with `setup`) and legacy `/jobs/` redirect (same filter shape). */
export type PublishedJobsSearchState = PublishedJobsFilters & {
  setup?: string;
  page?: number;
  linkedinPage?: number;
};

export type PublishedJobsNavigate = (opts: {
  search: true | ((prev: PublishedJobsSearchState) => PublishedJobsSearchState);
  /** Preserve scroll position on filter/search navigations. */
  resetScroll?: boolean;
}) => void | Promise<void>;

export function hasActivePublishedJobFilters(
  s: PublishedJobsSearchState,
): boolean {
  return Boolean(
    s.q?.trim() ||
    s.role ||
    s.experience ||
    s.work ||
    s.type ||
    s.module ||
    s.posted ||
    s.location?.trim(),
  );
}

export function clearPublishedJobSearchPreserveSetup(
  prev: PublishedJobsSearchState,
): PublishedJobsSearchState {
  const next: PublishedJobsSearchState = {};
  if (prev.setup !== undefined && prev.setup !== "") {
    next.setup = prev.setup;
  }
  return next;
}

/** Sticky offset below fixed [`PublicSiteHeader`](./public-site-layout.tsx) (`h-14`). */
const STICKY_BELOW_HEADER = "top-14";

type FilterOrientation = "horizontal" | "vertical";

type FilterControlsProps = {
  search: PublishedJobsSearchState;
  navigate: PublishedJobsNavigate;
};

/** Shared URL-backed filter state (debounced search + location, immediate params). */
function usePublishedJobFilterState({ search, navigate }: FilterControlsProps) {
  const [localQ, setLocalQ] = useState(search.q ?? "");

  const filtersActive = useMemo(
    () => hasActivePublishedJobFilters(search),
    [search],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL search to input
    setLocalQ(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = localQ.trim() || undefined;
      if (next !== search.q) {
        void navigate({
          search: (p) => ({
            ...p,
            q: next,
            page: undefined,
            linkedinPage: undefined,
          }),
          resetScroll: false,
        });
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [localQ, navigate, search.q]);

  const setParam = (
    key: keyof PublishedJobsFilters,
    value: string | undefined,
  ) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        [key]: value || undefined,
        page: undefined,
        linkedinPage: undefined,
      }),
      resetScroll: false,
    });
  };

  const resetFilters = () => {
    void navigate({
      search: (prev) => clearPublishedJobSearchPreserveSetup(prev),
      resetScroll: false,
    });
  };

  return {
    localQ,
    setLocalQ,
    filtersActive,
    setParam,
    resetFilters,
  };
}

/** The actual filter inputs, laid out as a row (`horizontal`) or stack (`vertical`). */
function PublishedJobsFilterControls({
  search,
  navigate,
  orientation,
  showReset = true,
  showSearch = true,
}: FilterControlsProps & {
  orientation: FilterOrientation;
  showReset?: boolean;
  showSearch?: boolean;
}) {
  const { localQ, setLocalQ, filtersActive, setParam, resetFilters } =
    usePublishedJobFilterState({ search, navigate });

  const vertical = orientation === "vertical";

  return (
    <div
      className={cn(
        vertical
          ? "flex w-full min-w-0 flex-col gap-4"
          : "flex w-full max-w-full min-w-0 flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0",
      )}
    >
      {showSearch && (
        <div
          className={cn(
            "relative",
            vertical
              ? "w-full"
              : "max-w-[min(100%,20rem)] min-w-[12rem] shrink-0 sm:max-w-none sm:min-w-0 sm:flex-1",
          )}
        >
          <label htmlFor="published-jobs-q" className="sr-only">
            Search by title or company
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 z-[1] size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="published-jobs-q"
            placeholder="Search title or company…"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className={cn(
              "h-11 border-border/80 bg-background/90 pl-8 text-sm shadow-none sm:h-9",
              "transition-[box-shadow,background-color,border-color] duration-200",
              "focus-visible:bg-background focus-visible:shadow-sm",
            )}
          />
        </div>
      )}

      <FilterSelect
        label="Role"
        value={search.role}
        onChange={(v) => setParam("role", v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : "min-w-[8.5rem] w-[8.5rem] sm:min-w-[9rem] sm:w-[9rem]"
        }
        options={ROLE_OPTIONS}
      />
      <FilterSelect
        label="Experience"
        value={search.experience}
        onChange={(v) => setParam("experience", v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : "min-w-[7rem] w-[7rem] sm:min-w-[7.5rem] sm:w-[7.5rem]"
        }
        options={EXPERIENCE_OPTIONS}
      />
      <FilterSelect
        label="Work mode"
        value={search.work}
        onChange={(v) => setParam("work", v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : "min-w-[7.5rem] w-[7.5rem] sm:min-w-[8rem] sm:w-[8rem]"
        }
        options={WORK_OPTIONS}
      />
      <FilterSelect
        label="Employment"
        value={search.type}
        onChange={(v) => setParam("type", v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : "min-w-[8rem] w-[8rem] sm:min-w-[8.5rem] sm:w-[8.5rem]"
        }
        options={EMPLOYMENT_OPTIONS}
      />
      <FilterSelect
        label="Module"
        value={search.module}
        onChange={(v) => setParam("module", v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : "min-w-[7rem] w-[7rem] sm:min-w-[7.5rem] sm:w-[7.5rem]"
        }
        options={MODULE_OPTIONS}
      />
      <FilterSelect
        label="Date posted"
        value={search.posted}
        onChange={(v) => setParam("posted", v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : "min-w-[8.5rem] w-[8.5rem] sm:min-w-[9rem] sm:w-[9rem]"
        }
        options={POSTED_OPTIONS}
      />
      <FilterSelect
        label="Location"
        value={search.location}
        onChange={(v) => setParam("location", v)}
        fullWidth={vertical}
        triggerClass={
          vertical
            ? undefined
            : "min-w-[9rem] w-[9rem] sm:min-w-[9.5rem] sm:w-[9.5rem]"
        }
        options={TOP_COUNTRY_OPTIONS}
      />

      {showReset && filtersActive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 text-xs text-muted-foreground hover:text-foreground",
            vertical
              ? "mt-1 h-8 w-full justify-center"
              : "mb-0.5 h-8 shrink-0 px-3",
          )}
          onClick={resetFilters}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          <span>Reset</span>
        </Button>
      )}
    </div>
  );
}

/** URL-backed filters for published jobs, horizontal sticky bar (legacy layout). */
export function PublishedJobsFiltersBar(props: FilterControlsProps) {
  return (
    <section
      aria-labelledby="job-filters-heading"
      className={cn(
        "sticky z-40 -mx-4 w-full max-w-full min-w-0 overflow-x-clip bg-background/95 px-4 py-2 backdrop-blur",
        "supports-[backdrop-filter]:bg-background/85",
        STICKY_BELOW_HEADER,
      )}
    >
      <h3 id="job-filters-heading" className="sr-only">
        Find your next role — search and filters
      </h3>
      <PublishedJobsFilterControls {...props} orientation="horizontal" />
    </section>
  );
}

/** Count of active detailed (non-search) filters. */
export function countActiveDetailedFilters(
  s: PublishedJobsSearchState,
): number {
  return DETAILED_FILTER_DEFS.reduce((n, def) => {
    const value = s[def.key];
    return n + (typeof value === "string" && value.trim() ? 1 : 0);
  }, 0);
}

/** Compact "Filters" trigger that opens the detailed controls in a popover. */
export function PublishedJobsFiltersButton({
  search,
  navigate,
}: FilterControlsProps) {
  const count = ADVANCED_FILTER_DEFS.reduce((n, def) => {
    const value = search[def.key];
    return n + (typeof value === "string" && value.trim() ? 1 : 0);
  }, 0);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="relative"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-72 overflow-y-auto">
        <PublishedJobsAdvancedFilters search={search} navigate={navigate} />
      </PopoverContent>
    </Popover>
  );
}

export function PublishedJobsQuickFilters({
  search,
  navigate,
}: FilterControlsProps) {
  const { filtersActive, setParam, resetFilters } = usePublishedJobFilterState({
    search,
    navigate,
  });

  return (
    <div className="flex flex-wrap items-center gap-2 max-md:w-full">
      <QuickFilterRadioMenu
        label="Role"
        value={search.role}
        onChange={(v) => setParam("role", v)}
        options={ROLE_OPTIONS}
        className="h-8 min-w-[8.25rem]"
      />
      <QuickFilterRadioMenu
        label="Location"
        value={search.location}
        onChange={(v) => setParam("location", v)}
        options={TOP_COUNTRY_OPTIONS}
        className="h-8 min-w-[9rem]"
      />
      <QuickFilterRadioMenu
        label="Work mode"
        value={search.work}
        onChange={(v) => setParam("work", v)}
        options={WORK_OPTIONS}
        className="h-8 min-w-[8.25rem]"
      />
      {filtersActive ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={resetFilters}
        >
          Clear all
        </Button>
      ) : null}
    </div>
  );
}

function PublishedJobsAdvancedFilters({
  search,
  navigate,
}: FilterControlsProps) {
  const { setParam, resetFilters } = usePublishedJobFilterState({
    search,
    navigate,
  });
  const activeCount = ADVANCED_FILTER_DEFS.reduce((n, def) => {
    const value = search[def.key];
    return n + (typeof value === "string" && value.trim() ? 1 : 0);
  }, 0);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">More filters</p>
          <p className="text-xs text-muted-foreground">
            Experience, employment type, module, and date posted.
          </p>
        </div>
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={resetFilters}
          >
            Reset
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {ADVANCED_FILTER_DEFS.map((def) => (
          <FilterSelect
            key={def.key}
            label={def.label}
            value={search[def.key] as string | undefined}
            onChange={(v) => setParam(def.key, v)}
            options={def.options ?? []}
            fullWidth
            icon={def.icon}
          />
        ))}
      </div>
    </div>
  );
}

/** Vertical filter panel for a desktop sidebar. */
export function PublishedJobsFiltersSidebar(props: FilterControlsProps) {
  const filtersActive = hasActivePublishedJobFilters(props.search);
  return (
    <section
      aria-labelledby="job-filters-heading"
      className="rounded-lg border border-border bg-card p-4 shadow-xs"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3
          id="job-filters-heading"
          className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase"
        >
          Filters
        </h3>
        {filtersActive && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() =>
              void props.navigate({
                search: (prev) => clearPublishedJobSearchPreserveSetup(prev),
                resetScroll: false,
              })
            }
          >
            Reset
          </Button>
        )}
      </div>
      <PublishedJobsFilterControls
        {...props}
        orientation="vertical"
        showReset={false}
      />
    </section>
  );
}

/** Mobile "Filters" trigger that opens the vertical controls in a slide-in sheet. */
export function PublishedJobsFiltersDrawer(props: FilterControlsProps) {
  const filtersActive = hasActivePublishedJobFilters(props.search);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-center gap-2 sm:w-auto"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {filtersActive && (
            <span
              className="ml-1 inline-flex size-2 rounded-full bg-primary"
              aria-hidden
            />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(90vw,22rem)]">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6 pt-2">
          <PublishedJobsFilterControls {...props} orientation="vertical" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSelect(props: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
  triggerClass?: string;
  fullWidth?: boolean;
  hideLabel?: boolean;
  icon?: FilterIcon;
  placeholder?: string;
}) {
  const val = props.value ?? "_any";
  const Icon = props.icon;
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        props.fullWidth ? "w-full" : "shrink-0",
      )}
    >
      {!props.hideLabel ? (
        <label className="text-xs font-medium text-muted-foreground">
          {props.label}
        </label>
      ) : null}
      <Select
        value={val}
        onValueChange={(v) => props.onChange(v === "_any" ? undefined : v)}
      >
        <SelectTrigger
          className={cn(
            "h-8 border-input bg-background text-xs shadow-xs transition-[background-color,border-color,box-shadow] duration-200",
            "hover:bg-muted/30 focus-visible:bg-background data-[state=open]:bg-background",
            props.fullWidth && "w-full",
            props.triggerClass,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <Icon
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            ) : null}
            <SelectValue placeholder={props.placeholder ?? props.label} />
          </span>
        </SelectTrigger>
        <SelectContent
          align="start"
          className="min-w-[var(--radix-select-trigger-width)]"
        >
          {props.options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function QuickFilterRadioMenu(props: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: FilterOption[];
  className?: string;
}) {
  const currentValue = props.value ?? "_any";
  const currentLabel =
    props.options.find((option) => option.value === currentValue)?.label ??
    props.label;
  const menuOptions = props.options.filter((option) => option.value !== "_any");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "justify-between gap-3 px-3 text-xs shadow-xs",
            props.className,
          )}
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{props.label}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentValue}
            onValueChange={(next) =>
              props.onChange(next === "_any" ? undefined : next)
            }
          >
            {menuOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
