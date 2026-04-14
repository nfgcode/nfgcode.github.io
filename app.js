const state = {
  activeModel: "requestResponse",
  settings: {
    latencyMs: 700,
    processingMs: 350,
    dropProbability: 0.05,
    subscriberCount: 3,
  },
  autoRun: false,
  autoTimer: null,
  globalSequence: 1,
  packets: [],
  rrRequests: new Map(),
  metrics: {
    requestResponse: newMetrics(),
    publishSubscribe: newMetrics(),
  },
  sequenceTracker: {
    requestResponse: { expected: 1 },
    publishSubscribe: {},
  },
};

const el = {
  modelSelect: document.getElementById("modelSelect"),
  latencyRange: document.getElementById("latencyRange"),
  processingRange: document.getElementById("processingRange"),
  dropRange: document.getElementById("dropRange"),
  subscriberRange: document.getElementById("subscriberRange"),
  latencyValue: document.getElementById("latencyValue"),
  processingValue: document.getElementById("processingValue"),
  dropValue: document.getElementById("dropValue"),
  subscriberValue: document.getElementById("subscriberValue"),
  sendBtn: document.getElementById("sendBtn"),
  burstBtn: document.getElementById("burstBtn"),
  autoBtn: document.getElementById("autoBtn"),
  resetBtn: document.getElementById("resetBtn"),
  clearLogBtn: document.getElementById("clearLogBtn"),
  simModeTag: document.getElementById("simModeTag"),
  networkSvg: document.getElementById("networkSvg"),
  rrMetrics: document.getElementById("rrMetrics"),
  psMetrics: document.getElementById("psMetrics"),
  logBox: document.getElementById("logBox"),
};

function newMetrics() {
  return {
    sent: 0,
    delivered: 0,
    dropped: 0,
    latencySamples: [],
    outOfOrder: 0,
    startedAt: null,
  };
}

function nowMs() {
  return performance.now();
}

function randomDelay(base) {
  const jitter = base * 0.35;
  return Math.max(20, base + (Math.random() * 2 - 1) * jitter);
}

function shouldDrop() {
  return Math.random() < state.settings.dropProbability;
}

function ensureStarted(model) {
  const m = state.metrics[model];
  if (!m.startedAt) {
    m.startedAt = nowMs();
  }
}

function format(n) {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function getNodes(model) {
  if (model === "requestResponse") {
    return {
      client: { x: 200, y: 210, label: "Client" },
      server: { x: 760, y: 210, label: "Server" },
    };
  }

  const nodes = {
    publisher: { x: 120, y: 210, label: "Publisher" },
    broker: { x: 450, y: 210, label: "Broker" },
  };

  const count = state.settings.subscriberCount;
  const startY = 85;
  const spacing = count > 1 ? 250 / (count - 1) : 0;

  for (let i = 0; i < count; i += 1) {
    nodes[`sub${i + 1}`] = {
      x: 800,
      y: startY + spacing * i,
      label: `Sub-${i + 1}`,
    };
  }

  return nodes;
}

function addLog(message, type = "info") {
  const line = document.createElement("div");
  line.className = `log-line${type === "drop" ? " drop" : ""}`;
  const t = (nowMs() / 1000).toFixed(2);
  line.textContent = `[${t}s] ${message}`;
  el.logBox.prepend(line);
}

function createPacket({ model, from, to, seq, kind, sentAt, onArrive }) {
  const nodes = getNodes(model);
  const fromNode = nodes[from];
  const toNode = nodes[to];
  if (!fromNode || !toNode) {
    return;
  }

  const travelTime = randomDelay(state.settings.latencyMs);
  const packet = {
    id: `${model}-${seq}-${Math.random().toString(16).slice(2, 8)}`,
    model,
    from,
    to,
    seq,
    kind,
    sentAt,
    startAt: nowMs(),
    arriveAt: nowMs() + travelTime,
    startX: fromNode.x,
    startY: fromNode.y,
    endX: toNode.x,
    endY: toNode.y,
    onArrive,
  };

  state.packets.push(packet);
}

function sendRequestResponse() {
  const seq = state.globalSequence;
  state.globalSequence += 1;
  ensureStarted("requestResponse");

  const m = state.metrics.requestResponse;
  m.sent += 1;

  const requestSentAt = nowMs();
  state.rrRequests.set(seq, requestSentAt);
  addLog(`RR: Client mengirim request #${seq}`);

  createPacket({
    model: "requestResponse",
    from: "client",
    to: "server",
    seq,
    kind: "request",
    sentAt: requestSentAt,
    onArrive: () => {
      if (shouldDrop()) {
        m.dropped += 1;
        state.rrRequests.delete(seq);
        addLog(`RR: Request #${seq} hilang di jaringan`, "drop");
        return;
      }

      addLog(`RR: Server menerima request #${seq}`);
      const processTime = randomDelay(state.settings.processingMs);
      setTimeout(() => {
        createPacket({
          model: "requestResponse",
          from: "server",
          to: "client",
          seq,
          kind: "response",
          sentAt: requestSentAt,
          onArrive: () => {
            if (shouldDrop()) {
              m.dropped += 1;
              state.rrRequests.delete(seq);
              addLog(`RR: Response #${seq} hilang di jaringan`, "drop");
              return;
            }

            const end = nowMs();
            m.delivered += 1;
            const latency = end - requestSentAt;
            m.latencySamples.push(latency);
            trackOrder("requestResponse", seq);
            state.rrRequests.delete(seq);
            addLog(`RR: Client menerima response #${seq} (latensi ${Math.round(latency)} ms)`);
          },
        });
      }, processTime);
    },
  });
}

function sendPublishSubscribe() {
  const seq = state.globalSequence;
  state.globalSequence += 1;
  ensureStarted("publishSubscribe");

  const m = state.metrics.publishSubscribe;
  m.sent += 1;

  const publishedAt = nowMs();
  addLog(`PS: Publisher mengirim event #${seq} ke broker`);

  createPacket({
    model: "publishSubscribe",
    from: "publisher",
    to: "broker",
    seq,
    kind: "publish",
    sentAt: publishedAt,
    onArrive: () => {
      if (shouldDrop()) {
        m.dropped += 1;
        addLog(`PS: Event #${seq} hilang sebelum sampai broker`, "drop");
        return;
      }

      addLog(`PS: Broker menerima event #${seq} dan melakukan fan-out`);
      const processTime = randomDelay(state.settings.processingMs);
      setTimeout(() => {
        for (let i = 1; i <= state.settings.subscriberCount; i += 1) {
          const target = `sub${i}`;
          createPacket({
            model: "publishSubscribe",
            from: "broker",
            to: target,
            seq,
            kind: "deliver",
            sentAt: publishedAt,
            onArrive: () => {
              if (shouldDrop()) {
                m.dropped += 1;
                addLog(`PS: Event #${seq} gagal ke Sub-${i}`, "drop");
                return;
              }

              const latency = nowMs() - publishedAt;
              m.delivered += 1;
              m.latencySamples.push(latency);
              trackOrder("publishSubscribe", seq, target);
              addLog(`PS: Sub-${i} menerima event #${seq} (latensi ${Math.round(latency)} ms)`);
            },
          });
        }
      }, processTime);
    },
  });
}

function trackOrder(model, seq, endpoint = "default") {
  const tracker = state.sequenceTracker[model];
  if (model === "requestResponse") {
    if (seq !== tracker.expected) {
      state.metrics[model].outOfOrder += 1;
    }
    tracker.expected = Math.max(tracker.expected, seq + 1);
    return;
  }

  if (!tracker[endpoint]) {
    tracker[endpoint] = 1;
  }

  if (seq !== tracker[endpoint]) {
    state.metrics[model].outOfOrder += 1;
  }
  tracker[endpoint] = Math.max(tracker[endpoint], seq + 1);
}

function dispatchOne() {
  if (state.activeModel === "requestResponse") {
    sendRequestResponse();
  } else {
    sendPublishSubscribe();
  }
}

function burstSend() {
  for (let i = 0; i < 10; i += 1) {
    setTimeout(dispatchOne, i * 120);
  }
}

function resetMetrics() {
  state.metrics.requestResponse = newMetrics();
  state.metrics.publishSubscribe = newMetrics();
  state.sequenceTracker.requestResponse = { expected: 1 };
  state.sequenceTracker.publishSubscribe = {};
  state.rrRequests.clear();
  addLog("Metrik direset");
}

function clearLogs() {
  el.logBox.innerHTML = "";
}

function setAutoRun(enabled) {
  state.autoRun = enabled;
  el.autoBtn.textContent = `Auto: ${enabled ? "ON" : "OFF"}`;

  if (!enabled && state.autoTimer) {
    clearInterval(state.autoTimer);
    state.autoTimer = null;
  }

  if (enabled && !state.autoTimer) {
    state.autoTimer = setInterval(() => {
      dispatchOne();
    }, 900);
  }
}

function updateUiValues() {
  el.latencyValue.textContent = state.settings.latencyMs;
  el.processingValue.textContent = state.settings.processingMs;
  el.dropValue.textContent = Math.round(state.settings.dropProbability * 100);
  el.subscriberValue.textContent = state.settings.subscriberCount;
  el.simModeTag.textContent =
    state.activeModel === "requestResponse"
      ? "Mode: Request-Response"
      : "Mode: Publish-Subscribe";
}

function metricLines(model) {
  const m = state.metrics[model];
  const avgLatency =
    m.latencySamples.length === 0
      ? 0
      : m.latencySamples.reduce((a, b) => a + b, 0) / m.latencySamples.length;

  const elapsed = m.startedAt ? (nowMs() - m.startedAt) / 1000 : 0;
  const throughput = elapsed > 0 ? m.delivered / elapsed : 0;

  return [
    `Sent: ${m.sent}`,
    `Delivered: ${m.delivered}`,
    `Dropped: ${m.dropped}`,
    `Avg latency: ${format(avgLatency)} ms`,
    `Throughput: ${format(throughput)} msg/s`,
    `Out-of-order: ${m.outOfOrder}`,
  ];
}

function renderMetrics() {
  el.rrMetrics.innerHTML = "";
  el.psMetrics.innerHTML = "";

  metricLines("requestResponse").forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    el.rrMetrics.appendChild(li);
  });

  metricLines("publishSubscribe").forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    el.psMetrics.appendChild(li);
  });
}

function renderNetwork() {
  const model = state.activeModel;
  const svg = el.networkSvg;
  svg.innerHTML = "";

  const nodes = getNodes(model);

  if (model === "requestResponse") {
    drawEdge(svg, nodes.client, nodes.server);
    drawEdge(svg, nodes.server, nodes.client);
  } else {
    drawEdge(svg, nodes.publisher, nodes.broker);
    for (let i = 1; i <= state.settings.subscriberCount; i += 1) {
      drawEdge(svg, nodes.broker, nodes[`sub${i}`]);
    }
  }

  Object.keys(nodes).forEach((key) => {
    drawNode(svg, nodes[key]);
  });

  const t = nowMs();
  state.packets = state.packets.filter((p) => p.model === model || t <= p.arriveAt + 50);

  for (const packet of state.packets) {
    if (packet.model !== model) {
      continue;
    }

    const total = packet.arriveAt - packet.startAt;
    const progress = Math.max(0, Math.min(1, (t - packet.startAt) / total));
    const x = packet.startX + (packet.endX - packet.startX) * progress;
    const y = packet.startY + (packet.endY - packet.startY) * progress;

    drawPacket(svg, x, y, packet.seq, packet.kind === "response");

    if (t >= packet.arriveAt) {
      packet.onArrive?.();
      packet.onArrive = null;
    }
  }

  renderMetrics();
  requestAnimationFrame(renderNetwork);
}

function drawNode(svg, node) {
  const circle = createSvg("circle", {
    cx: node.x,
    cy: node.y,
    r: 38,
    class: "node",
  });

  const label = createSvg("text", {
    x: node.x,
    y: node.y + 5,
    class: "node-label",
  });
  label.textContent = node.label;

  svg.appendChild(circle);
  svg.appendChild(label);
}

function drawEdge(svg, from, to) {
  const edge = createSvg("line", {
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    class: "edge",
  });
  svg.appendChild(edge);
}

function drawPacket(svg, x, y, seq, isReply) {
  const packet = createSvg("circle", {
    cx: x,
    cy: y,
    r: 11,
    class: `packet${isReply ? " reply" : ""}`,
  });

  const text = createSvg("text", {
    x,
    y: y + 3,
    class: "packet-label",
  });
  text.textContent = seq;

  svg.appendChild(packet);
  svg.appendChild(text);
}

function createSvg(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
  return node;
}

function bindEvents() {
  el.modelSelect.addEventListener("change", (e) => {
    state.activeModel = e.target.value;
    updateUiValues();
    addLog(`Beralih ke model ${state.activeModel}`);
  });

  el.latencyRange.addEventListener("input", (e) => {
    state.settings.latencyMs = Number(e.target.value);
    updateUiValues();
  });

  el.processingRange.addEventListener("input", (e) => {
    state.settings.processingMs = Number(e.target.value);
    updateUiValues();
  });

  el.dropRange.addEventListener("input", (e) => {
    state.settings.dropProbability = Number(e.target.value) / 100;
    updateUiValues();
  });

  el.subscriberRange.addEventListener("input", (e) => {
    state.settings.subscriberCount = Number(e.target.value);
    updateUiValues();
  });

  el.sendBtn.addEventListener("click", dispatchOne);
  el.burstBtn.addEventListener("click", burstSend);
  el.autoBtn.addEventListener("click", () => setAutoRun(!state.autoRun));
  el.resetBtn.addEventListener("click", resetMetrics);
  el.clearLogBtn.addEventListener("click", clearLogs);
}

function init() {
  bindEvents();
  updateUiValues();
  addLog("Simulasi siap digunakan");
  renderNetwork();
}

init();
