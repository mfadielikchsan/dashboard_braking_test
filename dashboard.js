import { createClient } from "https://esm.sh/@supabase/supabase-js";

/* ================= SUPABASE ================= */
const supabase = createClient(
  "https://eysofbxczoaesihxpelb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5c29mYnhjem9hZXNpaHhwZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjM4MjIsImV4cCI6MjA3ODYzOTgyMn0.X4Nec16yXjcrQtpUzAlkwJDgQKHKz8lqU4WF7kjp2KU"
);

/* ================= DEFAULT FILTER ================= */
document.getElementById("dateFilter").value =
  new Date().toISOString().slice(0, 10);

let currentParams = getParams();

/* ================= LOAD BUTTON ================= */
document.getElementById("btnLoad").onclick = () => {
  currentParams = getParams();
  loadData();
};

/* ================= REALTIME ================= */
supabase
  .channel("braking-realtime")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "braking" },
    () => loadData()
  )
  .subscribe();

/* ================= HELPERS ================= */
function avg(values) {
  const valid = values.filter(v => typeof v === "number" && !isNaN(v));
  if (!valid.length) return null;
  return +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2);
}

function getParams() {
  return {
    date: document.getElementById("dateFilter").value,
    sesi: document.getElementById("sesiFilter").value
  };
}

/* ================= LOAD DATA ================= */
async function loadData() {
  const { date, sesi } = currentParams;

  const { data, error } = await supabase
    .from("braking")
    .select("*")
    .eq("sesi", sesi)
    .gte("created_at", `${date} 00:00:00`)
    .lte("created_at", `${date} 23:59:59`);

  if (error) {
    console.error(error);
    return;
  }

  renderTable(data);
  renderCharts(data);
}

/* ================= TABLE ================= */
function renderTable(rows) {
  const tb = document.getElementById("data-body");
  tb.innerHTML = "";

  const cell = v => (v === null || v === undefined ? "" : `${v} m`);

  rows.forEach(r => {
    tb.innerHTML += `
      <tr>
        <td class="${r.brand === "Dunlop" ? "dunlop" : "komp"}">${r.brand}</td>
        <td>${cell(r.t1)}</td>
        <td>${cell(r.t2)}</td>
        <td>${cell(r.t3)}</td>
        <td>${cell(r.t4)}</td>
        <td>${cell(r.t5)}</td>
      </tr>
    `;
  });
}

/* ================= CHARTS ================= */
function renderCharts(rows) {
  const d = rows.filter(r => r.brand === "Dunlop");
  const k = rows.filter(r => r.brand === "Kompetitor");

  const keys = ["t1", "t2", "t3", "t4", "t5"];

  const dAvg = keys.map(t => avg(d.map(r => r[t])));
  const kAvg = keys.map(t => avg(k.map(r => r[t])));

  const dTotal = avg(dAvg);
  const kTotal = avg(kAvg);

  /* ===== BAR PER T ===== */
  Highcharts.chart("chart-bar", {
    chart: { type: "bar" },
    title: { text: "" },
    credits: { enabled: false },

    xAxis: { categories: ["T1", "T2", "T3", "T4", "T5"] },

    yAxis: {
      min: 0,
      max: 8,
      title: { text: "Meter" },
      labels: { format: "{value} m" }
    },

    tooltip: { valueSuffix: " m" },

    plotOptions: {
      bar: {
        dataLabels: {
          enabled: true,
          formatter() {
            return this.y === null ? "" : `${this.y} m`;
          },
          style: { fontWeight: "600" }
        }
      }
    },

    series: [
      {
        name: "Dunlop",
        data: dAvg,
        color: "#e6b800",
        connectNulls: true
      },
      {
        name: "Kompetitor",
        data: kAvg,
        color: "#d40000",
        connectNulls: true
      }
    ]
  });

  /* ===== AVG TOTAL ===== */
  Highcharts.chart("chart-avg", {
    chart: { type: "bar" },
    title: { text: "" },
    credits: { enabled: false },

    xAxis: { categories: ["Dunlop", "Kompetitor"] },

    yAxis: {
      min: 0,
      max: 8,
      title: { text: "Meter" },
      labels: { format: "{value} m" }
    },

    tooltip: { valueSuffix: " m" },

    series: [
      {
        name: "Average",
        data: [
          { y: dTotal, color: "#e6b800" },
          { y: kTotal, color: "#d40000" }
        ],
        dataLabels: {
          enabled: true,
          formatter() {
            return this.y === null ? "" : `${this.y} m`;
          }
        }
      }
    ]
  });

  /* ===== TREND ===== */
  Highcharts.chart("chart-trend", {
    chart: { type: "line" },
    title: { text: "" },
    credits: { enabled: false },

    xAxis: { categories: ["T1", "T2", "T3", "T4", "T5"] },

    yAxis: {
      min: 0,
      max: 8,
      title: { text: "Meter" }
    },

    tooltip: { enabled: false },

    plotOptions: {
      line: {
        connectNulls: true,
        dataLabels: { enabled: false }
      }
    },

    series: [
      {
        name: "Dunlop",
        data: dAvg,
        color: "#e6b800"
      },
      {
        name: "Kompetitor",
        data: kAvg,
        color: "#d40000"
      },
      {
        name: "AVG Dunlop",
        data: Array(5).fill(dTotal),
        color: "#e6b800",
        dashStyle: "ShortDash",
        enableMouseTracking: false
      },
      {
        name: "AVG Kompetitor",
        data: Array(5).fill(kTotal),
        color: "#d40000",
        dashStyle: "ShortDash",
        enableMouseTracking: false
      }
    ]
  });
}

/* ================= INIT ================= */
loadData();

/* ================= ZOOM ================= */
let zoomLevel = 1;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.3;

const wrap = document.querySelector(".wrap");

function applyZoom() {
  wrap.style.transform = `scale(${zoomLevel})`;
  wrap.style.transformOrigin = "top center";

  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 150);
}

document.getElementById("zoom-in").onclick = () => {
  if (zoomLevel < MAX_ZOOM) {
    zoomLevel += ZOOM_STEP;
    applyZoom();
  }
};

document.getElementById("zoom-out").onclick = () => {
  if (zoomLevel > MIN_ZOOM) {
    zoomLevel -= ZOOM_STEP;
    applyZoom();
  }
};

document.getElementById("fullscreen").onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};
