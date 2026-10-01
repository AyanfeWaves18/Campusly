export default function Logo({ size = 30 }) {
  return (
    <span className="logo">
      <img src="/favicon.svg" alt="" width={size} height={size} />
      <span>
        Campus<b>ly</b>
      </span>
    </span>
  );
}