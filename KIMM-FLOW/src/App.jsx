import { useEffect, useRef, useState } from "react";
import ThreeViewport from "./components/ThreeViewport";
import { MonitorChart, ResidualChart } from "./components/Charts";

const setupItems = ["General", "Models", "Materials", "Cell Zone Conditions", "Boundary Conditions", "Reference Values"];
const solutionItems = ["Numerical Conditions", "Monitors", "Initialization", "Run Conditions", "Run"];
const tabs = ["Console", "Mesh", "Residuals", "Monitor"];
const displayModes = ["Feature Edges", "Points", "Surface", "Surface With Edges", "Wireframe"];
const requiredPolyMeshFiles = ["boundary", "faces", "neighbour", "owner", "points"];
const boundaries = [
  { name: "in-1", type: "Velocity Inlet" },
  { name: "in-2", type: "Velocity Inlet" },
  { name: "out", type: "Pressure Outlet" },
  { name: "wall", type: "Wall" },
];
const toolbarIcons = [
  ["ParaView.png", "ParaView"], ["Axis.png", "Axis"], ["Measure.png", "Measure"],
  ["perspective.png", "Perspective"], ["show.png", "Show"], ["PlusX.png", "Plus X"],
  ["minusX.png", "Minus X"], ["PlusY.png", "Plus Y"], ["minusY.png", "Minus Y"],
  ["PlusZ.png", "Plus Z"], ["minusZ.png", "Minus Z"], ["Rotate Right.png", "Rotate right"],
];

export default function App() {
  const [activeItem, setActiveItem] = useState("General");
  const [activeTab, setActiveTab] = useState("Mesh");
  const [time, setTime] = useState("Steady");
  const [displayMode, setDisplayMode] = useState("Feature Edges");
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [meshStatus, setMeshStatus] = useState(null);
  const [meshInfo, setMeshInfo] = useState(null);
  const [selectedBoundary, setSelectedBoundary] = useState(null);
  const [boundaryDialog, setBoundaryDialog] = useState(null);
  const [boundarySettings, setBoundarySettings] = useState({
    "in-1": { velocity: "1", intensity: "1", ratio: "10" },
    "in-2": { velocity: "1", intensity: "1", ratio: "10" },
    out: { pressure: "0", backflow: false, intensity: "1", ratio: "10" },
    wall: { motion: "Stationary Wall", atmospheric: false, shear: "No Slip", roughnessHeight: "0", roughnessConstant: "0.5" },
  });
  const [numericalSettings, setNumericalSettings] = useState({
    scheme: "SIMPLE",
    relaxation: { Pressure: "0.3", Momentum: "0.7", Turbulence: "0.7", Density: "0.9" },
    convergence: { Pressure: "0.001", Momentum: "0.001", Energy: "0.001", Turbulence: "0.001" },
  });
  const [monitors, setMonitors] = useState([]);
  const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
  const [addMonitorOpen, setAddMonitorOpen] = useState(false);
  const [initializationSettings, setInitializationSettings] = useState({
    scale: "1", intensity: "1", ratio: "10",
  });
  const [initializationDialog, setInitializationDialog] = useState(null);
  const [runState, setRunState] = useState("idle");
  const [runDialog, setRunDialog] = useState(null);
  const [runStarted, setRunStarted] = useState("-");
  const [runProgress, setRunProgress] = useState(0);
  const [residualStarted, setResidualStarted] = useState(false);
  const directoryInputRef = useRef(null);

  useEffect(() => {
    if (runState !== "generating") return undefined;
    const timer = window.setTimeout(() => {
      setRunStarted(formatRunTime(new Date()));
      setRunState("running");
      setRunDialog("started");
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [runState]);

  useEffect(() => {
    if (!meshStatus) return undefined;
    const timer = window.setTimeout(() => setMeshStatus(null), 2000);
    return () => window.clearTimeout(timer);
  }, [meshStatus]);

  useEffect(() => {
    if (runState !== "running" || !residualStarted) return undefined;
    const duration = 7600;
    const startedAt = performance.now() - runProgress * duration;
    let frameId;
    const animate = (now) => {
      const next = Math.min((now - startedAt) / duration, 1);
      setRunProgress(next);
      if (next < 1) frameId = requestAnimationFrame(animate);
      else {
        setRunState("terminated");
        setRunDialog("terminated");
      }
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [residualStarted, runState]);

  const selectNavigation = (item) => {
    setActiveItem(item);
    if (["Boundary Conditions", "Numerical Conditions", "Monitors", "Initialization", "Run"].includes(item)) setActiveTab("Mesh");
  };

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab === "Residuals" && runState === "running") setResidualStarted(true);
  };

  const startCalculation = () => {
    setRunProgress(0);
    setResidualStarted(false);
    setRunState("generating");
    setRunDialog("generating");
  };

  const handleOpenFOAM = async () => {
    setFileMenuOpen(false);
    setMeshStatus({ type: "loading", message: "Waiting for a polyMesh folder..." });
    if (window.showDirectoryPicker) {
      try {
        const selectedHandle = await window.showDirectoryPicker({ id: "kimm-flow-polymesh", mode: "read", startIn: "desktop" });
        finishMeshLoad(await inspectDirectoryHandle(selectedHandle));
      } catch (error) {
        if (error?.name === "AbortError") setMeshStatus(null);
        else setMeshStatus({ type: "error", message: error.message || "Unable to open this folder." });
      }
      return;
    }
    setMeshStatus(null);
    directoryInputRef.current?.click();
  };

  const handleDirectoryInput = async (event) => {
    try { finishMeshLoad(await inspectFileList(Array.from(event.target.files || []))); }
    catch (error) { setMeshStatus({ type: "error", message: error.message || "Unable to read this folder." }); }
    finally { event.target.value = ""; }
  };

  const finishMeshLoad = (result) => {
    setMeshInfo(result);
    setMeshStatus({ type: "success", message: `${result.folderName} loaded successfully.` });
    setDisplayMode("Feature Edges");
    setActiveTab("Mesh");
  };

  return <main className="app-shell">
    <header className="titlebar">
      <div className="app-mark" aria-hidden="true" /><span>KIMM-Flow</span>
      <div className="window-controls" aria-hidden="true"><span>—</span><span>□</span><span>×</span></div>
    </header>
    <MenuBar fileMenuOpen={fileMenuOpen} setFileMenuOpen={setFileMenuOpen} onOpenFOAM={handleOpenFOAM} />
    <Toolbar displayMode={displayMode} setDisplayMode={setDisplayMode} />
    <input ref={directoryInputRef} className="sr-only" type="file" multiple webkitdirectory="" directory="" onChange={handleDirectoryInput} aria-label="Select polyMesh directory" />

    <section className="workspace">
      <aside className="sidebar">
        <NavSection title="Setup" items={setupItems} active={activeItem} onSelect={selectNavigation} />
        <NavSection title="Solution" items={solutionItems} active={activeItem} onSelect={selectNavigation} />
      </aside>

      <section className={`settings-panel panel-${slug(activeItem)}`}>
        <h1>{activeItem === "Run" ? "Process Information" : activeItem}</h1>
        <SettingsContent
          activeItem={activeItem}
          time={time}
          setTime={setTime}
          selectedBoundary={selectedBoundary}
          setSelectedBoundary={setSelectedBoundary}
          setBoundaryDialog={setBoundaryDialog}
          monitors={monitors}
          setMonitorDialogOpen={setMonitorDialogOpen}
          addMonitorOpen={addMonitorOpen}
          setAddMonitorOpen={setAddMonitorOpen}
          numericalSettings={numericalSettings}
          setNumericalSettings={setNumericalSettings}
          initializationSettings={initializationSettings}
          setInitializationSettings={setInitializationSettings}
          initialize={() => setInitializationDialog("confirm")}
          runState={runState}
          runStarted={runStarted}
          startCalculation={startCalculation}
        />
      </section>

      <section className="viewport-area">
        <div className="tabs" role="tablist">
          {tabs.map(tab => <button role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => selectTab(tab)} key={tab}>{tab}</button>)}
        </div>
        <div className={`viewport workspace-${slug(activeTab)}`} aria-label={`${activeTab} workspace`}>
          {activeTab === "Console" && <div className="viewport-label">Console</div>}
          {activeTab === "Mesh" && meshInfo && <ThreeViewport displayMode={displayMode} selectedBoundary={selectedBoundary} />}
          {activeTab === "Mesh" && !meshInfo && <div className="mesh-empty-view">Load a polyMesh directory to display the model.</div>}
          {activeTab === "Residuals" && <ResidualChart progress={runProgress} />}
          {activeTab === "Monitor" && ["running", "terminated"].includes(runState) && <MonitorChart monitorName={monitors[0]?.name || "point-mon-1"} />}
          {meshStatus && <StatusToast status={meshStatus} dismiss={() => setMeshStatus(null)} />}
        </div>
      </section>
    </section>

    {boundaryDialog && <BoundaryModal
      boundary={boundaryDialog}
      values={boundarySettings[boundaryDialog.name]}
      close={() => setBoundaryDialog(null)}
      save={(values) => { setBoundarySettings(current => ({ ...current, [boundaryDialog.name]: values })); setBoundaryDialog(null); }}
    />}
    {monitorDialogOpen && <PointMonitorModal
      close={() => setMonitorDialogOpen(false)}
      save={(monitor) => { setMonitors(items => [...items, monitor]); setMonitorDialogOpen(false); }}
      index={monitors.length + 1}
    />}
    {initializationDialog === "confirm" && <ConfirmDialog
      title="Initialization"
      message="All saved data will be deleted. OK?"
      confirmLabel="Yes"
      cancelLabel="No"
      onConfirm={() => setInitializationDialog("completed")}
      onCancel={() => setInitializationDialog(null)}
    />}
    {initializationDialog === "completed" && <MessageDialog title="Case Initialization" message="Initialization Completed" close={() => setInitializationDialog(null)} />}
    {runDialog && <CalculationDialog
      phase={runDialog}
      close={() => setRunDialog(null)}
      cancel={() => { setRunState("idle"); setRunDialog(null); }}
    />}
  </main>;
}

function MenuBar({ fileMenuOpen, setFileMenuOpen, onOpenFOAM }) {
  return <nav className="menubar" aria-label="Application menu">
    <div className="menu-root" onMouseEnter={() => setFileMenuOpen(true)} onMouseLeave={() => setFileMenuOpen(false)}>
      <button className={fileMenuOpen ? "menu-trigger active" : "menu-trigger"} aria-haspopup="menu" aria-expanded={fileMenuOpen} onClick={() => setFileMenuOpen(open => !open)}>File</button>
      {fileMenuOpen && <FileMenu onOpenFOAM={onOpenFOAM} />}
    </div>
    {["Mesh", "View", "Parallel", "Settings", "Help"].map(item => <button className="menu-trigger" key={item}>{item}</button>)}
  </nav>;
}

function Toolbar({ displayMode, setDisplayMode }) {
  return <div className="toolbar" aria-label="Mesh tools">
    <span className="grip" aria-hidden="true">⋮</span>
    {toolbarIcons.map(([file, label]) => <button className="tool-button" key={file} aria-label={label} title={label}><img src={`/icons/${encodeURIComponent(file)}`} alt="" draggable="false" /></button>)}
    <span className="tool-separator" />
    <label className="sr-only" htmlFor="display-mode">Display mode</label>
    <select id="display-mode" value={displayMode} onChange={event => setDisplayMode(event.target.value)}>
      {displayModes.map(mode => <option key={mode}>{mode}</option>)}
    </select>
  </div>;
}

function SettingsContent(props) {
  const { activeItem } = props;
  if (activeItem === "General") return <GeneralPanel time={props.time} setTime={props.setTime} />;
  if (activeItem === "Boundary Conditions") return <BoundaryPanel selected={props.selectedBoundary} setSelected={props.setSelectedBoundary} openDialog={props.setBoundaryDialog} />;
  if (activeItem === "Numerical Conditions") return <NumericalConditionsPanel settings={props.numericalSettings} setSettings={props.setNumericalSettings} />;
  if (activeItem === "Monitors") return <MonitorsPanel monitors={props.monitors} openPointDialog={() => props.setMonitorDialogOpen(true)} addOpen={props.addMonitorOpen} setAddOpen={props.setAddMonitorOpen} />;
  if (activeItem === "Initialization") return <InitializationPanel settings={props.initializationSettings} setSettings={props.setInitializationSettings} initialize={props.initialize} />;
  if (activeItem === "Run") return <RunPanel state={props.runState} started={props.runStarted} startCalculation={props.startCalculation} />;
  return <div className="empty-state">{activeItem} settings</div>;
}

function GeneralPanel({ time, setTime }) {
  return <div className="general-form">
    <FormGroup title="Time"><Radio value="Steady" current={time} setCurrent={setTime} /><Radio value="Transient" current={time} setCurrent={setTime} /></FormGroup>
    <FormGroup title="Gravity"><AxisInput axis="X" /><AxisInput axis="Y" /><AxisInput axis="Z" /></FormGroup>
    <label className="pressure-row"><span>Operating Pressure Pa</span><input defaultValue="101325" /></label>
  </div>;
}

function BoundaryPanel({ selected, setSelected, openDialog }) {
  const [filter, setFilter] = useState("");
  const visible = boundaries.filter(item => item.name.includes(filter.trim().toLowerCase()));
  return <div className="boundary-panel">
    <input className="filter-input" placeholder="filter string is here" value={filter} onChange={event => setFilter(event.target.value)} />
    <div className="region-box">
      <div className="region-heading"><span className="chevron expanded" />region0</div>
      {visible.map(item => <button
        className={selected === item.name ? "boundary-row selected" : "boundary-row"}
        onClick={() => setSelected(item.name)}
        onDoubleClick={() => { setSelected(item.name); openDialog(item); }}
        key={item.name}
      >
        <span className="eye-icon" aria-hidden="true" /><span className="boundary-swatch" /><span><strong>{item.name}</strong><small>{item.type}</small></span>
      </button>)}
    </div>
  </div>;
}

function NumericalConditionsPanel({ settings, setSettings }) {
  const schemes = [
    ["Time", "First Order Implicit", true], ["Pressure", "Linear", false], ["Momentum", "Second Order Upwind", false],
    ["Energy", "Second Order Upwind", true], ["Turbulence", "First Order Upwind", false], ["Volume Fraction", "Second Order Upwind", true],
    ["Scalar", "Second Order Upwind", true], ["Species", "Second Order Upwind", true],
  ];
  const relaxation = [["Pressure", "0.3"], ["Momentum", "0.7"], ["Energy", "1.0"], ["Turbulence", "0.7"], ["Density", "0.9"], ["Volume Fraction", "0.7"], ["Scalar", "0.7"], ["Species", "1.0"]];
  const convergence = [["Pressure", "0.001", "0.05"], ["Density", "0.001", "0.05"], ["Momentum", "0.001", "0.05"], ["Energy", "0.001", "0.05"], ["Turbulence", "0.001", "0.05"], ["Volume Fraction", "0.001", "0.05"], ["Scalar", "0.001", "0.05"], ["Species", "0.001", "0.05"]];
  const updateGroup = (group, key) => (event) => setSettings(current => ({ ...current, [group]: { ...current[group], [key]: event.target.value } }));
  return <div className="numerical-scroll">
    <label className="form-row coupling-row"><span>Pressure-Velocity Coupling Scheme</span><select value={settings.scheme} onChange={event => setSettings(current => ({ ...current, scheme: event.target.value }))}><option>SIMPLE</option><option>SIMPLEC</option></select></label>
    <PanelGroup title="Discretization Schemes">{schemes.map(([name, value, disabled]) => <label className="form-row" key={name}><span>{name}</span><select disabled={disabled} defaultValue={value}><option>{value}</option>{!disabled && <option>First Order Upwind</option>}</select></label>)}</PanelGroup>
    <PanelGroup title="Under-Relaxation Factors (0 &lt; R ≤ 1)"><GridHeader />{relaxation.map(([name, value]) => <NumericGridRow key={name} name={name} absolute={settings.relaxation[name] ?? value} relative="1" absoluteDisabled={!['Pressure', 'Momentum', 'Turbulence', 'Density'].includes(name)} relativeDisabled onAbsoluteChange={updateGroup("relaxation", name)} />)}<label className="check-row"><input type="checkbox" /> Improve Stability</label><label className="form-row disabled-row"><span>Limiting Factor</span><input defaultValue="0.5" disabled /></label></PanelGroup>
    <PanelGroup title=""><label className="form-row"><span>Max Iterations per Time Step</span><input defaultValue="20" /></label><label className="form-row"><span>Number of Correctors</span><input defaultValue="4" /></label><label className="form-row"><span>Number of non-orthogonal Correctors (0~10)</span><input defaultValue="0" /></label></PanelGroup>
    <PanelGroup title="Multiphase" muted><label className="form-row"><span>Max Iterations per Time Step</span><input defaultValue="2" disabled /></label><label className="form-row"><span>Number of Correctors</span><input defaultValue="1" disabled /></label><div className="radio-inline"><span>MULES Variant</span><label><input type="radio" disabled /> Explicit</label><label><input type="radio" defaultChecked disabled /> Semi-implicit</label></div><label className="form-row"><span>Phase Interface Compression Factor</span><input defaultValue="1" disabled /></label><label className="form-row"><span>Number of MULES iterations over the limiter</span><input defaultValue="3" disabled /></label></PanelGroup>
    <PanelGroup title="Convergence Criteria (range of values: 0~1)"><GridHeader labels={["Absolute", "Relative"]} />{convergence.map(([name, absolute, relative]) => <NumericGridRow key={name} name={name} absolute={settings.convergence[name] ?? absolute} relative={relative} absoluteDisabled={!['Pressure', 'Momentum', 'Turbulence'].includes(name)} relativeDisabled onAbsoluteChange={updateGroup("convergence", name)} />)}</PanelGroup>
    <button className="advanced-button">Advanced</button>
  </div>;
}

function MonitorsPanel({ monitors, openPointDialog, addOpen, setAddOpen }) {
  return <div className="monitors-panel">
    <div className="monitor-list">{monitors.map(monitor => <div className="monitor-card" key={monitor.name}><span className="monitor-dot" /><span><strong>{monitor.name}</strong><small>{monitor.field} on Point ({monitor.x}, {monitor.y}, {monitor.z})</small></span></div>)}</div>
    <div className="monitor-actions">
      <div className="add-menu-wrap"><button className="action-button" onClick={() => setAddOpen(open => !open)}>Add <span className="small-arrow" /></button>{addOpen && <div className="monitor-add-menu"><button>Forces</button><button onClick={() => { setAddOpen(false); openPointDialog(); }}>Points</button><button>Surfaces</button><button>Volumes</button></div>}</div>
      <button className="action-button" disabled>Edit</button><button className="action-button" disabled>Delete</button>
    </div>
  </div>;
}

function InitializationPanel({ settings, setSettings, initialize }) {
  const update = (key) => (event) => setSettings(current => ({ ...current, [key]: event.target.value }));
  return <div className="initialization-panel">
    <div className="initialization-scroll">
      <PanelGroup title="Initial Values">
        <label className="form-row"><span>Compute from</span><select defaultValue=""><option value="" /></select></label>
        <PanelGroup title="Velocity">
          <label className="form-row"><span>X-Velocity (m/s)</span><input defaultValue="0" /></label>
          <label className="form-row"><span>Y-Velocity (m/s)</span><input defaultValue="0" /></label>
          <label className="form-row"><span>Z-Velocity (m/s)</span><input defaultValue="0" /></label>
        </PanelGroup>
        <label className="form-row"><span>Pressure (Pa)</span><input defaultValue="0" /></label>
        <label className="form-row disabled-row"><span>Temperature (K)</span><input defaultValue="300" disabled /></label>
        <PanelGroup title="Turbulence">
          <label className="form-row"><span>Scale of Velocity (m/s)</span><input value={settings.scale} onChange={update("scale")} /></label>
          <label className="form-row"><span>Turbulent Intensity (%)</span><input value={settings.intensity} onChange={update("intensity")} /></label>
          <label className="form-row"><span>Turbulent Viscosity Ratio</span><input value={settings.ratio} onChange={update("ratio")} /></label>
        </PanelGroup>
      </PanelGroup>
      <PanelGroup title="Advanced">
        <PanelGroup title="Sections"><div className="sections-empty" /><div className="section-actions"><button>Create</button><button>Delete</button><button>Edit</button></div></PanelGroup>
      </PanelGroup>
      <div className="region-tab">region0</div>
    </div>
    <div className="initialization-footer"><button onClick={initialize}>Initialize</button></div>
  </div>;
}

function RunPanel({ state, started, startCalculation }) {
  const running = state === "running";
  return <div className="run-panel">
    <div className="process-summary">
      <span>ID :</span><strong>{running ? "10280" : "-"}</strong>
      <span>Started :</span><strong>{running ? started : "-"}</strong>
      <span>Status :</span><strong>{running ? "Running" : "Not Running"}</strong>
    </div>
    <div className="process-actions">
      {!running && <button className="process-button" onClick={startCalculation} disabled={state === "generating"}>Start Calculation</button>}
      {running && <button className="process-button">Cancel Calculation<small>Calculation stops as soon as possible</small></button>}
      <button className="process-button" disabled={!running}>Save and Stop Calculation<small>Calculation stops after finishing current iteration</small></button>
      <button className="process-button" disabled={!running}>Update Configuration<small>Applied to the Calculation on the fly</small></button>
    </div>
    <details className="user-parameters" open>
      <summary>User Parameters</summary>
      <button className="edit-parameters" disabled>Edit</button>
      <div className="parameter-table"><strong>Name(count)</strong><strong>Default Value</strong></div>
    </details>
    <button className="batch-button" disabled>Switch to Batch Running Mode</button>
  </div>;
}

function BoundaryModal({ boundary, values, close, save }) {
  if (boundary.type === "Velocity Inlet") return <VelocityInletModal values={values} close={close} save={save} />;
  if (boundary.type === "Pressure Outlet") return <PressureOutletModal values={values} close={close} save={save} />;
  return <WallModal values={values} close={close} save={save} />;
}

function VelocityInletModal({ values, close, save }) {
  const [draft, setDraft] = useState(values);
  const update = (key) => (event) => setDraft(current => ({ ...current, [key]: event.target.value }));
  return <Modal title="Velocity Inlet Boundary Condition" close={close}><PanelGroup title="Velocity"><label className="modal-row"><span>Velocity Specification Method</span><select defaultValue="Magnitude, Normal to Boundary"><option>Magnitude, Normal to Boundary</option></select></label><label className="modal-row"><span>Profile Type</span><select defaultValue="Constant"><option>Constant</option></select></label><label className="modal-row"><span>Velocity Magnitude (m/s)</span><input value={draft.velocity} onChange={update("velocity")} /></label></PanelGroup><PanelGroup title="Turbulence"><label className="modal-row"><span>Specification method</span><select defaultValue="Intensity and Viscosity Ratio"><option>Intensity and Viscosity Ratio</option></select></label><label className="modal-row"><span>Turbulent Intensity (%)</span><input value={draft.intensity} onChange={update("intensity")} /></label><label className="modal-row"><span>Turbulent Viscosity Ratio</span><input value={draft.ratio} onChange={update("ratio")} /></label></PanelGroup><ModalActions close={close} save={() => save(draft)} /></Modal>;
}

function PressureOutletModal({ values, close, save }) {
  const [draft, setDraft] = useState(values);
  const update = (key) => (event) => setDraft(current => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  return <Modal title="Pressure Outlet Boundary Condition" close={close}><PanelGroup title="Pressure"><label className="modal-row"><span>Pressure (Pa)</span><input value={draft.pressure} onChange={update("pressure")} /></label></PanelGroup><label className="check-row"><input type="checkbox" checked={draft.backflow} onChange={update("backflow")} /> Specify Backflow Properties</label><PanelGroup title="Turbulence" muted={!draft.backflow}><label className="modal-row"><span>Specification method</span><select disabled={!draft.backflow}><option>Intensity and Viscosity Ratio</option></select></label><label className="modal-row"><span>Turbulent Intensity (%)</span><input value={draft.intensity} onChange={update("intensity")} disabled={!draft.backflow} /></label><label className="modal-row"><span>Turbulent Viscosity Ratio</span><input value={draft.ratio} onChange={update("ratio")} disabled={!draft.backflow} /></label></PanelGroup><ModalActions close={close} save={() => save(draft)} /></Modal>;
}

function WallModal({ values, close, save }) {
  const [draft, setDraft] = useState(values);
  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  return <Modal title="Wall Boundary Condition" close={close} wide><PanelGroup title="Momentum"><PanelGroup title="Wall Motion"><label className="radio-row"><input type="radio" checked={draft.motion === "Stationary Wall"} onChange={() => update("motion", "Stationary Wall")} /> Stationary Wall</label><label className="check-row nested"><input type="checkbox" checked={draft.atmospheric} onChange={event => update("atmospheric", event.target.checked)} /> Atmospheric Wall</label><label className="radio-row"><input type="radio" checked={draft.motion === "Moving Wall"} onChange={() => update("motion", "Moving Wall")} /> Moving Wall</label><select className="full-select" disabled={draft.motion !== "Moving Wall"}><option>Translational Motion</option><option>Rotational Motion</option><option>Mesh Motion</option></select></PanelGroup><div className="wall-columns"><PanelGroup title="Shear Condition"><Radio value="No Slip" current={draft.shear} setCurrent={(value) => update("shear", value)} /><Radio value="Slip" current={draft.shear} setCurrent={(value) => update("shear", value)} /></PanelGroup><PanelGroup title="Wall Roughness"><label className="modal-row"><span>Roughness Height, Kₛ (m)</span><input value={draft.roughnessHeight} onChange={event => update("roughnessHeight", event.target.value)} /></label><label className="modal-row"><span>Roughness Constant, Cₛ</span><input value={draft.roughnessConstant} onChange={event => update("roughnessConstant", event.target.value)} /></label></PanelGroup></div></PanelGroup><ModalActions close={close} save={() => save(draft)} /></Modal>;
}

function PointMonitorModal({ close, save, index }) {
  const [form, setForm] = useState({ name: `point-mon-${index}`, interval: "1", field: "Pressure", x: "0", y: "0", z: "0" });
  const update = (key) => (event) => setForm(value => ({ ...value, [key]: event.target.value }));
  return <Modal title="Point Monitor" close={close}><label className="modal-row"><span>Name</span><input value={form.name} onChange={update("name")} /></label><PanelGroup title="Point Monitor"><label className="modal-row"><span>Write Interval</span><input value={form.interval} onChange={update("interval")} /></label><label className="modal-row"><span>Field</span><select value={form.field} onChange={update("field")}><option>Pressure</option><option>Velocity</option></select></label><label className="modal-row"><span>Component</span><select disabled><option>Magnitude</option></select></label><PanelGroup title="Coordinate"><label className="modal-row compact"><span>X (m)</span><input value={form.x} onChange={update("x")} /></label><label className="modal-row compact"><span>Y (m)</span><input value={form.y} onChange={update("y")} /></label><label className="modal-row compact"><span>Z (m)</span><input value={form.z} onChange={update("z")} /></label></PanelGroup><label className="modal-row"><span>Snap onto Boundary</span><span className="inline-control"><input value="None" disabled /><button className="select-button">Select</button></span></label></PanelGroup><div className="modal-actions"><button onClick={() => save(form)}>OK</button><button onClick={close}>Cancel</button></div></Modal>;
}

function ConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return <SystemDialog title={title} close={onCancel}>
    <div className="system-message"><span className="system-icon question">?</span><span>{message}</span></div>
    <div className="system-actions"><button className="primary" onClick={onConfirm}>{confirmLabel}</button><button onClick={onCancel}>{cancelLabel}</button></div>
  </SystemDialog>;
}

function MessageDialog({ title, message, close }) {
  return <SystemDialog title={title} close={close}>
    <div className="system-message plain"><span>{message}</span></div>
    <div className="system-actions"><button className="primary" onClick={close}>Close</button></div>
  </SystemDialog>;
}

function CalculationDialog({ phase, close, cancel }) {
  if (phase === "generating") return <SystemDialog title="Calculation Run." close={cancel}>
    <div className="calculation-copy">Generating Files...</div>
    <div className="generation-track"><span /></div>
    <div className="system-actions"><button onClick={cancel}>Cancel</button></div>
  </SystemDialog>;
  if (phase === "started") return <SystemDialog title="Calculation Run." close={close}>
    <div className="calculation-copy tall">Calculation started</div>
    <div className="system-actions"><button className="primary" onClick={close}>Close</button></div>
  </SystemDialog>;
  return <SystemDialog title="Calculation Terminated" close={close}>
    <div className="system-message"><span className="system-icon info">i</span><span>Calculation is terminated.</span></div>
    <div className="system-actions"><button className="primary" onClick={close}>OK</button></div>
  </SystemDialog>;
}

function SystemDialog({ title, close, children }) {
  return <div className="modal-backdrop system-backdrop"><div className="system-dialog" role="dialog" aria-modal="true" aria-label={title}>
    <div className="dialog-title"><span className="dialog-mark" />{title}<button onClick={close} aria-label="Close dialog">×</button></div>
    <div className="system-body">{children}</div>
  </div></div>;
}

function Modal({ title, close, children, wide = false }) { return <div className="modal-backdrop" role="presentation"><div className={wide ? "dialog wide" : "dialog"} role="dialog" aria-modal="true" aria-label={title}><div className="dialog-title"><span className="dialog-mark" />{title}<button onClick={close} aria-label="Close dialog">×</button></div><div className="dialog-body">{children}</div></div></div>; }
function ModalActions({ close, save }) { return <div className="modal-actions"><button onClick={save || close}>OK</button><button onClick={close}>Cancel</button></div>; }

function FileMenu({ onOpenFOAM }) { return <div className="dropdown-menu file-menu" role="menu"><MenuEntry label="Save" shortcut="Ctrl+S" /><MenuEntry label="Save As" /><div className="menu-entry has-submenu" role="menuitem" tabIndex="0"><span>Load Mesh</span><span className="submenu-arrow" /><div className="dropdown-menu submenu" role="menu"><MenuEntry label="OpenFOAM" onClick={onOpenFOAM} /><MenuEntry label="Multiple polyMesh" /><MenuEntry label="Fluent (ASCII)" /><MenuEntry label="StarCCM+" /><MenuEntry label="Gmsh (ASCII)" /><MenuEntry label="I-deas Universal (ASCII)" /><MenuEntry label="PLOT3D GRID (ASCII)" /></div></div><MenuEntry label="Close Project" shortcut="Ctrl+E" /><div className="menu-separator" /><MenuEntry label="Exit" shortcut="Ctrl+Q" /></div>; }
function MenuEntry({ label, shortcut, onClick }) { return <button className="menu-entry" role="menuitem" onClick={onClick} type="button"><span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>; }
function NavSection({ title, items, active, onSelect }) { const [expanded, setExpanded] = useState(true); return <div className="nav-section"><button className="nav-heading" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}><span className={expanded ? "chevron expanded" : "chevron"} /><span>{title}</span></button>{expanded && <div className="nav-items">{items.map(item => <button className={active === item ? "selected" : ""} onClick={() => onSelect(item)} key={item}>{item}</button>)}</div>}</div>; }
function FormGroup({ title, children }) { return <fieldset><legend>{title}</legend><div className="fieldset-body">{children}</div></fieldset>; }
function PanelGroup({ title, children, muted = false }) { return <section className={muted ? "panel-group muted" : "panel-group"}>{title && <h2>{title}</h2>}{children}</section>; }
function Radio({ value, current, setCurrent }) { return <label className="radio-row"><input type="radio" checked={current === value} onChange={() => setCurrent(value)} /><span>{value}</span></label>; }
function AxisInput({ axis }) { return <label className="axis-row"><span>{axis} (m/s²)</span><input defaultValue="0" /></label>; }
function GridHeader({ labels = ["", "Final"] }) { return <div className="numeric-grid header"><span /><span>{labels[0]}</span><span>{labels[1]}</span></div>; }
function NumericGridRow({ name, absolute, relative, absoluteDisabled = false, relativeDisabled = true, onAbsoluteChange }) { return <div className="numeric-grid"><span>{name}</span><input value={absolute} onChange={onAbsoluteChange} disabled={absoluteDisabled} /><input defaultValue={relative} disabled={relativeDisabled} /></div>; }
function StatusToast({ status, dismiss }) { return <div className={`mesh-status ${status.type}`} role="status"><span className="status-dot" /><span>{status.message}</span><button onClick={dismiss}>×</button></div>; }
function slug(value) { return String(value).toLowerCase().replaceAll(" ", "-"); }

async function inspectDirectoryHandle(selectedHandle) { let folderHandle = selectedHandle; if (selectedHandle.name.toLowerCase() !== "polymesh") { try { folderHandle = await selectedHandle.getDirectoryHandle("polyMesh"); } catch { throw new Error("Select the polyMesh folder, or a project folder containing polyMesh."); } } const files = new Map(); for await (const [name, handle] of folderHandle.entries()) if (handle.kind === "file") files.set(name, await handle.getFile()); return buildMeshInfo(folderHandle.name, files); }
async function inspectFileList(fileList) { if (!fileList.length) throw new Error("No folder was selected."); const files = new Map(); let folderName = "polyMesh"; for (const file of fileList) { const parts = (file.webkitRelativePath || file.name).split("/"); const index = parts.findIndex(part => part.toLowerCase() === "polymesh"); if (index >= 0 && index === parts.length - 2) { folderName = parts[index]; files.set(parts.at(-1), file); } } return buildMeshInfo(folderName, files); }
async function buildMeshInfo(folderName, files) { const missing = requiredPolyMeshFiles.filter(name => !files.has(name)); if (missing.length) throw new Error(`This is not a valid polyMesh folder. Missing: ${missing.join(", ")}`); const boundaryText = await files.get("boundary").text(); const pointsHeader = await files.get("points").slice(0, 4096).text(); return { folderName, fileCount: files.size, pointsCount: extractFoamCount(pointsHeader), boundaries: extractBoundaryNames(boundaryText) }; }
function extractFoamCount(text) { const match = text.match(/\/\/\s*\*[^\n]*\/\/\s*(\d+)/s); return match ? Number(match[1]) : null; }
function extractBoundaryNames(text) { const start = text.search(/\n\s*\d+\s*\n\s*\(/); return start < 0 ? [] : [...text.slice(start).matchAll(/^\s{4}([\w-]+)\s*\r?\n\s*\{/gm)].map(match => match[1]); }
function formatRunTime(date) { return date.toLocaleString("sv-SE", { hour12: false }).replace("T", " "); }
