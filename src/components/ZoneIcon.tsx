import { ZONES, type Zone } from "@/lib/zones";

export function ZoneIcon({
  zone,
  icon,
  title,
  className,
}: {
  zone: Zone;
  icon?: string;
  title?: string;
  className?: string;
}) {
  const z = ZONES[zone];
  return (
    <span
      aria-hidden="true"
      title={title ?? z.label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${z.bg} ${z.text} ${className ?? ""}`}
    >
      {icon ?? z.icon}
    </span>
  );
}
