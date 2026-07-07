import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-2", className)}
      {...props}
    />
  );
}

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li data-slot="pagination-item" className={cn(className)} {...props} />
  );
}

function PaginationLink({
  className,
  isActive,
  ...props
}: React.ComponentProps<typeof Button> & {
  isActive?: boolean;
}) {
  return (
    <Button
      type="button"
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      variant={isActive ? "outline" : "ghost"}
      size="icon-sm"
      className={cn("text-xs", className)}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      aria-label="Go to previous page"
      data-slot="pagination-previous"
      variant="outline"
      size="sm"
      className={cn("h-8 px-2.5 text-xs", className)}
      disabled={disabled}
      {...props}
    >
      <ChevronLeft className="size-3.5" aria-hidden />
      {children ?? <span className="sr-only">Previous</span>}
    </Button>
  );
}

function PaginationNext({
  className,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      aria-label="Go to next page"
      data-slot="pagination-next"
      variant="outline"
      size="sm"
      className={cn("h-8 px-2.5 text-xs", className)}
      disabled={disabled}
      {...props}
    >
      {children ?? <span className="sr-only">Next</span>}
      <ChevronRight className="size-3.5" aria-hidden />
    </Button>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-8 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
