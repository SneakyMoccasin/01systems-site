export default function WaterlooDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      {children}
    </div>
  );
}
