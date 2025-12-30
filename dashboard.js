import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://eysofbxczoaesihxpelb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5c29mYnhjem9hZXNpaHhwZWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjM4MjIsImV4cCI6MjA3ODYzOTgyMn0.X4Nec16yXjcrQtpUzAlkwJDgQKHKz8lqU4WF7kjp2KU"
);

/* DEFAULT FILTER */
document.getElementById("dateFilter").value =
  new Date().toISOString().slice(0,10);

let currentParams = getParams();

/* LOAD BUTTON */
document.getElementById("btnLoad").onclick = () => {
  currentParams = getParams();
  loadData();
};

/* REALTIME */
supabase
  .channel("braking-realtime")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "braking" },
    () => loadData()
  )
  .subscribe();

/* HELPERS */
const avg = arr =>
  arr.length ? +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) : 0;

function getParams(){
  return {
    date: document.getElementById("dateFilter").value,
    sesi: document.getElementById("sesiFilter").value
  };
}

function arrow(curr, prev){
  if(prev === null) return "";
  if(curr > prev) return " ↑";
  if(curr < prev) return " ↓";
  return " →";
}

/* LOAD DATA */
async function loadData(){
  const { date, sesi } = currentParams;

  const { data, error } = await supabase
    .from("braking")
    .select("*")
    .eq("sesi", sesi)
    .gte("created_at", `${date} 00:00:00`)
    .lte("created_at", `${date} 23:59:59`);

  if(error){
    console.error(error);
    return;
  }

  renderTable(data);
  renderCharts(data);
}

/* TABLE */
function renderTable(rows){
  const tb = document.getElementById("data-body");
  tb.innerHTML = "";

  rows.forEach(r=>{
    tb.innerHTML += `
      <tr>
        <td class="${r.brand==='Dunlop'?'dunlop':'komp'}">${r.brand}</td>
        <td>${r.t1} m</td>
        <td>${r.t2} m</td>
        <td>${r.t3} m</td>
        <td>${r.t4} m</td>
        <td>${r.t5} m</td>
      </tr>`;
  });
}

/* CHARTS */
function renderCharts(rows){
  const d = rows.filter(r=>r.brand==="Dunlop");
  const k = rows.filter(r=>r.brand==="Kompetitor");

  const dAvg = ["t1","t2","t3","t4","t5"].map(t => avg(d.map(r=>r[t])));
  const kAvg = ["t1","t2","t3","t4","t5"].map(t => avg(k.map(r=>r[t])));

  const dTotal = avg(dAvg);
  const kTotal = avg(kAvg);

  /* BAR PER T */
  Highcharts.chart("chart-bar",{
    chart:{ type:"bar" },
    title:{ text:"" },
    credits:{ enabled:false },

    xAxis:{ categories:["T1","T2","T3","T4","T5"] },

    yAxis:{
      min:0,
      max:8,
      title:{ text:"Meter" },
      labels:{ format:"{value} m" }
    },

    tooltip:{ valueSuffix:" m" },

    plotOptions:{
      bar:{
        dataLabels:{
          enabled:true,
          format:"{y} m",
          style:{
            fontWeight:"600"
          }
        }
      }
    },

    series:[
      {
        name:"Dunlop",
        data:dAvg,
        color:"#e6b800"
      },
      {
        name:"Kompetitor",
        data:kAvg,
        color:"#d40000"
      }
    ]
  });


  /* AVG TOTAL */
  Highcharts.chart("chart-avg",{
    chart:{ type:"bar" },
    title:{ text:"" },
    credits:{ enabled:false },
    xAxis:{ categories:["Dunlop","Kompetitor"] },
    yAxis:{
      min:0,max:8,
      title:{ text:"Meter" },
      labels:{ format:"{value} m" }
    },
    tooltip:{ valueSuffix:" m" },
    series:[
      {
        name:"Average",
        data:[
          { y:dTotal, color:"#e6b800" },
          { y:kTotal, color:"#d40000" }
        ],
        dataLabels:{
          enabled:true,
          format:"{y} m"
        }
      }
    ]
  });

  /* TREND (NO VALUE LABEL) */
  Highcharts.chart("chart-trend",{
    chart:{ type:"line" },
    title:{ text:"" },
    credits:{ enabled:false },
    xAxis:{ categories:["T1","T2","T3","T4","T5"] },
    yAxis:{
      min:0,max:8,
      title:{ text:"Meter" }
    },
    plotOptions:{
      line:{
        dataLabels:{ enabled:false }
      }
    },
    tooltip:{ enabled:false },
    series:[
      {
        name:"Dunlop",
        data:dAvg,
        color:"#e6b800"
      },
      {
        name:"Kompetitor",
        data:kAvg,
        color:"#d40000"
      },
      {
        name:"AVG Dunlop",
        data:Array(5).fill(dTotal),
        color:"#e6b800",
        dashStyle:"ShortDash",
        enableMouseTracking:false
      },
      {
        name:"AVG Kompetitor",
        data:Array(5).fill(kTotal),
        color:"#d40000",
        dashStyle:"ShortDash",
        enableMouseTracking:false
      }
    ]
  });
}

loadData();
