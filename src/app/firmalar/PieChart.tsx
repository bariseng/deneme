"use client";

interface PieChartProps {
  data: { company: string; share: number; color: string }[];
  highlightCompany?: string;
}

export default function PieChart({ data, highlightCompany }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.share, 0);
  const size = 200;
  const center = size / 2;
  const radius = 80;

  // Build SVG arc paths
  let startAngle = -90; // start from top
  const slices = data.map((d) => {
    const angle = (d.share / total) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const isHighlighted =
      highlightCompany &&
      d.company.toLowerCase().includes(highlightCompany.toLowerCase().split(" ")[0]);

    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    startAngle = endAngle;

    return {
      ...d,
      path,
      isHighlighted,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Pie */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
      >
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.path}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
            className={`transition-opacity ${
              slice.isHighlighted ? "opacity-100" : "opacity-80 hover:opacity-100"
            }`}
          >
            <title>
              {slice.company}: %{slice.share.toFixed(1)}
            </title>
          </path>
        ))}
        {/* Center hole for donut effect */}
        <circle cx={center} cy={center} r={40} fill="white" />
        <text
          x={center}
          y={center - 5}
          textAnchor="middle"
          className="text-[11px] font-bold"
          fill="var(--foreground)"
        >
          Pazar
        </text>
        <text
          x={center}
          y={center + 10}
          textAnchor="middle"
          className="text-[10px]"
          fill="var(--foreground-light)"
        >
          Payı
        </text>
      </svg>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {slices.map((slice, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-2 py-1 rounded-lg ${
              slice.isHighlighted ? "bg-primary/5 ring-1 ring-primary/20" : ""
            }`}
          >
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span
              className={`text-xs flex-1 ${
                slice.isHighlighted
                  ? "font-semibold text-foreground"
                  : "text-foreground-light"
              }`}
            >
              {slice.company}
            </span>
            <span
              className={`text-xs font-medium ${
                slice.isHighlighted ? "text-primary" : "text-foreground-light"
              }`}
            >
              %{slice.share.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
