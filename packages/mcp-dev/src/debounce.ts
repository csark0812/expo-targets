/**
 * Leading-edge coalesce: first call schedules `fn` after `ms`; further calls
 * within the window reset the timer so only the last burst runs once.
 */
export function debounce(
  fn: () => void,
  ms: number,
): { trigger: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    trigger() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, ms);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
