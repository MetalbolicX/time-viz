import "./src/index";
import { tsv } from "d3";

const parseRow = (d: any) => ({
  date: new Date(d.date),
  america: +d.america,
  europa: +d.europa,
  asia: +d.asia,
});

const data = await tsv(
  "https://raw.githubusercontent.com/Apress/create-web-charts-w-d3/refs/heads/master/D3Charts/charts_local/data_02.tsv",
  parseRow
);

const chart = document.querySelector("#chart");
if (!chart) {
  throw new Error("Chart element not found");
}

chart.config = {
  data,
  xSerie: {
    accessor: (d: any) => d.date,
    label: "Date",
  },
  ySeries: [
    {
      accessor: (d: any) => d.america,
      label: "America",
    },
    {
      accessor: (d: any) => d.europa,
      label: "Europa",
    },
    {
      accessor: (d: any) => d.asia,
      label: "Asia",
    },
  ],
};

chart.tooltipContent(({x, y}: any) => /*html*/`
  <ul>
    <li>${x.toLocaleDateString()}</li>
    <li>${y}</li>
  </ul>
`.trim());
