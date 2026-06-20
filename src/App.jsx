import { useState, useMemo } from "react";
import { jsPDF } from "jspdf";

const TRIP_TYPES = [
  { id: "flight", label: "Flying", icon: "✈️" },
  { id: "road", label: "Road trip", icon: "🚗" },
  { id: "international", label: "International", icon: "🌍" },
];

const DEFAULT_TODDLERS = 1;

function currency(n) {
  if (isNaN(n) || n === null) return "$0";
  return "$" + Math.round(n).toLocaleString();
}

function NumberField({ label, value, onChange, placeholder, prefix = "$", hint }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="input-wrap">
        {prefix && <span className="prefix">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={value === 0 ? "" : value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
        />
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [tripType, setTripType] = useState("flight");
  const [days, setDays] = useState("");
  const [toddlers, setToddlers] = useState("");
  const [adults, setAdults] = useState("");

  const [flights, setFlights] = useState(0);
  const [lodging, setLodging] = useState(0);
  const [carRental, setCarRental] = useState(0);
  const [gas, setGas] = useState(0);
  const [foodPerDay, setFoodPerDay] = useState(60);
  const [activities, setActivities] = useState(0);
  const [gear, setGear] = useState(0);

  const [checklist, setChecklist] = useState({});

  // Safe numeric versions for math — inputs can be blank while typing
  const daysNum = days === "" ? 0 : days;
  const toddlersNum = toddlers === "" ? 0 : toddlers;
  const adultsNum = adults === "" ? 0 : adults;

  const toddlerExtras = useMemo(() => {
    const diapers = toddlersNum * daysNum * 3; // $3/day estimate per toddler
    const stroller = tripType === "flight" ? 35 : 0;
    const buffer = (flights + lodging + carRental + gas + foodPerDay * daysNum + activities + gear) * 0.12;
    return { diapers, stroller, buffer };
  }, [toddlersNum, daysNum, tripType, flights, lodging, carRental, gas, foodPerDay, activities, gear]);

  const subtotal = flights + lodging + carRental + gas + foodPerDay * daysNum + activities + gear;
  const toddlerTotal = toddlerExtras.diapers + toddlerExtras.stroller;
  const meltdownBuffer = toddlerExtras.buffer;
  const grandTotal = subtotal + toddlerTotal + meltdownBuffer;
  const perDay = daysNum > 0 ? grandTotal / daysNum : 0;

  const categories = [
    { label: "Flights", value: flights, color: "#C9683D" },
    { label: "Lodging", value: lodging, color: "#8A9B8E" },
    { label: tripType === "road" ? "Car & gas" : "Car rental", value: carRental + gas, color: "#B8915C" },
    { label: "Food", value: foodPerDay * daysNum, color: "#D4A574" },
    { label: "Activities", value: activities, color: "#7A8B85" },
    { label: "Gear", value: gear, color: "#A67C5A" },
    { label: "Toddler extras", value: toddlerTotal, color: "#C9683D" },
    { label: "Meltdown buffer", value: meltdownBuffer, color: "#E8DFD3" },
  ].filter((c) => c.value > 0);

  const PACKING_BASE = [
    "Diapers (pack 2x what you think + destination has stores)",
    "Wipes — travel packs, one in every bag",
    "Change of clothes for toddler ×3 (blowouts happen)",
    "Change of clothes for YOU ×1 (blowouts happen to you too)",
    "Favorite comfort item (lovey, blanket, stuffed animal)",
    "Snacks — more than feels reasonable",
    "Portable white noise / sound machine",
    "Toddler-safe sunscreen",
    "Basic medicine kit (fever reducer, allergy meds)",
    "Travel-size first aid kit",
    "Tablet + headphones loaded with shows offline",
    "Stroller (umbrella style if flying)",
  ];
  const PACKING_BY_TYPE = {
    flight: [
      "Car seat or CARES harness for the plane",
      "Pre-check airline's kid-fare and lap-infant policy",
      "Ear plugs/headphones for takeoff pressure",
      "Stroller gate-check tag (get at counter)",
      "Snack pouches that pass TSA liquid rules",
    ],
    road: [
      "Window shades for car windows",
      "Car trash bags (you'll need more than one)",
      "Backseat mirror to see toddler from front seat",
      "Portable potty seat for rest stops",
      "Playlist or downloaded toddler music ready before you leave",
    ],
    international: [
      "Toddler's passport (check expiry — under 5yr passports expire fast)",
      "Travel insurance that covers pediatric care",
      "Local emergency numbers saved in phone",
      "Universal plug adapter for sound machine/monitor",
      "Printed copy of any prescriptions, in case of pharmacy visit",
    ],
  };

  const TIPS_BY_TYPE = {
    flight: [
      "Book flights around nap time if possible — a sleeping toddler on a plane is a gift.",
      "Gate-check the stroller instead of checking it at baggage — you'll want it walking through the airport.",
      "Board last if you can. Less time trapped in a seat with a toddler before takeoff.",
    ],
    road: [
      "Plan stops every 2 hours minimum, even if no one asks — toddlers need to move.",
      "Pack the car the night before. Mornings with a toddler are not for searching for shoes.",
      "Time the longest driving stretch around nap time, not around your ideal arrival time.",
    ],
    international: [
      "Keep your home routine's nap/bedtime windows for the first 2-3 days to ease jet lag.",
      "Research one pediatric clinic near where you're staying before you go, just in case.",
      "Pack one full backup outfit in your carry-on, not checked luggage.",
    ],
  };

  const allPackingItems = [...PACKING_BASE, ...(PACKING_BY_TYPE[tripType] || [])];
  const checkedCount = Object.values(checklist).filter(Boolean).length;

  function toggleCheck(item) {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  function downloadPlan() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 48;
    let y = 0;

    // Brand colors
    const forest = [45, 59, 54];
    const terracotta = [201, 104, 61];
    const sage = [138, 155, 142];
    const paper = [250, 246, 240];
    const lightLine = [232, 223, 211];
    const grayText = [92, 105, 98];

    // Header band
    doc.setFillColor(...forest);
    doc.rect(0, 0, pageWidth, 90, "F");
    doc.setTextColor(...paper);
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.text("Toddler Travel Co.", marginX, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("small travelers deserve planners too", marginX, 60);

    const tripLabel = TRIP_TYPES.find((t) => t.id === tripType)?.label || "";
    doc.setFontSize(9);
    doc.text(
      `${tripLabel} trip · ${daysNum} day${daysNum === 1 ? "" : "s"} · ${adultsNum || 0} adult${(adultsNum || 0) === 1 ? "" : "s"}, ${toddlersNum} toddler${toddlersNum === 1 ? "" : "s"}`,
      marginX,
      78
    );

    y = 130;

    // Total budget callout
    doc.setFillColor(...lightLine);
    doc.roundedRect(marginX, y, pageWidth - marginX * 2, 70, 8, 8, "F");
    doc.setTextColor(...grayText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL TRIP BUDGET", marginX + 18, y + 24);
    doc.setTextColor(...forest);
    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.text(currency(grandTotal), marginX + 18, y + 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...grayText);
    doc.text(`${currency(perDay)} / day`, pageWidth - marginX - 18, y + 40, { align: "right" });

    y += 100;

    // Budget breakdown section
    doc.setTextColor(...forest);
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.text("Budget breakdown", marginX, y);
    y += 12;
    doc.setDrawColor(...lightLine);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 20;

    categories.forEach((c) => {
      doc.setFillColor(...terracotta);
      doc.circle(marginX + 4, y - 4, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...forest);
      doc.text(c.label, marginX + 16, y);
      doc.setFont("helvetica", "bold");
      doc.text(currency(c.value), pageWidth - marginX, y, { align: "right" });
      y += 20;
    });

    y += 10;

    // Packing checklist section
    if (y > 650) { doc.addPage(); y = 50; }
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...forest);
    doc.text("Packing checklist", marginX, y);
    y += 12;
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 22;

    allPackingItems.forEach((item) => {
      if (y > 760) { doc.addPage(); y = 50; }
      const checked = !!checklist[item];
      doc.setDrawColor(...sage);
      doc.setLineWidth(1);
      doc.roundedRect(marginX, y - 9, 11, 11, 2, 2, checked ? "FD" : "D");
      if (checked) {
        doc.setFillColor(...sage);
        doc.roundedRect(marginX, y - 9, 11, 11, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("✓", marginX + 2.5, y - 0.5);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...forest);
      const lines = doc.splitTextToSize(item, pageWidth - marginX * 2 - 24);
      doc.text(lines, marginX + 20, y);
      y += 16 * lines.length + 4;
    });

    y += 10;

    // Tips section
    if (y > 650) { doc.addPage(); y = 50; }
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...forest);
    doc.text("Tips for your trip", marginX, y);
    y += 12;
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 22;

    (TIPS_BY_TYPE[tripType] || []).forEach((tip) => {
      if (y > 740) { doc.addPage(); y = 50; }
      doc.setFillColor(...terracotta);
      doc.rect(marginX, y - 12, 3, 30, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...forest);
      const lines = doc.splitTextToSize(tip, pageWidth - marginX * 2 - 16);
      doc.text(lines, marginX + 14, y);
      y += 16 * lines.length + 14;
    });

    // Notes page — blank lined page for the parent's own planning
    doc.addPage();
    let ny = 70;
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...forest);
    doc.text("Notes", marginX, ny);
    ny += 10;
    doc.setDrawColor(...terracotta);
    doc.setLineWidth(1.5);
    doc.line(marginX, ny, marginX + 40, ny);
    ny += 30;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...grayText);
    doc.text("Use this page for anything that didn't fit above — confirmation numbers,", marginX, ny);
    ny += 14;
    doc.text("things to remember, or a reminder to yourself for next time.", marginX, ny);
    ny += 36;

    doc.setDrawColor(...lightLine);
    doc.setLineWidth(0.75);
    while (ny < 760) {
      doc.line(marginX, ny, pageWidth - marginX, ny);
      ny += 28;
    }

    doc.save("toddler-trip-plan.pdf");
  }

  return (
    <div className="app">
      <style>{css}</style>

      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Toddler&nbsp;Travel&nbsp;Co. <span className="brand-sub">small travelers deserve planners too</span></span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="content">
        {step === 1 && (
          <section className="step fade-in">
            <div className="eyebrow">Step 1 of 4 — The basics</div>
            <h1>Let's plan your trip.</h1>
            <p className="lede">Three quick details, then we'll build your budget together.</p>

            <div className="trip-type-grid">
              {TRIP_TYPES.map((t) => (
                <button
                  key={t.id}
                  className={`trip-type-card ${tripType === t.id ? "selected" : ""}`}
                  onClick={() => setTripType(t.id)}
                >
                  <span className="trip-icon">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="field-row">
              <div className="field">
                <label>How many days?</label>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder="e.g. 5"
                  value={days}
                  onChange={(e) => setDays(e.target.value === "" ? "" : parseInt(e.target.value) || "")}
                />
              </div>
              <div className="field">
                <label>Adults traveling</label>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder="e.g. 2"
                  value={adults}
                  onChange={(e) => setAdults(e.target.value === "" ? "" : parseInt(e.target.value) || "")}
                />
              </div>
              <div className="field">
                <label>Toddlers traveling</label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="e.g. 1"
                  value={toddlers}
                  onChange={(e) => setToddlers(e.target.value === "" ? "" : parseInt(e.target.value) || "")}
                />
              </div>
            </div>

            <button className="btn-primary" onClick={() => setStep(2)}>Next: the budget →</button>
          </section>
        )}

        {step === 2 && (
          <section className="step fade-in">
            <div className="eyebrow">Step 2 of 4 — The budget</div>
            <h1>What do you already know?</h1>
            <p className="lede">Enter what you have. Leave the rest — we'll estimate it for you.</p>

            <div className="budget-bar-sticky">
              <div className="budget-bar-label">
                <span>Running total</span>
                <span className="budget-bar-amount">{currency(grandTotal)}</span>
              </div>
              <div className="budget-bar-track">
                {categories.map((c, i) => (
                  <div
                    key={i}
                    className="budget-bar-seg"
                    style={{ width: `${(c.value / Math.max(grandTotal, 1)) * 100}%`, background: c.color }}
                    title={`${c.label}: ${currency(c.value)}`}
                  />
                ))}
              </div>
            </div>

            {tripType === "flight" && (
              <NumberField label="Flights (total, all travelers)" value={flights} onChange={setFlights} placeholder="0" />
            )}
            <NumberField label="Lodging (total for the trip)" value={lodging} onChange={setLodging} placeholder="0" />
            {tripType === "road" ? (
              <>
                <NumberField label="Gas (estimated total)" value={gas} onChange={setGas} placeholder="0" />
                <NumberField label="Tolls / parking" value={carRental} onChange={setCarRental} placeholder="0" />
              </>
            ) : (
              <NumberField label="Car rental (if needed)" value={carRental} onChange={setCarRental} placeholder="0" />
            )}
            <NumberField
              label="Food budget per day"
              value={foodPerDay}
              onChange={setFoodPerDay}
              placeholder="60"
              hint="Most families with a toddler spend $45–80/day eating out. Cooking some meals lowers this fast."
            />
            <NumberField label="Activities & entrance fees" value={activities} onChange={setActivities} placeholder="0" />
            <NumberField
              label="Gear to buy or rent"
              value={gear}
              onChange={setGear}
              placeholder="0"
              hint="Travel crib, car seat rental, stroller rental, etc."
            />

            <div className="auto-line">
              <span>Diapers & toddler supplies (auto-estimated)</span>
              <strong>{currency(toddlerExtras.diapers)}</strong>
            </div>
            {tripType === "flight" && (
              <div className="auto-line">
                <span>Stroller gate-check / travel fees (auto-estimated)</span>
                <strong>{currency(toddlerExtras.stroller)}</strong>
              </div>
            )}
            <div className="auto-line">
              <span>Meltdown buffer — 12% (because something always comes up)</span>
              <strong>{currency(meltdownBuffer)}</strong>
            </div>

            <div className="btn-row">
              <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" onClick={() => setStep(3)}>Next: packing list →</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="step fade-in">
            <div className="eyebrow">Step 3 of 4 — Pack smart</div>
            <h1>Your packing checklist.</h1>
            <p className="lede">Built for a {TRIP_TYPES.find((t) => t.id === tripType)?.label.toLowerCase()} trip with a toddler. Tap to check off.</p>

            <div className="checklist-progress">{checkedCount} of {allPackingItems.length} packed</div>

            <ul className="checklist">
              {allPackingItems.map((item) => (
                <li
                  key={item}
                  className={`check-item ${checklist[item] ? "checked" : ""}`}
                  onClick={() => toggleCheck(item)}
                >
                  <span className="check-box">{checklist[item] ? "✓" : ""}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="btn-row">
              <button className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary" onClick={() => setStep(4)}>Next: your plan →</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="step fade-in">
            <div className="eyebrow">Step 4 of 4 — Your plan</div>
            <h1>Here's your trip, mapped out.</h1>

            <div className="summary-card">
              <div className="summary-total">
                <span className="summary-total-label">Total trip budget</span>
                <span className="summary-total-amount">{currency(grandTotal)}</span>
                <span className="summary-total-sub">{currency(perDay)} / day · {daysNum} days</span>
              </div>
              <div className="summary-bars">
                {categories.map((c, i) => (
                  <div key={i} className="summary-bar-row">
                    <span className="summary-bar-label">{c.label}</span>
                    <div className="summary-bar-track">
                      <div className="summary-bar-fill" style={{ width: `${(c.value / Math.max(grandTotal, 1)) * 100}%`, background: c.color }} />
                    </div>
                    <span className="summary-bar-value">{currency(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <h2 className="section-head">Tips for your trip</h2>
            <ul className="tips-list">
              {(TIPS_BY_TYPE[tripType] || []).map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>

            <button className="btn-primary btn-download" onClick={downloadPlan}>Download my full trip plan</button>
            <p className="download-reminder">Download your plan now — it won't be saved once you leave or start a new trip.</p>

            <div className="btn-row">
              <button className="btn-ghost" onClick={() => setStep(3)}>← Back to packing list</button>
              <button className="btn-ghost" onClick={() => setStep(1)}>Start a new trip</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

* { box-sizing: border-box; }

.app {
  font-family: 'Inter', sans-serif;
  background: #FAF6F0;
  color: #2D3B36;
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  background: #FAF6F0;
  border-bottom: 1px solid #E8DFD3;
  z-index: 10;
  padding: 16px 20px 12px;
}
.topbar-inner { max-width: 560px; margin: 0 auto; }
.brand {
  font-family: 'Fraunces', serif;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.brand-sub {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: #8A9B8E;
  margin-left: 6px;
}
.progress-track {
  height: 3px;
  background: #E8DFD3;
  border-radius: 2px;
  margin-top: 10px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #C9683D;
  transition: width 0.4s ease;
}

.content { max-width: 560px; margin: 0 auto; padding: 28px 20px 80px; }

.fade-in { animation: fadeIn 0.35s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

.eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #C9683D;
  margin-bottom: 8px;
}
h1 {
  font-family: 'Fraunces', serif;
  font-size: 30px;
  font-weight: 600;
  margin: 0 0 6px;
  letter-spacing: -0.01em;
}
.lede { color: #5C6962; font-size: 15px; margin: 0 0 24px; }
.section-head {
  font-family: 'Fraunces', serif;
  font-size: 20px;
  font-weight: 600;
  margin: 32px 0 12px;
}

.trip-type-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
.trip-type-card {
  background: white;
  border: 1.5px solid #E8DFD3;
  border-radius: 14px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.trip-type-card:hover { border-color: #C9683D; }
.trip-type-card.selected { border-color: #C9683D; background: #FFF3EC; }
.trip-icon { font-size: 24px; }

.field-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
.field { margin-bottom: 16px; }
.field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #2D3B36;
}
.field input[type=number] {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #E8DFD3;
  border-radius: 10px;
  font-size: 16px;
  font-family: 'JetBrains Mono', monospace;
  background: white;
  color: #2D3B36;
}
.field input:focus { outline: none; border-color: #C9683D; }
.field-hint { font-size: 12px; color: #8A9B8E; margin-top: 6px; line-height: 1.4; }

.input-wrap { position: relative; display: flex; align-items: center; }
.prefix {
  position: absolute;
  left: 14px;
  color: #8A9B8E;
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
}
.input-wrap input { padding-left: 28px !important; }

.budget-bar-sticky {
  background: white;
  border: 1.5px solid #E8DFD3;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 24px;
  position: sticky;
  top: 90px;
  z-index: 5;
}
.budget-bar-label { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.budget-bar-label span:first-child { font-size: 13px; font-weight: 600; color: #5C6962; }
.budget-bar-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 500;
  color: #2D3B36;
}
.budget-bar-track {
  height: 10px;
  background: #F0EBE2;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
}
.budget-bar-seg { height: 100%; transition: width 0.3s ease; }

.auto-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #F0EBE2;
  border-radius: 10px;
  margin-bottom: 10px;
  font-size: 13px;
}
.auto-line strong { font-family: 'JetBrains Mono', monospace; font-weight: 500; }

.checklist-progress {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #8A9B8E;
  margin-bottom: 16px;
}
.checklist { list-style: none; padding: 0; margin: 0 0 24px; }
.check-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  background: white;
  border: 1.5px solid #E8DFD3;
  border-radius: 10px;
  margin-bottom: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.check-item.checked { background: #F4F7F4; border-color: #8A9B8E; color: #8A9B8E; text-decoration: line-through; }
.check-box {
  width: 20px; height: 20px;
  border: 1.5px solid #C9C0AF;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
  color: white;
}
.check-item.checked .check-box { background: #8A9B8E; border-color: #8A9B8E; }

.tips-list { padding: 0; margin: 0 0 28px; list-style: none; }
.tips-list li {
  background: white;
  border: 1.5px solid #E8DFD3;
  border-left: 4px solid #C9683D;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.5;
}

.summary-card {
  background: white;
  border: 1.5px solid #E8DFD3;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 8px;
}
.summary-total { text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #E8DFD3; }
.summary-total-label { display: block; font-size: 13px; color: #8A9B8E; font-weight: 600; margin-bottom: 4px; }
.summary-total-amount {
  display: block;
  font-family: 'Fraunces', serif;
  font-size: 44px;
  font-weight: 600;
  color: #2D3B36;
}
.summary-total-sub { display: block; font-size: 13px; color: #8A9B8E; margin-top: 4px; }
.summary-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.summary-bar-label { font-size: 12px; width: 110px; flex-shrink: 0; color: #5C6962; font-weight: 500; }
.summary-bar-track { flex: 1; height: 8px; background: #F0EBE2; border-radius: 4px; overflow: hidden; }
.summary-bar-fill { height: 100%; border-radius: 4px; }
.summary-bar-value { font-family: 'JetBrains Mono', monospace; font-size: 12px; width: 56px; text-align: right; }

.btn-primary {
  width: 100%;
  background: #2D3B36;
  color: #FAF6F0;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
  font-family: 'Inter', sans-serif;
}
.btn-primary:hover { background: #C9683D; }
.btn-download { margin-bottom: 8px; }
.download-reminder {
  text-align: center;
  font-size: 12px;
  color: #8A9B8E;
  margin: 0 0 20px;
  line-height: 1.4;
}
.btn-ghost {
  background: transparent;
  color: #5C6962;
  border: none;
  padding: 16px 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex: 1;
}
.btn-row { display: flex; gap: 8px; margin-top: 8px; }
.btn-row .btn-ghost:first-child { text-align: left; }
.btn-row .btn-ghost:last-child { text-align: right; }

@media (max-width: 420px) {
  .field-row { grid-template-columns: 1fr; }
  h1 { font-size: 26px; }
  .summary-total-amount { font-size: 36px; }
}
`;
