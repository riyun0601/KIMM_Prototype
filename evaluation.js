export const surveys = Object.freeze({
  cad: 'https://forms.gle/MvtpTS2xeCy5T9CZ6',
  cam: 'https://forms.gle/QE7CMBnRYi6RUofG8',
  flow: 'https://forms.gle/HTcJ5Si4QuiRepUX9',
  structure: 'https://forms.gle/mNxUx48DC7UNg25v6',
  sys: 'https://forms.gle/iFyz1kYEq1KfYCMh9',
});

// Mounted outside each application's render root: it neither consumes layout
// space nor disappears when a workbench, tab, or simulation screen changes.
export function mountEvaluationExit(program) {
  if (!Object.hasOwn(surveys, program)) throw new Error('Unknown evaluation program');
  if (document.getElementById('kimm-evaluation-exit')) return;
  const accents = { cad: '#5671FF', cam: '#960DFF', flow: '#FF504B', structure: '#40CB49', sys: '#FF5B94' };
  const host = document.createElement('div');
  host.id = 'kimm-evaluation-exit';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host { position: fixed; right: max(24px, env(safe-area-inset-right)); bottom: max(24px, env(safe-area-inset-bottom)); z-index: 2147483000; display: block; width: max-content; max-width: calc(100vw - 48px); pointer-events: none; }
    button { box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 56px; margin: 0; padding: 0 20px; border: 0; border-radius: 12px; background: ${accents[program]}; color: #fff; font: 600 16px/1 "Segoe UI", "Malgun Gothic", sans-serif; white-space: nowrap; cursor: pointer; pointer-events: auto; box-shadow: 0 6px 18px rgba(0,0,0,.12); }
    button:hover { background: color-mix(in srgb, ${accents[program]} 95%, black); }
    svg { flex: none; width: 16px; height: 16px; }
    button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; box-shadow: 0 0 0 5px ${accents[program]}; }
  </style><button type="button"><span>평가 종료 및 설문 응답하기</span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/></svg></button>`;
  const button = shadow.querySelector('button');
  button.addEventListener('click', () => completeEvaluation(program));
  // Do not trigger application-wide selection/keyboard handlers underneath it.
  for (const type of ['pointerdown', 'click', 'keydown']) host.addEventListener(type, event => event.stopPropagation());
  document.body.append(host);

  // Keep the lower-right anchor, moving only the overlay above any existing
  // controls/status strip it would cover. No application element is moved.
  let scheduled = false;
  const position = () => {
    scheduled = false;
    host.style.bottom = '';
    const initial = host.getBoundingClientRect();
    let bottom = window.innerHeight - initial.bottom;
    const obstacles = [...document.querySelectorAll('button, input, select, textarea, a, [role="button"], .status-bar, .statusbar')]
      .filter(node => !host.contains(node) && !node.closest('dialog') && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden')
      .map(node => node.getBoundingClientRect())
      .filter(rect => rect.width && rect.height && rect.right > initial.left - 8 && rect.left < initial.right + 8);
    for (let i = 0; i < obstacles.length; i++) {
      const top = window.innerHeight - bottom - initial.height;
      const hit = obstacles.find(rect => rect.bottom > top - 8 && rect.top < window.innerHeight - bottom + 8);
      if (!hit) break;
      const next = window.innerHeight - hit.top + 12;
      if (next + initial.height > window.innerHeight - 24) break;
      bottom = next;
    }
    host.style.bottom = `${bottom}px`;
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(position); } };
  new MutationObserver(records => { if (records.some(record => record.target !== host)) schedule(); })
    .observe(document.body, { childList: true, subtree: true, attributes: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);
  schedule();
}

export function completeEvaluation(program) {
  if (!Object.hasOwn(surveys, program)) throw new Error('Unknown evaluation program');
  // Vite supplies the app's base even when the page is opened at a nested URL.
  const home = new URL('../', new URL(import.meta.env?.BASE_URL || '/', window.location.origin));
  let surveyTab;
  try {
    // Open synchronously during the click. Opening with noopener would return null
    // even on success, so detach the blank tab before navigating it instead.
    surveyTab = window.open('about:blank', '_blank');
    if (surveyTab) {
      surveyTab.opener = null;
      surveyTab.location.replace(surveys[program]);
    }
  } catch {
    surveyTab?.close();
    surveyTab = null;
  }
  if (!surveyTab) {
    showSurveyFallback(program);
    return false;
  }
  window.location.assign(home.href);
  return true;
}

function showSurveyFallback(program) {
  document.getElementById('kimm-survey-fallback')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'kimm-survey-fallback';
  dialog.setAttribute('aria-label', '사용성 평가 설문 열기');
  const message = document.createElement('p');
  message.textContent = '새 탭을 열 수 없어 평가 화면을 유지했습니다. 팝업을 허용한 뒤 다시 시도하거나 아래 주소로 설문을 열어 주세요.';
  const retry = document.createElement('a');
  retry.href = surveys[program];
  retry.target = '_blank';
  retry.rel = 'noopener noreferrer';
  retry.textContent = '새 탭에서 설문 다시 열기';
  retry.addEventListener('click', event => { event.preventDefault(); completeEvaluation(program); });
  const address = document.createElement('p');
  address.textContent = surveys[program];
  const sameTab = document.createElement('a');
  sameTab.href = surveys[program];
  sameTab.textContent = '현재 탭에서 설문 열기';
  const form = document.createElement('form');
  form.method = 'dialog';
  const close = document.createElement('button');
  close.textContent = '평가 화면으로 돌아가기';
  form.append(close);
  dialog.append(message, retry, address, sameTab, form);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('pointerdown', event => event.stopPropagation());
  document.body.append(dialog);
  dialog.showModal();
}

// A blocked popup must leave an accessible survey link on the home page.
if (typeof document !== 'undefined' && document.querySelector('[data-evaluation-home]')) {
  const program = new URLSearchParams(window.location.search).get('survey');
  if (Object.hasOwn(surveys, program)) {
    const dialog = document.createElement('dialog');
    const message = document.createElement('p');
    message.textContent = '팝업이 차단되었습니다. 아래 링크를 눌러 사후 설문을 열어 주세요.';
    const link = document.createElement('a');
    link.href = surveys[program];
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '사후 설문 바로가기';
    const form = document.createElement('form');
    form.method = 'dialog';
    const close = document.createElement('button');
    close.textContent = '닫기';
    form.append(close);
    dialog.append(message, link, form);
    document.body.append(dialog);
    dialog.showModal();
  }
}
