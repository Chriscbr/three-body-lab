// Read the user's selection before pausing: pause callbacks can refresh the UI.
export interface TimelineInput extends EventTarget {value: string;}
export interface TimelineCallbacks {
  pause: () => void;
  seek: (time: number) => void;
  scrubbing: (active: boolean) => void;
  releaseTarget: EventTarget;
}

export function bindTimeline(input: TimelineInput, {pause, seek, scrubbing, releaseTarget}: TimelineCallbacks): () => void {
  let dragging = false;
  const start = () => {dragging = true; scrubbing(true); pause();};
  const select = () => {
    const selectedTime = Number(input.value);
    pause();
    if (Number.isFinite(selectedTime)) seek(selectedTime);
  };
  const finish = () => {if (dragging) {dragging = false; scrubbing(false);}};
  input.addEventListener('pointerdown', start);
  input.addEventListener('input', select);
  input.addEventListener('change', finish);
  releaseTarget.addEventListener('pointerup', finish);
  releaseTarget.addEventListener('pointercancel', finish);
  releaseTarget.addEventListener('blur', finish);
  return () => {
    input.removeEventListener('pointerdown', start);
    input.removeEventListener('input', select);
    input.removeEventListener('change', finish);
    for (const type of ['pointerup', 'pointercancel', 'blur']) releaseTarget.removeEventListener(type, finish);
  };
}
