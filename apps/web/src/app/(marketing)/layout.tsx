import "./marketing.css";

// The landing is always dark cosmic regardless of system theme, so we scope the
// `dark` token set here rather than relying on the global theme toggle.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-svh bg-background text-foreground">
      {children}
    </div>
  );
}
