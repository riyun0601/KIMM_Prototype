const VIEWBOX = { width: 1000, height: 460 };
const PATH_CLOSE_DISTANCE = 14;
const POINT_MATCH_DISTANCE = 0.25;

const distanceBetween = (from, to) => Math.hypot(to.x - from.x, to.y - from.y);
const asPoints = (points) => points.map(({ x, y }) => `${x},${y}`).join(' ');
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function orthogonalPoint(from, candidate) {
  const deltaX = candidate.x - from.x;
  const deltaY = candidate.y - from.y;
  return Math.abs(deltaX) >= Math.abs(deltaY)
    ? { x: candidate.x, y: from.y }
    : { x: from.x, y: candidate.y };
}

function removeClosingDuplicate(points) {
  const vertices = points.filter((point, index) => (
    index === 0 || distanceBetween(point, points[index - 1]) > POINT_MATCH_DISTANCE
  ));

  if (vertices.length > 2 && distanceBetween(vertices[0], vertices.at(-1)) <= PATH_CLOSE_DISTANCE) {
    vertices.pop();
  }

  return vertices;
}

function closedOrthogonalPath(points) {
  const vertices = removeClosingDuplicate(points);
  const firstPoint = vertices[0];
  const lastPoint = vertices.at(-1);
  if (firstPoint.x === lastPoint.x || firstPoint.y === lastPoint.y) return vertices;
  return [...vertices, orthogonalPoint(lastPoint, firstPoint)];
}

export function createSketcherEditor({ onStatus = () => {} } = {}) {
  const state = {
    tool: null,
    polylines: [],
    polylineDraft: [],
    circles: [],
    circleDraft: null,
    pointer: null,
  };

  function pointFromEvent(event, canvas) {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / VIEWBOX.width, bounds.height / VIEWBOX.height);
    const offsetX = (bounds.width - VIEWBOX.width * scale) / 2;
    const offsetY = (bounds.height - VIEWBOX.height * scale) / 2;
    return {
      x: clamp((event.clientX - bounds.left - offsetX) / scale, 0, VIEWBOX.width),
      y: clamp((event.clientY - bounds.top - offsetY) / scale, 0, VIEWBOX.height),
    };
  }

  function canvasFromEvent(event) {
    return event.target.closest?.('[data-sketch-canvas]') || null;
  }

  function currentPolyline() {
    if (!state.polylineDraft.length || !state.pointer) return '';
    const firstPoint = state.polylineDraft[0];
    const lastPoint = state.polylineDraft.at(-1);
    const previewPoint = state.polylineDraft.length > 1 && distanceBetween(state.pointer, firstPoint) <= PATH_CLOSE_DISTANCE
      ? firstPoint
      : orthogonalPoint(lastPoint, state.pointer);
    return `
      <polyline class="sketch-preview" points="${asPoints([...state.polylineDraft, previewPoint])}" />
      ${pointMarkers(state.polylineDraft)}`;
  }

  function currentCircle() {
    if (!state.circleDraft) return '';
    const { center, radius } = state.circleDraft;
    return `<circle class="sketch-preview" cx="${center.x}" cy="${center.y}" r="${Math.max(radius, 1)}" />`;
  }

  function pointMarkers(points) {
    const uniquePoints = removeClosingDuplicate(points);

    return uniquePoints
      .map(({ x, y }) => `<circle class="sketch-point" cx="${x}" cy="${y}" r="5" />`)
      .join('');
  }

  function redraw() {
    const canvas = document.querySelector('[data-sketch-canvas]');
    if (canvas) canvas.outerHTML = markup();
  }

  function markup() {
    const polylines = state.polylines.map((points) => `
      <polygon class="sketch-geometry" points="${asPoints(points)}" />
      ${pointMarkers(points)}`).join('');
    const circles = state.circles.map(({ center, radius }) => `
      <circle class="sketch-geometry" cx="${center.x}" cy="${center.y}" r="${radius}" />
      <circle class="sketch-center" cx="${center.x}" cy="${center.y}" r="3.5" />`).join('');

    return `
      <svg class="sketch-canvas${state.tool === 'polyline' ? ' is-polyline-tool' : ''}${state.tool === 'circle' ? ' is-circle-tool' : ''}" data-sketch-canvas viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" preserveAspectRatio="xMidYMid meet" aria-label="Sketcher drawing plane">
        <rect class="sketch-background" width="${VIEWBOX.width}" height="${VIEWBOX.height}" />
        <line class="sketch-axis sketch-axis-y" x1="88" x2="88" y1="0" y2="${VIEWBOX.height}" />
        <line class="sketch-axis sketch-axis-x" x1="0" x2="${VIEWBOX.width}" y1="${VIEWBOX.height - 65}" y2="${VIEWBOX.height - 65}" />
        <text class="sketch-coordinate" x="92" y="${VIEWBOX.height - 72}">(0.0 mm, 0.0 mm)</text>
        <g class="sketch-shapes">${polylines}${circles}${currentPolyline()}${currentCircle()}</g>
      </svg>`;
  }

  function setTool(tool) {
    state.tool = tool;
    state.polylineDraft = [];
    state.circleDraft = null;
    state.pointer = null;
    redraw();
    onStatus(tool === 'polyline' ? 'Polyline: click points, then click the first point again to complete the path' : 'Circle: click a center, then click its radius');
  }

  function cancel() {
    if (!state.tool) return false;
    state.tool = null;
    state.polylineDraft = [];
    state.circleDraft = null;
    state.pointer = null;
    redraw();
    onStatus('Sketch command cancelled');
    return true;
  }

  function handlePointerMove(event) {
    const canvas = canvasFromEvent(event);
    if (!canvas || !state.tool) return false;
    state.pointer = pointFromEvent(event, canvas);
    if (state.circleDraft) state.circleDraft.radius = distanceBetween(state.circleDraft.center, state.pointer);
    redraw();
    return true;
  }

  function handlePointerDown(event) {
    const canvas = canvasFromEvent(event);
    if (!canvas || !state.tool || event.button !== 0) return false;
    event.preventDefault();
    const point = pointFromEvent(event, canvas);

    if (state.tool === 'polyline') {
      const firstPoint = state.polylineDraft[0];
      if (state.polylineDraft.length > 1 && distanceBetween(point, firstPoint) <= PATH_CLOSE_DISTANCE) {
        state.polylines.push(closedOrthogonalPath(state.polylineDraft));
        state.polylineDraft = [];
        state.pointer = null;
        state.tool = null;
        onStatus('Orthogonal path completed');
      } else {
        const nextPoint = state.polylineDraft.length ? orthogonalPoint(state.polylineDraft.at(-1), point) : point;
        state.polylineDraft.push(nextPoint);
        state.pointer = nextPoint;
        onStatus(state.polylineDraft.length === 1 ? 'Path start placed' : 'Orthogonal path point placed; click the first point to complete');
      }
      redraw();
      return true;
    }

    if (state.tool === 'circle') {
      if (!state.circleDraft) {
        state.circleDraft = { center: point, radius: 0 };
        state.pointer = point;
        onStatus('Circle center placed; move the pointer and click to set radius');
      } else {
        const radius = distanceBetween(state.circleDraft.center, point);
        state.circles.push({ center: state.circleDraft.center, radius });
        state.circleDraft = null;
        state.pointer = null;
        state.tool = null;
        onStatus('Circle created');
      }
      redraw();
      return true;
    }

    return false;
  }

  return { markup, setTool, cancel, handlePointerMove, handlePointerDown };
}
