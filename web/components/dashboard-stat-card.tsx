import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type DashboardStatCardProps = {
  label: string;
  value: string | number;
  detail: string;
  badge: string;
  icon: LucideIcon;
  href?: string;
  urgent?: boolean;
  className?: string;
};

export function DashboardStatCard({
  label,
  value,
  detail,
  badge,
  icon: Icon,
  href,
  urgent = false,
  className,
}: DashboardStatCardProps) {
  const card = (
    <Card
      className={cn(
        "h-full gap-0 py-0 transition-[border-color,box-shadow,transform] duration-200 group-hover/card:-translate-y-0.5 group-hover/card:border-primary/35 group-hover/card:shadow-md",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover/card:bg-primary/10 group-hover/card:text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <strong className="text-2xl font-medium tracking-tight tabular-nums text-foreground">
              {value}
            </strong>
            <Badge variant={urgent ? "destructive" : "secondary"}>{badge}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{detail}</span>
            {href ? <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return <div className="group/card h-full">{card}</div>;

  return (
    <Link
      href={href}
      className="group/card block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`${label}: ${value}. ${detail}`}
    >
      {card}
    </Link>
  );
}
