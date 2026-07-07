import {
  memo,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatListTimestamp } from "@/lib/list/format-list-timestamp";
import { InboxStatusPill, type InboxPillItem } from "./inbox-status-pill";

export interface InboxRowData {
  id: string;
  unread?: boolean;
  /** Optional leading slot (avatar/logo). Falls back to the unread dot. */
  leading?: ReactNode;
  title: string;
  preview?: string;
  /** Right-aligned status pills (keep to ~2 for the cleanest layout). */
  pills?: InboxPillItem[];
  /** Trailing relative timestamp source. */
  timestamp?: string | Date;
  deemphasized?: boolean;
}

interface InboxListRowProps {
  row: InboxRowData;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Shared layout id for the animated selection accent; unique per surface. */
  selectionLayoutId: string;
  compactEdgePadding?: boolean;
  layout?: "default" | "public-job";
}

function InboxListRowComponent({
  row,
  selected,
  onSelect,
  selectionLayoutId,
  compactEdgePadding = false,
  layout = "default",
}: InboxListRowProps) {
  const showUnread = Boolean(row.unread);
  const isDeemphasized = Boolean(row.deemphasized);
  const publicJobLayout = layout === "public-job";
  const timestamp = row.timestamp ? formatListTimestamp(row.timestamp) : null;

  const handleMouseDown: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
  };

  const handleSelect = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.focus({ preventScroll: true });
    onSelect(row.id);
  };

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      onClick={handleSelect}
      className={cn(
        "relative flex w-full items-center border-l-2 border-l-transparent rounded-md py-2.5 text-left transition-[padding,background-color,border-color,opacity] duration-200 outline-none hover:bg-muted/40 focus-visible:bg-muted/40 motion-reduce:transition-none",
        publicJobLayout
          ? "gap-4 border border-[#ebebeb] !border-l bg-[#f7f7f7] p-4 transition-[border-color,box-shadow] hover:border-[#AAA] hover:bg-[#f7f7f7] hover:shadow-xl focus-visible:border-[#AAA] focus-visible:bg-[#f7f7f7] focus-visible:shadow-xl"
          : "gap-3",
        !publicJobLayout &&
          (compactEdgePadding
            ? cn(selected ? "px-3" : "px-0", "hover:px-3 focus-visible:px-3")
            : "px-4"),
        isDeemphasized && !selected && "opacity-80",
      )}
    >
      {selected && !publicJobLayout ? (
        <motion.span
          layoutId={selectionLayoutId}
          className="absolute inset-0 rounded-md border border-border/70 border-l-2 border-l-primary bg-muted/60"
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
        />
      ) : null}

      {publicJobLayout ? (
        <div className="relative z-[1] flex min-w-0 flex-1 items-stretch justify-between overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex w-fit max-w-full items-center gap-1.5 rounded-md border border-border bg-background p-1 shadow-xs [&_[data-slot=avatar]]:size-[22px] [&_[data-slot=avatar]]:rounded-sm [&_[data-slot=avatar-fallback]]:rounded-sm [&_[data-slot=avatar-fallback]]:text-[8px]">
              <div className="flex shrink-0 items-center justify-center">
                {row.leading}
              </div>
              <span
                className={cn(
                  "min-w-0 truncate text-sm leading-none",
                  showUnread ? "font-semibold" : "font-medium",
                )}
              >
                {row.title}
              </span>
            </div>
            {row.preview ? (
              <span className="min-w-0 truncate text-lg font-semibold leading-tight text-foreground">
                {row.preview}
              </span>
            ) : null}
          </div>
          <div className="ml-4 flex shrink-0 flex-col items-end justify-between">
            {row.timestamp ? (
              <time
                className="text-xs text-muted-foreground tabular-nums"
                dateTime={new Date(row.timestamp).toISOString()}
              >
                {timestamp}
              </time>
            ) : null}
            {row.pills && row.pills.length > 0 ? (
              <div className="flex flex-wrap items-center justify-end gap-1">
                {row.pills.map((pill, index) => (
                  <InboxStatusPill
                    key={`${pill.label}-${index}`}
                    label={pill.label}
                    variant={pill.variant}
                    icon={pill.icon}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] flex shrink-0 items-center justify-center">
            {row.leading ? (
              row.leading
            ) : (
              <span className="flex w-3 items-center justify-center">
                {showUnread ? (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : (
                  <span className="size-1.5 shrink-0" aria-hidden />
                )}
              </span>
            )}
          </div>

          <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex-row sm:items-baseline sm:gap-1.5">
            <span
              className={cn(
                "min-w-0 truncate text-sm sm:shrink-0",
                showUnread ? "font-semibold" : "font-medium",
              )}
            >
              {row.title}
            </span>
            {row.preview ? (
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {row.preview}
              </span>
            ) : null}
          </div>
        </>
      )}

      {!publicJobLayout && row.pills && row.pills.length > 0 ? (
        <div className="relative z-[1] hidden shrink-0 flex-wrap items-center justify-end gap-1 sm:flex">
          {row.pills.map((pill, index) => (
            <InboxStatusPill
              key={`${pill.label}-${index}`}
              label={pill.label}
              variant={pill.variant}
              icon={pill.icon}
            />
          ))}
        </div>
      ) : null}

      {!publicJobLayout && row.timestamp ? (
        <time
          className="relative z-[1] hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block"
          dateTime={new Date(row.timestamp).toISOString()}
        >
          {timestamp}
        </time>
      ) : null}
    </button>
  );
}

export const InboxListRow = memo(InboxListRowComponent);
