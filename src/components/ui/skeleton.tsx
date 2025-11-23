import { cn } from "~/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-border-default animate-pulse rounded-none border bg-white/10",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
