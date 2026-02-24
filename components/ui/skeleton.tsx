import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 inline-block", className)}
      {...props}
    />
  );
}

export { Skeleton };
