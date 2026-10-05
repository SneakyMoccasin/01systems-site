"use strict";

let results;
let outcome = "ready";
let week = 14;
const comparison = document.querySelector("#comparison");
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const pos = value => 100 * value / 26;
const gridLabels = {not_ordered:"Ej beställd",pending:"Besked inväntas",ready:"Färdig",rejected:"Avslag",waiting_no_further_review:"Uteblivet besked"};

function gapText(gap) {
  return gap.unresolved_at_horizon
    ? `minst ${gap.weeks} veckor till horisonten vecka 26`
    : `${gap.weeks} veckor`;
}

function missingText(entry) {
  return entry.missing.map(item => {
    if (item.field !== "grid") return item.label;
    const suffix = {pending:"besked inväntas",rejected:"avslag",waiting_no_further_review:"uteblivet besked, ingen ny prövning inom horisonten",not_ordered:"ej beställd"}[item.actual];
    return item.label + (suffix ? ` (${suffix})` : "");
  }).join(", ");
}

function bar(start, end, type) {
  if (start === null || end <= start) return "";
  return `<span class="bar ${type}" style="left:${pos(start)}%;width:${pos(end - start)}%"></span>`;
}

function lane(label, start, type, caption, gapStart = null) {
  return `<div class="lane"><span class="lane-label">${label}</span><div class="track" aria-label="${escapeText(label + ': ' + caption)}">
    ${gapStart === null ? "" : bar(gapStart, start === null ? 26 : Math.max(gapStart, start), "gap")}
    ${bar(start, 26, type)}${type === "park" && start !== null ? `<span class="point" style="left:${pos(start)}%"></span>` : ""}
    <span class="cursor" style="left:${pos(week)}%"></span><span class="track-caption">${caption}</span></div></div>`;
}

function budgetChart(record) {
  const y = balance => 32 - (balance / 30 * 28);
  let points = `0,${y(record.weeks[0].state.budget)}`;
  for (let i = 1; i <= 26; i++) {
    points += ` ${i * 10},${y(record.weeks[i - 1].state.budget)} ${i * 10},${y(record.weeks[i].state.budget)}`;
  }
  return `<div class="lane"><span class="lane-label">Budget<br><small>0–30 Mkr</small></span><div class="track">
    <svg class="chart" viewBox="0 0 260 36" preserveAspectRatio="none" role="img" aria-label="Kvarvarande budget vid veckoslut, ${record.weeks[week].state.budget} Mkr vecka ${week}. Samma skala i båda förloppen.">
      <polyline points="${points}" fill="none" stroke="#183b55" stroke-width="1.8" vector-effect="non-scaling-stroke"/>
      <circle cx="${week * 10}" cy="${y(record.weeks[week].state.budget)}" r="2.6" fill="#183b55"/>
    </svg><span class="cursor" style="left:${pos(week)}%"></span></div></div>`;
}

function gapBox(label, gap) {
  return `<div class="gap-item ${gap.weeks === 0 ? "zero" : ""}"><span class="gap-label">${label}</span><strong class="${gap.unresolved_at_horizon ? "unresolved" : ""}">${gapText(gap)}</strong></div>`;
}

function statusLine(label, value, type = "pending") {
  return `<div class="status-line"><span>${label}</span><span class="value ${type}">${value}</span></div>`;
}

function dependencies(record) {
  const m = record.metrics;
  const milestone = key => m.milestones[key] === null ? "Ej klart inom vecka 26" : `Vecka ${m.milestones[key]}`;
  const labels = [["buses_delivered","Elbussar levererade"], ["depot_ready","Depå tillgänglig"],
    ["charger_installed","Laddutrustning installerad"], ["grid_ready","Elanslutning färdig"], ["drivers_ready","Chaufförer tillgängliga"]];
  const resolution = m.t7_requirements_week === null
    ? `Elprövningen vecka ${record.grid_review_week} ${outcome === "rejected" ? "ger avslag" : "saknar färdigt besked"}. Därför kan trafikökningen inte godkännas inom horisonten.`
    : `Elanslutningen blir färdig vecka ${m.milestones.grid_ready}. Alla fem förutsättningar är då klara och trafikökningen godkänns vecka ${m.t7_execution_week}.`;
  return `<section class="dependencies" aria-label="Bussatsningens beroenden och färdigveckor">
    <h3>Fem förutsättningar för trafikgodkännandet</h3>
    <dl class="milestones">${labels.map(([key,label]) => `<div><dt>${label}</dt><dd data-milestone="${key}">${milestone(key)}</dd></div>`).join("")}</dl>
    <p class="dependency-chain">Laddbeställningen kräver depåavtal. Installationen kräver både tillgänglig depå och levererad laddutrustning.</p>
    <p class="dependency-dates">Depåavtal vecka ${record.decision_weeks.T3} · laddutrustning beställs vecka ${record.decision_weeks.T4} och levereras vecka ${m.milestones.charger_delivered}.</p>
    <p class="dependency-explanation">Depån blir tillgänglig vecka ${m.milestones.depot_ready}. Laddinstallationen beställs vecka ${record.decision_weeks.T5} och blir färdig vecka ${m.milestones.charger_installed}. ${resolution}</p>
  </section>`;
}

function activities(entries) {
  if (!entries.length) return '<li class="none">Inga nya beslut eller färdigställanden denna vecka.</li>';
  return entries.map(entry => {
    const label = escapeText(entry.label);
    if (entry.kind === "rejected_attempt") {
      return `<li class="blocked"><strong>Blockerat: ${label}</strong><p>Saknas: ${escapeText(missingText(entry))}.</p><p>Ingen kostnad eller annan effekt.</p></li>`;
    }
    if (entry.kind === "script_skip") return `<li>${label}: redan genomfört. Inget nytt försök.</li>`;
    return `<li>${entry.kind === "decision" ? "Beslut: " : ""}${label}.</li>`;
  }).join("");
}

function armView(arm) {
  const record = results.cases[`${arm}_${outcome}`];
  const m = record.metrics;
  const snapshot = record.weeks[week];
  const s = snapshot.state;
  const ready = snapshot.t7_requirements_met;
  const prerequisites = [
    ["Elbussar levererade",s.buses_delivered], ["Depå tillgänglig",s.depot_ready],
    ["Laddning installerad",s.charger_installed], ["Elanslutning färdig",s.grid === "ready"],
    ["Chaufförer tillgängliga",s.drivers_ready],
  ];
  const readyCount = prerequisites.filter(([, value]) => value).length;
  const previousBlocks = record.weeks.slice(0, week).flatMap(point => point.entries
    .filter(entry => entry.kind === "rejected_attempt").map(entry => ({...entry, week:point.week})));
  const lastBlock = previousBlocks.at(-1);
  const parkingReady = m.at_parking;
  const parkingBus = parkingReady.traffic_authorized ? "Trafikökningen är godkänd." : "Trafikökningen är inte godkänd.";
  const parkingCycle = parkingReady.cycle_open ? "Cykelstråket är öppnat." : "Cykelstråket är inte öppnat.";
  const parkingConditions = ["buses_delivered","depot_ready","charger_installed","grid_ready","drivers_ready"]
    .filter(field => parkingReady[field]).length;
  return `<article class="arm" id="arm-${arm}" aria-labelledby="heading-${arm}">
    <header class="arm-header"><div class="arm-title"><span class="letter" aria-hidden="true">${arm}</span><div><h2 id="heading-${arm}">Förlopp ${arm}</h2><p class="arm-subtitle">Parkering bort vecka ${m.parking_week}</p></div></div><span class="week-tag">0–26 veckor</span></header>
    <div class="timeline" aria-label="Hela förlopp ${arm}, vecka 0 till 26">
      <div class="axis" aria-hidden="true">${[0,4,8,12,16,20,26].map(value => `<span style="left:${pos(value)}%">${value}</span>`).join("")}</div>
      ${lane("100 p-platser borta",m.parking_week,"park",`Från v. ${m.parking_week}`)}
      ${lane("Elbussar levererade",m.milestones.buses_delivered,"delivered",`Levererade v. ${m.milestones.buses_delivered}`)}
      ${lane("Bussens förutsättningar",m.t7_requirements_week,"ready",m.t7_requirements_week === null ? "Ej klara vid v. 26" : `Klara v. ${m.t7_requirements_week}`)}
      ${lane("Trafikökning godkänd",m.t7_execution_week,"bus",m.t7_execution_week === null ? "Ej godkänd vid v. 26" : `Godkänd v. ${m.t7_execution_week}`,m.parking_week)}
      ${lane("Cykelstråk öppnat",m.cycle_open_week,"cycle",`Öppnat v. ${m.cycle_open_week}`,m.parking_week)}
      ${budgetChart(record)}
      <div class="legend"><span><i class="swatch gap"></i>Glapp efter borttagning</span><span><i class="swatch cursor"></i>Vald vecka ${week}</span></div>
    </div>
    ${dependencies(record)}
    <section class="gaps" aria-label="Glapp för hela förloppet"><span class="section-label">Efter parkeringsborttagningen · hela förloppet</span><div class="gap-grid">
      ${gapBox("Utan godkänd trafikökning",m.traffic_gap)}${gapBox("Utan öppnat cykelstråk",m.cycle_gap)}
    </div></section>
    <section class="snapshot" aria-label="Status vecka ${week}">
      <div class="snapshot-heading"><h3>Läget vecka ${week}</h3><div class="budget"><strong data-budget>${s.budget} Mkr</strong><span>kvar av 30</span></div></div>
      <div class="statuses">
        ${statusLine("Parkering",s.parking_removed === 100 ? "100 platser borttagna" : "100 platser kvar")}
        ${statusLine("Bussens förutsättningar",ready ? "Alla fem klara" : `${readyCount} av 5 klara`,ready ? "positive" : "pending")}
        ${statusLine("Trafikökning",s.traffic_authorized ? "Godkänd" : "Inte godkänd",s.traffic_authorized ? "positive" : "pending")}
        ${statusLine("Cykelstråk",s.cycle_open ? "Öppnat" : s.cycle_ready ? "Färdigt, inte öppnat" : "Inte färdigt",s.cycle_open ? "positive" : "pending")}
        ${statusLine("Elanslutning",gridLabels[s.grid],s.grid === "ready" ? "positive" : ["rejected","waiting_no_further_review"].includes(s.grid) ? "negative" : "pending")}
      </div>
      <ul class="readiness" aria-label="Bussens fem förutsättningar">${prerequisites.map(([label,value]) => `<li class="${value ? "positive" : "pending"}"><span class="status-symbol" aria-hidden="true">${value ? "✓" : "–"}</span><span>${label}<span class="sr-only">: ${value ? "klart" : "saknas"}</span></span></li>`).join("")}</ul>
      <p class="extra-state">Signalprioritering: ${s.signal_ready ? "färdig" : "inte färdig"}. Cykelparkering: ${s.cycle_parking_ready ? "tillgänglig" : "inte tillgänglig"}.</p>
      <section class="activity" aria-label="Händelser vecka ${week}"><h3>Händelser och beslut vecka ${week}</h3><ul>${activities(snapshot.entries)}</ul></section>
      ${lastBlock ? `<details class="latest-block"><summary>Tidigare blockering · vecka ${lastBlock.week}</summary><p>${escapeText(lastBlock.label)} blockerades. Saknades: ${escapeText(missingText(lastBlock))}.</p></details>` : ""}
    </section>
    <details class="parking-readout"><summary>Vid parkeringsborttagningen · vecka ${m.parking_week}</summary>
      <p>${parkingConditions} av 5 bussförutsättningar klara. ${parkingBus} ${parkingCycle}</p>
      <p>Signalprioritering: ${parkingReady.signal_ready ? "färdig" : "inte färdig"}. Cykelparkering: ${parkingReady.cycle_parking_ready ? "tillgänglig" : "inte tillgänglig"}. Kvarvarande budget: ${m.parking_snapshot.state.budget} Mkr.</p>
      ${m.parking_sensitive_fields.length ? '<p class="order-note">Cykelstråket blir färdigt samma vecka. Precis vid borttagningen varierar färdigmarkören med eventordningen; vid veckans beslutstidpunkt är stråket färdigt i alla ordningar. Det är ännu inte öppnat.</p>' : ''}
    </details>
  </article>`;
}

function render() {
  if (!results) return;
  const selectLabel = document.querySelector("#week-label");
  selectLabel.textContent = `Vecka ${week}`;
  document.querySelector("#week").setAttribute("aria-valuetext",`Vecka ${week}, efter veckans händelser och beslut`);
  document.querySelector("#outcome-note").textContent = {
    ready:"Elanslutningen färdigställs tolv veckor efter beställning: vecka 20 i A och vecka 12 i B.",
    rejected:"Avslag tolv veckor efter beställning: vecka 20 i A och vecka 12 i B. Ingen ny prövning inom horisonten.",
    absent:"Färdigt besked uteblir tolv veckor efter beställning: vecka 20 i A och vecka 12 i B. Vänteläget kvarstår utan ny prövning inom horisonten.",
  }[outcome];
  comparison.innerHTML = armView("A") + armView("B");
  const comparisonResult = results.comparisons[outcome];
  const a = results.cases[`A_${outcome}`].metrics;
  const b = results.cases[`B_${outcome}`].metrics;
  document.querySelector("#equivalence").innerHTML = `<span><strong>Vid vecka 26: ${comparisonResult.final_equivalent ? "likvärdiga tillstånd" : "olika tillstånd"}.</strong> Olika historik och olika glapp på vägen.</span><span>Slutbudget A: <strong>${a.final_budget} Mkr</strong> · B: <strong>${b.final_budget} Mkr</strong></span>`;
}

document.querySelectorAll('input[name="outcome"]').forEach(input => input.addEventListener("change", event => {
  outcome = event.target.value;
  render();
}));
document.querySelector("#week").addEventListener("input", event => {
  week = Number(event.target.value);
  render();
});

async function start() {
  const state = document.querySelector("#load-state");
  try {
    const response = await fetch("/api/results", {cache:"no-store"});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Resultaten kunde inte läsas.");
    if (data.schema !== 1 || data.evidence?.status !== "PASS") throw new Error("Kontrollerade resultat saknas.");
    results = data;
    state.hidden = true;
    document.querySelector("#evidence").textContent = `${data.evidence.paths} kontrollerade huvudhistoriker. Lästa filer har verifierade kontrollsummor. Lokal läsning från ${data.evidence.source}; referensordningen visas.`;
    render();
  } catch (error) {
    state.className = "error";
    state.setAttribute("role","alert");
    state.textContent = `Demon kan inte visa resultaten: ${error.message} Starta den lokala servern enligt körinstruktionerna. Inga ersättningsvärden visas.`;
    document.querySelectorAll("input").forEach(input => {input.disabled = true;});
  }
}

start();
