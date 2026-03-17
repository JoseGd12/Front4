import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { cn } from "./utils";
import { Button, buttonVariants } from "./button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
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
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
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
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 0) return [];
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);
  return pages.reduce<(number | "ellipsis")[]>((acc, page, index, arr) => {
    if (index > 0 && page - arr[index - 1] > 1) acc.push("ellipsis");
    acc.push(page);
    return acc;
  }, []);
}

type EllipsisPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function EllipsisPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: EllipsisPaginationProps) {
  if (totalPages < 1) return null;

  const items = getPaginationItems(currentPage, totalPages);
  const handlePrevious = () => onPageChange(Math.max(1, currentPage - 1));
  const handleNext = () => onPageChange(Math.min(totalPages, currentPage + 1));

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="border-gray-dark bg-gray-darker text-gray-lightest hover:bg-gray-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
        </PaginationItem>
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis className="text-gray-lightest" />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <Button
                type="button"
                variant={item === currentPage ? "default" : "outline"}
                size="icon"
                onClick={() => onPageChange(item)}
                className={
                  item === currentPage
                    ? "bg-orange-primary text-black-primary hover:bg-orange-primary/90"
                    : "border-gray-dark bg-transparent text-gray-lightest hover:bg-gray-darker"
                }
              >
                {item}
              </Button>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="border-gray-dark bg-gray-darker text-gray-lightest hover:bg-gray-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  EllipsisPagination,
};
