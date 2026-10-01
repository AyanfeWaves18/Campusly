export default function Lightbox({ src, onClose, onRemove }) {
  const ghost = { color: "#fff", borderColor: "rgba(255,255,255,0.4)" };
  return (
    <div className="md-overlay center" onClick={onClose}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 16 }} />
        <div className="md-row" style={{ marginTop: 14 }}>
          <button className="md-btn ghost" style={ghost} onClick={onClose}>Close</button>
          {onRemove && <button className="md-btn danger" onClick={onRemove}>Remove photo</button>}
        </div>
      </div>
    </div>
  );
}