/** Part Design의 사용자 테스트용 브라켓 피처 흐름입니다. */
export function createBracketWorkflow() {
  return {
    phase: 'profile',
    selectedFace: null,
    view: 'isometric',
    task: null,
    patternCount: 1,
    profile: [],
    faceCircle: null,
  };
}

export function reduceBracketWorkflow(state, event) {
  switch (event.type) {
    case 'profile.completed':
      return { ...state, phase: 'profile-ready', selectedFace: null, task: null, profile: event.points || [], view: 'top' };
    case 'revolve':
      if (state.phase !== 'profile-ready') return state;
      return { ...state, phase: 'revolved', selectedFace: null, task: null, view: 'isometric' };
    case 'face.select':
      if (!['revolved', 'circle-ready', 'pocket', 'pattern'].includes(state.phase)) return state;
      return { ...state, selectedFace: event.face, task: null };
    case 'view.set':
      return { ...state, view: event.view || 'isometric' };
    case 'face-sketch.start':
      if (!state.selectedFace || !['revolved', 'pocket', 'pattern'].includes(state.phase)) return state;
      return { ...state, task: 'face-sketch' };
    case 'circle.completed':
      if (state.task !== 'face-sketch') return state;
      return { ...state, task: null, phase: 'circle-ready', faceCircle: event.circle || null };
    case 'pocket':
      if (state.phase !== 'circle-ready' || state.selectedFace?.featureId !== 'Sketch.Circle') return state;
      return { ...state, phase: 'pocket', selectedFace: null };
    case 'pattern.open':
      if (state.phase !== 'pocket') return state;
      return { ...state, task: 'polar-pattern', patternCount: 1 };
    case 'pattern.count':
      return { ...state, patternCount: Math.max(1, Math.min(12, Number(event.count) || 1)) };
    case 'pattern.confirm':
      if (state.task !== 'polar-pattern') return state;
      return { ...state, phase: 'pattern', task: null, selectedFace: null };
    case 'task.cancel':
      return { ...state, task: null };
    default:
      return state;
  }
}

export function modelStageFor(phase) {
  if (phase === 'profile-ready') return 'profile';
  if (['revolved', 'circle-ready'].includes(phase)) return 'revolved';
  if (phase === 'pocket') return 'pocket';
  if (phase === 'pattern') return 'pattern';
  return 'empty';
}
