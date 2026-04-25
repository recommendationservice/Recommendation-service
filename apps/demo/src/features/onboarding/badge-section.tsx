"use client";

type BadgeSectionProps = { title: string; items: string[] };

export function BadgeSection({ title, items }: BadgeSectionProps) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-inter text-sm font-semibold text-black/60">
        {title}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-full bg-app-canvas px-3 py-1 font-montserrat text-sm text-black/80"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
