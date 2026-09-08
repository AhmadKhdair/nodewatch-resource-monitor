const history = [];
const maxSamples = 60;
const chart = document.getElementById("historyChart");
const ctx = chart.getContext("2d");

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;
const formatKbps = (value) => `${Number(value || 0).toFixed(1)} KB/s`;

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function setMeter(id, value) {
  document.getElementById(id).style.width = `${Math.min(Math.max(value || 0, 0), 100)}%`;
}

function drawLine(points, width, height, color) {
  if (points.length < 2) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = (index / (maxSamples - 1)) * width;
    const y = height - (point / 100) * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawChart() {
  const scale = window.devicePixelRatio || 1;
  const rect = chart.getBoundingClientRect();
  chart.width = Math.floor(rect.width * scale);
  chart.height = Math.floor(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  drawLine(history.map((item) => item.cpu), width, height, "#38bdf8");
  drawLine(history.map((item) => item.memory), width, height, "#34d399");
  drawLine(history.map((item) => item.disk), width, height, "#f59e0b");
}

function renderCores(cores) {
  const coreGrid = document.getElementById("coreGrid");
  coreGrid.innerHTML = cores.map((value, index) => `
    <div class="core-tile">
      <span>Core ${index + 1}</span>
      <strong>${formatPercent(value)}</strong>
      <div class="meter accent-cpu"><span style="width: ${Math.min(value, 100)}%"></span></div>
    </div>
  `).join("");
}

function renderProcesses(processes) {
  const rows = document.getElementById("processRows");
  rows.innerHTML = processes.map((process) => `
    <div class="table-row">
      <span>${process.pid}</span>
      <span title="${process.name}">${process.name}</span>
      <span>${formatPercent(process.cpu_percent)}</span>
      <span>${Number(process.memory_mb).toFixed(1)} MB</span>
    </div>
  `).join("");
}

function updateHealth(health) {
  const dot = document.querySelector(".live-dot");
  setText("healthLabel", health.label);
  dot.style.background = health.state === "critical" ? "#fb7185" : health.state === "warning" ? "#facc15" : "#22c55e";
}

function renderMetrics(data) {
  setText("cpuValue", formatPercent(data.cpu.percent));
  setText("memoryValue", formatPercent(data.memory.percent));
  setText("diskValue", formatPercent(data.disk.percent));
  setText("networkValue", formatKbps(data.network.received_kbps + data.network.sent_kbps));

  setMeter("cpuMeter", data.cpu.percent);
  setMeter("memoryMeter", data.memory.percent);
  setMeter("diskMeter", data.disk.percent);

  setText("memoryDetail", `${data.memory.used_gb} of ${data.memory.total_gb} GB used`);
  setText("diskDetail", `${data.disk.used_gb} of ${data.disk.total_gb} GB used`);
  setText("networkDetail", `${data.network.received_mb} MB down / ${data.network.sent_mb} MB up`);
  setText("networkDown", formatKbps(data.network.received_kbps));
  setText("networkUp", formatKbps(data.network.sent_kbps));

  setText("hostname", data.system.hostname);
  setText("osName", data.system.os);
  setText("coreCount", `${data.cpu.physical_cores || "?"} physical / ${data.cpu.logical_cores} logical`);
  setText("systemUptime", data.system.system_uptime);
  setText("appUptime", data.system.app_uptime);
  setText("updatedAt", new Date(data.timestamp).toLocaleTimeString());

  updateHealth(data.health);
  renderCores(data.cpu.cores);
  renderProcesses(data.processes);

  history.push({ cpu: data.cpu.percent, memory: data.memory.percent, disk: data.disk.percent });
  if (history.length > maxSamples) history.shift();
  drawChart();
}

async function fetchMetrics() {
  try {
    const response = await fetch("/api/metrics", { cache: "no-store" });
    if (!response.ok) throw new Error(`Metrics request failed: ${response.status}`);
    const data = await response.json();
    renderMetrics(data);
  } catch (error) {
    setText("healthLabel", "Offline");
    console.error(error);
  }
}

window.addEventListener("resize", drawChart);
fetchMetrics();
setInterval(fetchMetrics, 2000);
