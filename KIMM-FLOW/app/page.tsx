"use client";

import { useState } from "react";

const setupItems = ["General", "Models", "Materials", "Cell Zone Conditions", "Boundary Conditions", "Reference Values"];
const solutionItems = ["Numerical Conditions", "Monitors", "Initialization", "Run Conditions", "Run"];
const tabs = ["Console", "Mesh", "Residuals", "Monitor"];

function ToolIcon({ kind }: { kind: number }) {
  if (kind === 0) return <span className="brand-bars"><i /><i /><i /></span>;
  if (kind === 1) return <span className="crosshair" />;
  if (kind === 7) return <span className="refresh">↻</span>;
  return <span className={`tool-glyph glyph-${kind}`}><i /></span>;
}

export default function Home() {
  const [activeItem, setActiveItem] = useState("General");
  const [activeTab, setActiveTab] = useState("Mesh");
  const [time, setTime] = useState("Steady");
  const [feature, setFeature] = useState("Feature Edges");

  return (
    <main className="app-shell">
      <header className="titlebar">
        <div className="app-mark" aria-hidden="true" />
        <span>KIMM-Flow</span>
        <div className="window-controls" aria-hidden="true"><span>—</span><span>□</span><span>×</span></div>
      </header>

      <nav className="menubar" aria-label="Application menu">
        {['File', 'Mesh', 'View', 'Parallel', 'Settings', 'Help'].map((item) => <button key={item}>{item}</button>)}
      </nav>

      <div className="toolbar" aria-label="Mesh tools">
        <span className="grip">⋮</span>
        {[0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map((kind, index) => (
          <button className="tool-button" key={`${kind}-${index}`} aria-label={`Tool ${index + 1}`}><ToolIcon kind={kind} /></button>
        ))}
        <span className="tool-separator" />
        <button className="tool-button" aria-label="Refresh"><ToolIcon kind={7} /></button>
        <span className="tool-separator" />
        <label className="sr-only" htmlFor="feature-select">Mesh feature</label>
        <select id="feature-select" value={feature} onChange={(e) => setFeature(e.target.value)}>
          <option>Feature Edges</option><option>Surface</option><option>Volume</option>
        </select>
      </div>

      <section className="workspace">
        <aside className="sidebar">
          <Section title="Setup" items={setupItems} active={activeItem} onSelect={setActiveItem} />
          <Section title="Solution" items={solutionItems} active={activeItem} onSelect={setActiveItem} />
        </aside>

        <section className="settings-panel">
          <h1>{activeItem}</h1>
          {activeItem === "General" ? (
            <div className="general-form">
              <Fieldset title="Time">
                <Radio value="Steady" current={time} setCurrent={setTime} />
                <Radio value="Transient" current={time} setCurrent={setTime} />
              </Fieldset>
              <Fieldset title="Gravity">
                <AxisInput axis="X" /><AxisInput axis="Y" /><AxisInput axis="Z" />
              </Fieldset>
              <label className="pressure-row"><span>Operating Pressure Pa</span><input defaultValue="101325" /></label>
            </div>
          ) : <div className="empty-state">{activeItem} settings</div>}
        </section>

        <section className="viewport-area">
          <div className="tabs" role="tablist">
            {tabs.map((tab) => <button role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)} key={tab}>{tab}</button>)}
          </div>
          <div className="viewport" aria-label={`${activeTab} workspace`}>
            {activeTab !== "Mesh" && <div className="viewport-label">{activeTab}</div>}
          </div>
        </section>
      </section>
    </main>
  );
}

function Section({ title, items, active, onSelect }: { title: string; items: string[]; active: string; onSelect: (item: string) => void }) {
  return <div className="nav-section"><div className="nav-heading"><span>⌄</span>{title}</div><div className="nav-items">{items.map((item) => <button className={active === item ? "selected" : ""} onClick={() => onSelect(item)} key={item}>{item}</button>)}</div></div>;
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend>{title}</legend><div className="fieldset-body">{children}</div></fieldset>;
}

function Radio({ value, current, setCurrent }: { value: string; current: string; setCurrent: (value: string) => void }) {
  return <label className="radio-row"><input type="radio" checked={current === value} onChange={() => setCurrent(value)} /><span>{value}</span></label>;
}

function AxisInput({ axis }: { axis: string }) {
  return <label className="axis-row"><span>{axis} (m/s²)</span><input defaultValue="0" /></label>;
}
