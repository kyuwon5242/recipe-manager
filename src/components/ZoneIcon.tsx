import { ZONES, type Zone } from "@/lib/zones";

export function ZoneIcon({
  zone,
  icon,
  className,
}: {
  zone: Zone;
  icon?: string;
  className?: string;
}) {
  const z = ZONES[zone];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${z.bg} ${z.text} ${className ?? ""}`}
    >
      {icon ?? z.icon}
    </span>
  );
}
