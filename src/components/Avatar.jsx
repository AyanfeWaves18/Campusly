export default function Avatar({ photo, name = "?", size = 44, bg = "#f4c0d1", fg = "#72243e" }) {
  const base = { width: size, height: size, borderRadius: "50%", flexShrink: 0 };
  if (photo) return <img src={photo} alt={name} style={{ ...base, objectFit: "cover" }} />;
  return (
    <div
      style={{
        ...base,
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: size * 0.4,
      }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}