import { useEffect, useRef, type ReactNode } from "react";
import { LayoutGroup } from "motion/react";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupByDate } from "@/lib/list/group-by-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { InboxFilterPills, type InboxFilterPill } from "./inbox-filter-pills";
import { InboxListRow, type InboxRowData } from "./inbox-list-row";

interface InboxListProps<T extends string> {
  /** Page heading rendered above the search box (e.g. "Inbox", "Open roles"). */
  title?: ReactNode;
  /** Optional trailing controls rendered next to the title (e.g. a Filters button). */
  titleActions?: ReactNode;

  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  pills: InboxFilterPill<T>[];
  activeFilter: T;
  onFilterChange: (id: T) => void;
  /** Unique per surface to keep the pill + selection animations isolated. */
  layoutId: string;

  /** Rendered at the end of the tab row (e.g. active-filter chips + a Filters button). */
  pillsTrailing?: ReactNode;

  rows: InboxRowData[];
  selectedId: string | null;
  onSelect: (id: string) => void;

  loading?: boolean;
  /** Background refetch in progress: dims the existing rows without removing them. */
  busy?: boolean;
  emptyMessage: string;
  className?: string;
  /** Optional wrapper around the list controls and rows, excluding detached pagination. */
  contentContainerClassName?: string;
  /** Sticky offset for date-group headers (e.g. `top-14` below a fixed site header). */
  stickyTopClassName?: string;

  /** Whether more rows can be loaded. */
  hasMore?: boolean;
  /** Fetch the next page. */
  onLoadMore?: () => void;
  /** Next page is currently loading. */
  loadingMore?: boolean;
  /** Auto-fetch the next page when the sentinel enters view. */
  autoLoadMore?: boolean;
  /** Removes built-in left/right list padding so rows align flush with the parent layout. */
  edgeToEdge?: boolean;
  /** Places search and trailing controls on the same row. */
  inlineSearchControls?: boolean;
  /** Caps the search box width when inline controls are enabled. */
  searchMaxWidthClassName?: string;
  /** Optional class override for the search input. */
  searchInputClassName?: string;
  /** Hides the search input while preserving URL-driven filtering for callers that need it. */
  hideSearch?: boolean;
  /** Optional class override for the inline search/controls row. */
  inlineSearchControlsClassName?: string;
  /** Optional class override for numbered pagination footer. */
  paginationContainerClassName?: string;
  /** Optional class override for the list body that contains grouped rows and pagination. */
  rowsContainerClassName?: string;
  /** Optional class override for sticky date-group headers. */
  groupHeaderClassName?: string;
  /** Optional class override for the first date-group header content row. */
  firstGroupHeaderClassName?: string;
  /** Optional compact count displayed beside the first date-group label. */
  firstGroupHeaderCount?: number;
  /** Header label to use when the list is empty but first-group controls should remain visible. */
  emptyGroupHeaderLabel?: string;
  /** Optional row presentation variant. */
  rowLayout?: "default" | "public-job";
  /** Renders the filter pills beside the first date-group label instead of the controls row. */
  pillsInFirstGroupHeader?: boolean;
  /** Current numbered page. Enables pagination footer when totalPages is provided. */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  /** Renders pagination after contentContainerClassName instead of inside the list body. */
  paginationOutside?: boolean;
}

const SKELETON_ROWS = 6;

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 2) pages.add(currentPage - 1);
  if (currentPage < totalPages - 1) pages.add(currentPage + 1);

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

export function InboxList<T extends string>({
  title,
  titleActions,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  pills,
  activeFilter,
  onFilterChange,
  layoutId,
  pillsTrailing,
  rows,
  selectedId,
  onSelect,
  loading = false,
  busy = false,
  emptyMessage,
  className,
  contentContainerClassName,
  stickyTopClassName = "top-0",
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  autoLoadMore = true,
  edgeToEdge = false,
  inlineSearchControls = false,
  searchMaxWidthClassName,
  searchInputClassName,
  hideSearch = false,
  inlineSearchControlsClassName,
  paginationContainerClassName,
  rowsContainerClassName,
  groupHeaderClassName,
  firstGroupHeaderClassName,
  firstGroupHeaderCount,
  emptyGroupHeaderLabel = "Last 7 days",
  rowLayout = "default",
  pillsInFirstGroupHeader = false,
  page,
  totalPages,
  onPageChange,
  paginationOutside = false,
}: InboxListProps<T>) {
  const groups = groupByDate(rows, (row) => row.timestamp);
  const selectionLayoutId = `${layoutId}-selection`;
  const horizontalPaddingClass = edgeToEdge ? "px-0" : "px-4";
  const trailingPaddingClass = edgeToEdge ? "pr-0" : "pr-4";

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const showPagination =
    typeof page === "number" &&
    typeof totalPages === "number" &&
    totalPages > 1 &&
    Boolean(onPageChange);
  useEffect(() => {
    if (showPagination) return;
    if (!autoLoadMore) return;
    const node = sentinelRef.current;
    if (!node || !hasMore || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [showPagination, autoLoadMore, hasMore, onLoadMore, loadingMore]);

  const filterPills = (
    <InboxFilterPills
      className="min-w-0 flex-1"
      pills={pills}
      activeId={activeFilter}
      onChange={onFilterChange}
      layoutId={layoutId}
      paddingClassName={
        pillsInFirstGroupHeader ? "px-0 pb-0" : horizontalPaddingClass
      }
    />
  );

  const searchBox = (
    <div className={cn("relative w-full", searchMaxWidthClassName)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className={cn(
          "h-10 border-input bg-background pl-9 text-sm shadow-xs",
          searchInputClassName,
        )}
      />
    </div>
  );

  const paginationItems =
    showPagination && page && totalPages
      ? getPaginationItems(page, totalPages)
      : [];

  const goToPage = (nextPage: number) => {
    if (!onPageChange || !page || !totalPages) return;
    const boundedPage = Math.min(Math.max(nextPage, 1), totalPages);
    if (boundedPage !== page) onPageChange(boundedPage);
  };

  const paginationFooter =
    showPagination && page && totalPages ? (
      <div
        className={cn(
          "flex items-center justify-center py-4",
          horizontalPaddingClass,
          paginationContainerClassName,
        )}
      >
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              />
            </PaginationItem>
            {paginationItems.map((item, index) => (
              <PaginationItem key={`${item}-${index}`}>
                {item === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    isActive={item === page}
                    onClick={() => goToPage(item)}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    ) : hasMore ? (
      <div
        ref={sentinelRef}
        className={cn(
          "flex items-center justify-center py-4",
          horizontalPaddingClass,
        )}
      >
        {loadingMore ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin motion-reduce:hidden" />
            Loading more…
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            className="h-8 px-3 text-xs"
          >
            Load more
          </Button>
        )}
      </div>
    ) : null;

  return (
    <div
      className={cn(
        "mx-auto flex h-full max-w-5xl min-w-0 flex-col",
        className,
      )}
    >
      <div className={cn("min-w-0", contentContainerClassName)}>
        <div className="min-w-0 shrink-0">
          {title || titleActions ? (
            <div
              className={cn(
                "flex items-center justify-between gap-3 py-4",
                horizontalPaddingClass,
              )}
            >
              {title ? (
                <h1 className="text-lg font-semibold tracking-tight">
                  {title}
                </h1>
              ) : (
                <span />
              )}
              {titleActions ? (
                <div className="flex shrink-0 items-center gap-2">
                  {titleActions}
                </div>
              ) : null}
            </div>
          ) : null}

          {inlineSearchControls ? (
            hideSearch ? null : (
              <div
                className={cn(
                  "flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between",
                  horizontalPaddingClass,
                  inlineSearchControlsClassName,
                )}
              >
                {searchBox}
                {pillsTrailing ? (
                  <div className="shrink-0">{pillsTrailing}</div>
                ) : null}
              </div>
            )
          ) : (
            <>
              {hideSearch ? null : (
                <div className={cn("pb-4", horizontalPaddingClass)}>
                  {searchBox}
                </div>
              )}

              <div className={cn("flex items-end gap-2", trailingPaddingClass)}>
                {pillsInFirstGroupHeader ? null : filterPills}
                {pillsTrailing ? (
                  <div className="mb-4 shrink-0">{pillsTrailing}</div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div className={cn("flex-1 space-y-2 py-4", horizontalPaddingClass)}>
            {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 py-1.5">
                <Skeleton className="size-1.5 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <>
            {pillsInFirstGroupHeader &&
            typeof firstGroupHeaderCount === "number" ? (
              <div
                className={cn(
                  "mb-1 flex min-w-0 flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                  horizontalPaddingClass,
                  firstGroupHeaderClassName,
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="shrink-0 text-xs font-medium text-muted-foreground">
                    {emptyGroupHeaderLabel}
                  </h2>
                  <span className="text-xs text-muted-foreground" aria-hidden>
                    |
                  </span>
                  <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-full border border-border bg-background px-2 text-xs font-medium text-muted-foreground tabular-nums shadow-xs">
                    {firstGroupHeaderCount} Job Posts
                  </span>
                </div>
                {pillsTrailing ? (
                  <div className="min-w-0 shrink-0">{pillsTrailing}</div>
                ) : null}
              </div>
            ) : null}
            <p
              className={cn(
                "py-12 text-center text-sm text-muted-foreground",
                horizontalPaddingClass,
              )}
            >
              {emptyMessage}
            </p>
          </>
        ) : (
          <div
            className={cn(
              "min-w-0 transition-opacity duration-200 motion-reduce:transition-none",
              busy && "opacity-70",
            )}
            aria-busy={busy || undefined}
          >
            <LayoutGroup id={layoutId}>
              <div className={cn("pb-4", rowsContainerClassName)}>
                {groups.map((group, groupIndex) => {
                  const followsToday =
                    groupIndex > 0 && groups[groupIndex - 1]?.label === null;
                  return (
                    <section
                      key={group.id}
                      className={cn(
                        group.label &&
                          groupIndex > 0 &&
                          (followsToday ? "mt-4" : "mt-6"),
                      )}
                    >
                      {group.label ? (
                        <div
                          className={cn(
                            "sticky z-10 bg-background",
                            stickyTopClassName,
                            groupHeaderClassName,
                          )}
                        >
                          {pillsInFirstGroupHeader &&
                          groupIndex === 0 &&
                          typeof firstGroupHeaderCount === "number" ? (
                            <div
                              className={cn(
                                "mb-1 flex min-w-0 flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                                horizontalPaddingClass,
                                firstGroupHeaderClassName,
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <h2 className="shrink-0 text-xs font-medium text-muted-foreground">
                                  {group.label}
                                </h2>
                                <span
                                  className="text-xs text-muted-foreground"
                                  aria-hidden
                                >
                                  |
                                </span>
                                <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-full border border-border bg-background px-2 text-xs font-medium text-muted-foreground tabular-nums shadow-xs">
                                  {firstGroupHeaderCount} Job Posts
                                </span>
                              </div>
                              {pillsTrailing ? (
                                <div className="min-w-0 shrink-0">
                                  {pillsTrailing}
                                </div>
                              ) : null}
                            </div>
                          ) : pillsInFirstGroupHeader && groupIndex === 0 ? (
                            <div
                              className={cn(
                                "flex min-w-0 items-center justify-between gap-3 py-2.5",
                                horizontalPaddingClass,
                              )}
                            >
                              <div className="min-w-0">{filterPills}</div>
                              <h2 className="ml-auto shrink-0 text-right text-xs font-medium text-muted-foreground">
                                {group.label}
                              </h2>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "flex min-w-0 items-center gap-2 py-2.5",
                                horizontalPaddingClass,
                              )}
                            >
                              <h2 className="shrink-0 text-xs font-medium text-muted-foreground">
                                {group.label}
                              </h2>
                            </div>
                          )}
                        </div>
                      ) : null}
                      <ul
                        className={cn(
                          rowLayout === "public-job" && "space-y-4",
                        )}
                      >
                        {group.items.map((row) => (
                          <li key={row.id}>
                            <InboxListRow
                              row={row}
                              selected={selectedId === row.id}
                              onSelect={onSelect}
                              selectionLayoutId={selectionLayoutId}
                              compactEdgePadding={edgeToEdge}
                              layout={rowLayout}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}

                {paginationOutside ? null : paginationFooter}
              </div>
            </LayoutGroup>
          </div>
        )}
      </div>
      {paginationOutside ? paginationFooter : null}
    </div>
  );
}
