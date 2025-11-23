interface UploadSquareProps {
  className?: string;
  size?: number;
}

export default function UploadSquare({
  className = "",
  size = 24,
}: UploadSquareProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/SVG"
      className={className}
      strokeLinecap="butt"
      strokeLinejoin="miter"
    >
      {/* Arrow pointing up */}
      <polyline
        points="8,11 12,7 16,11"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Vertical line of arrow */}
      <line
        x1="12"
        y1="7"
        x2="12"
        y2="17"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Bottom horizontal line */}
      <line
        x1="5"
        y1="21"
        x2="19"
        y2="21"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
