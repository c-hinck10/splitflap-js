export function observeOnce(
  element: Element,
  onVisible: () => void,
  threshold = 0.35
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    onVisible();
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer.disconnect();
          onVisible();
          break;
        }
      }
    },
    { threshold }
  );

  observer.observe(element);

  return () => observer.disconnect();
}
