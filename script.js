const metrics = {
  setTimeout(() => {
    msg.style.left = `${x2}px`;
    msg.style.top = `${y2}px`;
  }, 50);

  setTimeout(() => msg.remove(), 1200);

  metrics.total++;
  updateMetrics();
}

function requestResponse() {
  metrics.rr++;
  log("Client -> Server : Request data");
  createMessage(80, 170, 430, 60, "#3b82f6");

  setTimeout(() => {
    log("Server -> Client : Response data");
    createMessage(430, 60, 80, 170, "#ef4444");
  }, 1200);

  updateMetrics();
}

function publishSubscribe() {
  metrics.ps++;
  log("Publisher -> Broker : Publish event");
  createMessage(80, 170, 430, 260, "#22c55e");

  setTimeout(() => {
    log("Broker -> Subscriber A");
    createMessage(430, 260, 760, 60, "#facc15");

    log("Broker -> Subscriber B");
    createMessage(430, 260, 760, 260, "#facc15");
  }, 1200);

  updateMetrics();
}

function rpc() {
  metrics.rpc++;
  log("Client memanggil fungsi remote");
  createMessage(80, 170, 430, 60, "#a855f7");

  setTimeout(() => {
    log("Server mengeksekusi fungsi & kirim hasil");
    createMessage(430, 60, 80, 170, "#c084fc");
  }, 1200);

  updateMetrics();
}

function resetSim() {
  metrics.rr = 0;
  metrics.ps = 0;
  metrics.rpc = 0;
  metrics.total = 0;

  logBox.textContent = "";
  arena.innerHTML = "";

  updateMetrics();
}

updateMetrics();
