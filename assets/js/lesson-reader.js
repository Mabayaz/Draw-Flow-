(() => {
  const fill = document.querySelector('[data-reader-fill]');
  const label = document.querySelector('[data-reader-label]');
  const track = document.querySelector('[role="progressbar"]');
  const completeButton = document.querySelector('[data-complete-lesson]');
  const completeLabel = document.querySelector('[data-complete-label]');
  const lesson = completeButton?.dataset.completeLesson;
  const completedLessons = new Set();

  const updateProgress = () => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollableHeight > 0 ? Math.round((window.scrollY / scrollableHeight) * 100) : 100;
    const bounded = Math.max(0, Math.min(100, percentage));
    if (fill) fill.style.width = `${bounded}%`;
    if (label) label.textContent = `${bounded}% read`;
    track?.setAttribute('aria-valuenow', String(bounded));
  };

  const renderCompletion = () => {
    if (!completeButton || !lesson) return;
    const complete = completedLessons.has(lesson);
    completeButton.textContent = complete ? 'Lesson complete ✓' : `Mark ${lesson[0].toUpperCase() + lesson.slice(1)} complete →`;
    completeButton.classList.toggle('is-complete', complete);
    if (completeLabel) completeLabel.textContent = complete ? 'Marked complete for this visit.' : 'You can change this later.';
  };

  completeButton?.addEventListener('click', () => {
    if (completedLessons.has(lesson)) completedLessons.delete(lesson); else completedLessons.add(lesson);
    renderCompletion();
  });

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  window.addEventListener('lessoncontentloaded', updateProgress);
  updateProgress();
  renderCompletion();
})();
