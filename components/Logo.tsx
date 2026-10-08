import Link from "next/link";

/** Logo « Shives. » avec le point orange. */
export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`font-display text-[28px] font-extrabold tracking-[-0.03em] no-underline ${className}`}>
      Shives<span className="text-sun">.</span>
    </Link>
  );
}
