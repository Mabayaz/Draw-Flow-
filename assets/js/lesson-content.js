(() => {
  const activities = {
    form: {
      title: 'Build volume from simple forms',
      caption: 'Turn a flat square into a solid cube.',
      illustration: '<svg viewBox="0 0 120 96" role="img" aria-label="A square extended into a three-dimensional cube"><path pathLength="1" d="M22 29h42v42H22zM64 29l27-15v42L64 71M22 29l27-15h42M49 14v42" fill="none" stroke="#173e36" stroke-width="3" stroke-linejoin="round"/></svg>',
      steps: ['Observe the object', 'Block in a primitive', 'Add visible planes', 'Check proportion'],
      question: 'What most clearly turns a flat square into a cube?',
      choices: ['Receding edges that show depth', 'A heavier outline around the square'],
      answer: 0,
      feedback: 'Receding edges add a third dimension; the outline alone keeps the shape flat.'
    },
    shadow: {
      title: 'Place light and shadow',
      caption: 'Light direction determines the cast shadow.',
      illustration: '<svg viewBox="0 0 120 96" role="img" aria-label="Light rays pass a sphere and form a cast shadow"><path pathLength="1" d="M14 18 45 36M14 48h29M14 78l31-17M64 62l27 12M64 67l29 7" fill="none" stroke="#e86f45" stroke-width="3" stroke-linecap="round"/><circle cx="57" cy="48" r="20" fill="#f4c95d" stroke="#173e36" stroke-width="3"/><path d="M57 28a20 20 0 0 1 0 40" fill="#e86f45" fill-opacity=".4"/><ellipse cx="91" cy="78" rx="22" ry="6" fill="#263631" fill-opacity=".2"/></svg>',
      steps: ['Choose a light source', 'Mark the lit plane', 'Place core shadow', 'Project cast shadow'],
      question: 'Where should a cast shadow fall?',
      choices: ['On the side opposite the light source', 'Directly toward the light source'],
      answer: 0,
      feedback: 'A cast shadow extends away from the light, following the surface beneath the object.'
    },
    perspective: {
      title: 'Construct a perspective form',
      caption: 'Receding edges converge at the horizon.',
      illustration: '<svg viewBox="0 0 120 96" role="img" aria-label="A box constructed with edges converging to one vanishing point"><path pathLength="1" d="M8 38h104M60 38 17 83M60 38l50 40M30 57h34v29H30zM64 57l18-10v29L64 86M30 57l18-10h34M48 47v29" fill="none" stroke="#173e36" stroke-width="2.5" stroke-linejoin="round"/><circle cx="60" cy="38" r="3.5" fill="#e86f45"/></svg>',
      steps: ['Set eye level', 'Place vanishing point(s)', 'Draw receding edges', 'Close the form'],
      question: 'Where do parallel edges receding in one-point perspective appear to meet?',
      choices: ['At the vanishing point on the horizon', 'At the center of every face'],
      answer: 0,
      feedback: 'In one-point perspective, depth edges converge toward a vanishing point on the horizon.'
    },
    depth: {
      title: 'Create a clear sense of depth',
      caption: 'Overlap makes front-to-back order legible.',
      illustration: '<svg viewBox="0 0 120 96" role="img" aria-label="Two overlapping forms show which object is in front"><path pathLength="1" d="M23 22h56v48H23zM23 22l19-11h56v48L79 70M79 22l19-11M42 11v48" fill="none" stroke="#2f896c" stroke-width="3" stroke-linejoin="round"/><path pathLength="1" d="M52 46h46v38H52zM52 46l15-9h46v38L98 84M98 46l15-9M67 37v38" fill="#e86f45" fill-opacity=".16" stroke="#173e36" stroke-width="3" stroke-linejoin="round"/></svg>',
      steps: ['Overlap near forms', 'Reduce distant scale', 'Soften distant contrast', 'Check foreground order'],
      question: 'Which cue most clearly places one object in front of another?',
      choices: ['The front object overlaps part of the rear object', 'Both objects have the same size and outline'],
      answer: 0,
      feedback: 'Overlap gives a direct front-to-back relationship; scale and contrast can reinforce it.'
    }
  };

  const appendActivity = (target, lessonId) => {
    const content = activities[lessonId];
    if (!content || target.querySelector(`[data-lesson-activity="${lessonId}"]`)) return;

    const section = document.createElement('section');
    section.className = 'lesson-activity';
    section.dataset.lessonActivity = lessonId;
    section.innerHTML = `
      <p class="lesson-activity__eyebrow">See it, then try it</p>
      <h3 class="lesson-activity__title">${content.title}</h3>
      <figure class="lesson-activity__diagram">${content.illustration}<figcaption>${content.caption}</figcaption></figure>
      <ol class="lesson-flow" aria-label="${content.title} steps">
        ${content.steps.map((step, index) => `<li class="lesson-flow__step"><span class="lesson-flow__number">0${index + 1}</span><span>${step}</span></li>`).join('')}
      </ol>
      <fieldset class="lesson-activity__check">
        <legend>${content.question}</legend>
        ${content.choices.map((choice, index) => `<label><input type="radio" name="lesson-check-${lessonId}" value="${index}"><span>${choice}</span></label>`).join('')}
        <button type="button" class="lesson-activity__button" data-check-lesson="${lessonId}" data-answer="${content.answer}">Check answer</button>
        <p class="lesson-activity__feedback" data-lesson-feedback role="status" aria-live="polite"></p>
      </fieldset>`;
    target.append(section);
  };

  const mount = document.querySelector('[data-lesson-content]');
  const lessonId = document.body.dataset.lesson;
  const mountActivities = () => {
    document.querySelectorAll('article[id]').forEach((article) => appendActivity(article, article.id));
    if (mount && lessonId) appendActivity(mount, lessonId);
  };

  mountActivities();
  window.addEventListener('lessoncontentloaded', mountActivities);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-check-lesson]');
    if (!button) return;
    const activity = button.closest('[data-lesson-activity]');
    const selected = activity.querySelector('input[type="radio"]:checked');
    const feedback = activity.querySelector('[data-lesson-feedback]');
    if (!selected) {
      feedback.textContent = 'Choose an answer before checking.';
      return;
    }
    feedback.textContent = Number(selected.value) === Number(button.dataset.answer)
      ? `Correct. ${activities[button.dataset.checkLesson].feedback}`
      : 'Not quite. Review the steps above and try again.';
  });

  if (!mount || !lessonId) return;

  fetch('/pages/lessons.html')
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
