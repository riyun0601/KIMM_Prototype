import { useEffect, useRef } from "react";

const residualSeries = [
  ["Ux", "#4f8aa6", 0.126, 0.05],
  ["Uy", "#e09a45", 0.118, 0.7],
  ["Uz", "#65ad65", 0.098, 1.3],
  ["epsilon", "#bd5257", 0.155, 2.1],
  ["k", "#806c9e", 0.115, 2.7],
  ["p_rgh", "#8a6455", 0.087, 3.3],
];

export function ResidualChart({ progress }) {
  const canvasRef = useRef(null);
  useCanvasChart(canvasRef, progress, drawResiduals);
  return <div className="chart-shell"><canvas ref={canvasRef} aria-label="Residuals line chart" /></div>;
}

export function MonitorChart({ monitorName = "point-mon-1" }) {
  const canvasRef = useRef(null);
  useCanvasChart(canvasRef, 1, (context, width, height) => drawMonitor(context, width, height, monitorName));
  return <div className="monitor-chart-shell"><canvas ref={canvasRef} aria-label={`${monitorName} pressure chart`} /></div>;
}

function useCanvasChart(ref, dependency, draw) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const render = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const context = canvas.getContext("2d");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      draw(context, width, height, dependency);
    };
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    return () => observer.disconnect();
  }, [ref, dependency, draw]);
}

function drawResiduals(context, width, height, progress) {
  const margin = { left: 58, right: 22, top: 34, bottom: 38 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const currentIteration = Math.max(1, Math.floor(progress * 60));
  const xMax = Math.max(10, Math.ceil(currentIteration / 10) * 10);

  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.font = "12px Arial";
  context.fillStyle = "#777";
  context.textAlign = "center";
  context.fillText("Residuals", width / 2, 20);

  context.strokeStyle = "#e6e6e6";
  context.lineWidth = 1;
  context.fillStyle = "#7b7b7b";
  for (let x = 0; x <= xMax; x += 10) {
    const px = margin.left + (x / xMax) * plotWidth;
    line(context, px, margin.top, px, margin.top + plotHeight);
    context.textAlign = "center";
    context.fillText(String(x), px, height - 14);
  }
  const yTicks = [1, 0.1, 0.01, 0.001, 0.0001, 0.00001];
  yTicks.forEach(value => {
    const py = logY(value, margin.top, plotHeight);
    line(context, margin.left, py, margin.left + plotWidth, py);
    context.textAlign = "right";
    context.fillText(value === 0.00001 ? "10⁻⁵" : String(value), margin.left - 8, py + 4);
  });

  context.strokeStyle = "#555";
  context.lineWidth = 1.4;
  context.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

  residualSeries.forEach(([name, color, decay, phase]) => {
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = 1.8;
    for (let iteration = 1; iteration <= currentIteration; iteration += 1) {
      const value = residualValue(iteration, decay, phase, name);
      const x = margin.left + (iteration / xMax) * plotWidth;
      const y = logY(value, margin.top, plotHeight);
      if (iteration === 1) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
  });

  const legendX = margin.left + 15;
  const legendY = margin.top + 15;
  context.fillStyle = "rgba(255,255,255,.92)";
  context.strokeStyle = "#ddd";
  context.fillRect(legendX, legendY, 86, 132);
  context.strokeRect(legendX, legendY, 86, 132);
  residualSeries.forEach(([name, color], index) => {
    const y = legendY + 18 + index * 19;
    context.strokeStyle = color;
    context.lineWidth = 2;
    line(context, legendX + 9, y, legendX + 29, y);
    context.fillStyle = "#666";
    context.textAlign = "left";
    context.fillText(name, legendX + 36, y + 4);
  });
}

function residualValue(iteration, decay, phase, name) {
  const initialSpike = iteration < 5 ? 0.75 * Math.exp(-iteration * 0.45) * (1 + Math.sin(iteration * 2.2 + phase)) : 0;
  const shoulder = name === "k" ? 0.035 * Math.exp(-Math.pow(iteration - 25, 2) / 80) : 0;
  const base = Math.exp(-iteration * decay) * (0.32 + 0.08 * Math.sin(iteration * 0.22 + phase));
  const scale = name === "p_rgh" ? 1.1 : name === "epsilon" ? 0.55 : 0.82;
  return Math.max(0.000006, (base + initialSpike + shoulder) * scale);
}

function logY(value, top, height) {
  const maxLog = 0.3;
  const minLog = -5;
  const normalized = (maxLog - Math.log10(Math.max(value, 1e-5))) / (maxLog - minLog);
  return top + normalized * height;
}

function drawMonitor(context, width, height, monitorName) {
  const margin = { left: 62, right: 25, top: 45, bottom: 40 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const yMin = 1.1104;
  const yMax = 1.11175;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#777";
  context.font = "12px Arial";
  context.textAlign = "center";
  context.fillText(monitorName, width / 2, 22);
  context.strokeStyle = "#e5e5e5";
  [100, 110, 120, 130, 140, 150].forEach(value => {
    const x = margin.left + ((value - 100) / 50) * plotWidth;
    line(context, x, margin.top, x, margin.top + plotHeight);
    context.fillStyle = "#777";
    context.fillText(String(value), x, height - 15);
  });
  [1.1105, 1.1110, 1.1115].forEach(value => {
    const y = margin.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
    context.strokeStyle = "#e5e5e5";
    line(context, margin.left, y, margin.left + plotWidth, y);
    context.textAlign = "right";
    context.fillText(value.toFixed(4), margin.left - 7, y + 4);
  });
  context.strokeStyle = "#444";
  context.strokeRect(margin.left, margin.top, plotWidth, plotHeight);
  context.save();
  context.beginPath();
  context.rect(margin.left, margin.top, plotWidth, plotHeight);
  context.clip();
  context.beginPath();
  context.strokeStyle = "#4f8aa6";
  context.lineWidth = 2;
  for (let value = 100; value <= 150; value += 1) {
    const pressure = 1.11065 + 0.00002 * (value - 100) + 0.00036 * Math.exp(-Math.pow(value - 108, 2) / 32) - 0.00042 * Math.exp(-Math.pow(value - 121, 2) / 70);
    const x = margin.left + ((value - 100) / 50) * plotWidth;
    const y = margin.top + ((yMax - pressure) / (yMax - yMin)) * plotHeight;
    if (value === 100) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.stroke();
  context.restore();
  context.fillStyle = "rgba(255,255,255,.94)";
  context.strokeStyle = "#ddd";
  context.fillRect(margin.left + 15, margin.top + 12, 95, 38);
  context.strokeRect(margin.left + 15, margin.top + 12, 95, 38);
  context.strokeStyle = "#4f8aa6";
  line(context, margin.left + 25, margin.top + 31, margin.left + 48, margin.top + 31);
  context.fillStyle = "#666";
  context.textAlign = "left";
  context.fillText("Pressure", margin.left + 55, margin.top + 35);
}

function line(context, x1, y1, x2, y2) {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}
