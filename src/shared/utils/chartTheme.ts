export type ChartTheme = {
  grid: string;
  axis: string;
  tick: string;
  tooltipBg: string;
  tooltipItem: string;
  tooltipLabel: string;
  tooltipBorder: string;
  tooltipDivider: string;
  cursor: string;
  cursorStrong: string;
  activeDotFill: string;
};

export function getChartTheme(isLight: boolean): ChartTheme {
  if (isLight) {
    return {
      grid: "#d4d1cb",
      axis: "#8a8782",
      tick: "#3a3835",
      tooltipBg: "#f0ede8",
      tooltipItem: "#3a3835",
      tooltipLabel: "#1a1a1a",
      tooltipBorder: "#c9a96e",
      tooltipDivider: "#c4c1bb",
      cursor: "rgba(26, 26, 26, 0.06)",
      cursorStrong: "rgba(26, 26, 26, 0.10)",
      activeDotFill: "#f0ede8",
    };
  }

  return {
    grid: "#2a2a2a",
    axis: "#888",
    tick: "#ccc",
    tooltipBg: "#1a1919",
    tooltipItem: "#d0d0d0",
    tooltipLabel: "#ffffff",
    tooltipBorder: "#d8b081",
    tooltipDivider: "#333",
    cursor: "#ffffff10",
    cursorStrong: "#ffffff18",
    activeDotFill: "#1a1a1a",
  };
}

export function getChartTooltipProps(isLight: boolean, primaryColor: string) {
  const ct = getChartTheme(isLight);
  return {
    cursor: { fill: ct.cursor },
    contentStyle: {
      backgroundColor: ct.tooltipBg,
      border: `1px solid ${primaryColor}`,
      borderRadius: 12,
    },
    itemStyle: { color: ct.tooltipItem },
    labelStyle: { color: ct.tooltipLabel, fontWeight: 600 as const },
  };
}
