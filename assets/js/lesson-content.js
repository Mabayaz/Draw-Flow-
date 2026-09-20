(() => {
  const mount = document.querySelector('[data-lesson-content]');
  const lessonId = document.body.dataset.lesson;
  if (!mount || !lessonId) return;

  fetch('lessons.html')
    .then((response) => response.text())
    .then((html) => {
      const documentFragment = new DOMParser().parseFromString(html, 'text/html');
      const sourceArticle = documentFragment.querySelector(`#${lessonId}`);
      if (!sourceArticle) throw new Error(`Lesson content not found: ${lessonId}`);
      mount.innerHTML = sourceArticle.innerHTML;
      mount.classList.remove('lesson-content-loading');
      window.dispatchEvent(new Event('lessoncontentloaded'));
    })
    .catch(() => {
      mount.textContent = 'This lesson content could not be loaded. Return to the lesson overview and try again.';
    });
})();
