(() => {
  const fill = document.querySelector('[data-reader-fill]');
  const label = document.querySelector('[data-reader-label]');
  const track = document.querySelector('[role="progressbar"]');
  const completeButton = document.querySelector('[data-complete-lesson]');
  const completeLabel = document.querySelector('[data-complete-label]');
  const lesson = completeButton?.dataset.completeLesson;
  const storageKey = 'drawflow-completed-lessons';

  const updateProgress = () => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollableHeight > 0 ? Math.round((window.scrollY / scrollableHeight) * 100) : 100;
    const bounded = Math.max(0, Math.min(100, percentage));
    if (fill) fill.style.width = `${bounded}%`;
    if (label) label.textContent = `${bounded}% read`;
    track?.setAttribute('aria-valuenow', String(bounded));
  };

  const getCompleted = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
  const renderCompletion = () => {
    if (!completeButton || !lesson) return;
    const complete = getCompleted().includes(lesson);
    completeButton.textContent = complete ? 'Lesson complete ✓' : `Mark ${lesson[0].toUpperCase() + lesson.slice(1)} complete →`;
    completeButton.classList.toggle('is-complete', complete);
    if (completeLabel) completeLabel.textContent = complete ? 'Saved to your learning path.' : 'You can change this later.';
  };

  completeButton?.addEventListener('click', () => {
    const completed = new Set(getCompleted());
    if (completed.has(lesson)) completed.delete(lesson); else completed.add(lesson);
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
    renderCompletion();
  });

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  window.addEventListener('lessoncontentloaded', updateProgress);
  updateProgress();
  renderCompletion();
})();
