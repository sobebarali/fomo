import Image from "next/image";

export function TokenLogo({
  logoUri,
  symbol,
  size = 32,
}: {
  logoUri: string | null;
  symbol: string;
  size?: number;
}) {
  if (logoUri) {
    return (
      <Image
        alt=""
        className="rounded-full border border-white/10 bg-white/5"
        height={size}
        src={logoUri}
        style={{ height: size, width: size }}
        unoptimized
        width={size}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#121819] font-bold text-[#16e27b]"
      style={{ height: size, width: size }}
    >
      {symbol.slice(0, 1)}
    </span>
  );
}
