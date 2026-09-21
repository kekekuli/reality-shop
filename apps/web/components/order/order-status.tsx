import { cn } from "@/lib/utils";

export function OrderStatus({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        status === "pending_payment" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "paid" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        status === "cancelled" && "bg-muted text-muted-foreground",
        !["pending_payment", "paid", "cancelled"].includes(status) &&
          "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
