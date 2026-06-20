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

const DARK_CHART_THEME: ChartTheme = {
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

export function getChartTheme(_isLight?: boolean): ChartTheme {
  return DARK_CHART_THEME;
}

export function getChartTooltipProps(_isLight: boolean, primaryColor: string) {
  const ct = DARK_CHART_THEME;
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
