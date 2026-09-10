import type { ReactNode } from "react";

type SectionHeadingProps = {
  action?: ReactNode;
  align?: "left" | "center";
  eyebrow: string;
  title: string;
};

export function SectionHeading({ action, align = "left", eyebrow, title }: SectionHeadingProps) {
  return (
    <div className={`mb-8 flex gap-6 sm:mb-11 ${align === "center" ? "flex-col items-center text-center" : "items-end justify-between"}`}>
      <div>
        <p className="section-kicker">{eyebrow}</p>
        <h2 className="section-title mt-3">{title}</h2>
      </div>
      {action}
    </div>
  );
}
