const VIEWBOX = { width: 1000, height: 600 };
const CLOSE_DISTANCE = 16;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pointsAttribute = (points) => points.map(({ x, y }) => `${x},${y}`).join(' ');

function orthogonalPoint(from, point) {
  return Math.abs(point.x - from.x) >= Math.abs(point.y - from.y)
    ? { x: point.x, y: from.y }
    : { x: from.x, y: point.y };
}

export function createSketcherEditor({ onComplete = () => {}, onStatus = () => {} } = {}) {
  const state = { mode: 'profile', tool: null, profile: [], circle: null, draftCircle: null, pointer: null };

  function pointFromEvent(event, canvas) {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / VIEWBOX.width, bounds.height / VIEWBOX.height);
    return {
      x: (event.clientX - bounds.left - (bounds.width - VIEWBOX.width * scale) / 2) / scale,
      y: (event.clientY - bounds.top - (bounds.height - VIEWBOX.height * scale) / 2) / scale,
    };
  }

  function redraw() {
    const canvas = document.querySelector('[data-sketch-canvas]');
    if (canvas) canvas.outerHTML = markup();
  }

  function markers(points) {
    return points.map((point) => `<circle class="sketch-point" cx="${point.x}" cy="${point.y}" r="5" />`).join('');
  }

  function profileMarkup() {
    if (!state.profile.length) return '';
    const preview = state.tool === 'polyline' && state.pointer
      ? orthogonalPoint(state.profile.at(-1), state.pointer)
      : null;
    return `
      <polyline class="sketch-profile${state.profile.length > 2 ? ' is-closed' : ''}" points="${pointsAttribute(state.profile)}" />
      ${preview ? `<line class="sketch-preview" x1="${state.profile.at(-1).x}" y1="${state.profile.at(-1).y}" x2="${preview.x}" y2="${preview.y}" />` : ''}
      ${markers(state.profile)}`;
  }

  function circleMarkup() {
    const circle = state.draftCircle || state.circle;
    if (!circle) return '';
    return `<circle class="sketch-profile" cx="${circle.center.x}" cy="${circle.center.y}" r="${Math.max(circle.radius, 1)}" />
      <circle class="sketch-point" cx="${circle.center.x}" cy="${circle.center.y}" r="4" />`;
  }

  function markup() {
    const isFace = state.mode === 'face-circle';
    return `<svg class="sketch-canvas${state.tool ? ' is-drawing' : ''}" data-sketch-canvas viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" preserveAspectRatio="xMidYMid meet" aria-label="2D Sketch plane">
      <rect class="sketch-background" width="${VIEWBOX.width}" height="${VIEWBOX.height}" />
      ${isFace ? '<circle class="face-reference" cx="500" cy="300" r="184" /><circle class="face-reference inner" cx="500" cy="300" r="68" />' : ''}
      <line class="sketch-axis x" x1="0" y1="300" x2="1000" y2="300" /><line class="sketch-axis y" x1="500" y1="0" x2="500" y2="600" />
      <text class="sketch-note" x="515" y="283">(0.0 mm, 0.0 mm)</text>
      ${isFace ? circleMarkup() : profileMarkup()}
    </svg>`;
  }

  function begin(mode) {
    state.mode = mode;
    state.tool = mode === 'face-circle' ? 'circle' : 'polyline';
    state.profile = [];
    state.circle = null;
    state.draftCircle = null;
    state.pointer = null;
    redraw();
    onStatus(mode === 'face-circle' ? '원 중심을 클릭하고 반지름을 지정하세요' : '점들을 클릭한 뒤 시작점을 다시 클릭해 닫힌 path를 완성하세요');
  }

  function selectTool(tool) {
    state.tool = tool;
    redraw();
  }

  function handlePointerMove(event) {
    const canvas = event.target.closest?.('[data-sketch-canvas]');
    if (!canvas || !state.tool) return;
    state.pointer = pointFromEvent(event, canvas);
    if (state.draftCircle) state.draftCircle.radius = distance(state.draftCircle.center, state.pointer);
    redraw();
  }

  function handlePointerDown(event) {
    const canvas = event.target.closest?.('[data-sketch-canvas]');
    if (!canvas || event.button !== 0 || !state.tool) return;
    const point = pointFromEvent(event, canvas);
    if (state.tool === 'polyline') {
      const first = state.profile[0];
      if (state.profile.length > 2 && distance(point, first) <= CLOSE_DISTANCE) {
        state.tool = null;
        state.pointer = null;
        redraw();
        onStatus('닫힌 브라켓 프로파일이 완성되었습니다');
        onComplete('profile');
        return;
      }
      state.profile.push(state.profile.length ? orthogonalPoint(state.profile.at(-1), point) : point);
      state.pointer = state.profile.at(-1);
      redraw();
      return;
    }
    if (state.tool === 'circle') {
      if (!state.draftCircle) {
        state.draftCircle = { center: point, radius: 0 };
        state.pointer = point;
      } else {
        state.circle = { center: state.draftCircle.center, radius: distance(state.draftCircle.center, point) };
        state.draftCircle = null;
        state.tool = null;
        state.pointer = null;
        redraw();
        onStatus('면 위 원 스케치가 완성되었습니다');
        onComplete('circle');
        return;
      }
      redraw();
    }
  }

  return { begin, selectTool, markup, handlePointerMove, handlePointerDown };
}
