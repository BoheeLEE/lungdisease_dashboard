declare interface Window {
  Plotly: any;
}

declare interface PlotlyShape {
  type: string;
  xref: string;
  yref: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  line: {
    color: string;
    width: number;
    dash: string;
  };
}

declare interface PlotlyTrace {
  x: number[];
  y: string[];
  mode: string;
  type: string;
  marker: {
    size: number;
    symbol: string;
    color: string[];
  };
  error_x: {
    type: string;
    symmetric: boolean;
    array: number[];
    arrayminus: number[];
    color: string;
    thickness: number;
    width: number;
  };
  hoverinfo: string;
  text: string[];
  textposition: string;
}

declare interface PlotlyLayout {
  width: number;
  height: number;
  margin: {
    l: number;
    r: number;
    t: number;
    b: number;
  };
  plot_bgcolor: string;
  shapes: PlotlyShape[];
  xaxis: {
    fixedrange: boolean;
    range: number[];
    tickVals: number[];
    font: {
      size: number;
    };
    automargin: boolean;
    autorange: string;
  };
  yaxis: {
    fixedrange: boolean;
    automargin: boolean;
    autorange: string;
    showticklabels: boolean;
  };
}
