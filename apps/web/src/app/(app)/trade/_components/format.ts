export function formatAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1) {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`;
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(value);
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `$${formatCompact(value)}`;
}

export function formatChange(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

export function errorCopy(code: string | null): string {
  if (code === "RATE_LIMITED") {
    return "Market data is rate limited. Try again shortly.";
  }
  if (code === "UPSTREAM_ERROR") {
    return "Market data is unavailable from the provider.";
  }
  return "Market data could not be loaded.";
}
