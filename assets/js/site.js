const root = document.documentElement;
const brandVersion = '20260926';
const mascotCursor = "url('/assets/images/mascot-cursor.png') 9 16";
const launchToken = new URLSearchParams(window.location.search).get('run');
const previousLaunchToken = sessionStorage.getItem('drawflow-launch-token');
const hasActiveSession = sessionStorage.getItem('drawflow-active-session') === 'true';
const isNewLearningSession = launchToken ? launchToken !== previousLaunchToken : !hasActiveSession;

if (isNewLearningSession) {
  Object.keys(localStorage).forEach((key) => {
    if ((key.startsWith('drawflow_') || key.startsWith('drawflow-'))
      && key !== 'drawflow-theme'
      && key !== 'drawflow_account') {
      localStorage.removeItem(key);
    }
  });
}

sessionStorage.setItem('drawflow-active-session', 'true');
if (launchToken) sessionStorage.setItem('drawflow-launch-token', launchToken);

const INTERNAL_NAVIGATION_KEY = 'drawflow-internal-navigation';
document.addEventListener('click', (event) => {
  const link = event.target.closest?.('a[href]');
  if (link?.getAttribute('aria-disabled') === 'true') return;
  if (link && link.target !== '_blank') {
    const destination = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);
    if (destination.origin === current.origin
      && (destination.pathname !== current.pathname || destination.search !== current.search)) {
      sessionStorage.setItem(INTERNAL_NAVIGATION_KEY, 'true');
    }
    return;
  }
  if (event.target.closest?.('[data-internal-navigation], #proceed-to-exercises, #form-continue-topic, #form-review-lesson, #form-review-exercises, #progression-continue, #progression-quit')) {
    sessionStorage.setItem(INTERNAL_NAVIGATION_KEY, 'true');
  }
}, true);

window.addEventListener('beforeunload', (event) => {
  if (sessionStorage.getItem(INTERNAL_NAVIGATION_KEY) === 'true') {
    sessionStorage.removeItem(INTERNAL_NAVIGATION_KEY);
    return;
  }
  event.preventDefault();
  event.returnValue = 'Your DrawFlow progress will reset when you leave. You can start again and practise as often as you like.';
});

const brandIcon = document.querySelector('link[rel="icon"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
brandIcon.href = `/Logo%20DF.jpg?v=${brandVersion}`;

if (window.location.pathname.endsWith('/index.html')) {
  const cleanPath = window.location.pathname.slice(0, -'index.html'.length) || '/';
  window.history.replaceState({}, document.title, `${cleanPath}${window.location.search}${window.location.hash}`);
}

const hasCompletedAllLessons = () => {
  try {
    const completed = JSON.parse(localStorage.getItem('drawflow_completed_lessons') || '[]');
    return ['form', 'shadow', 'perspective', 'depth'].every((lesson) => completed.includes(lesson));
  } catch {
    return false;
  }
};

const hasCompletedLessonStep = () => (
  localStorage.getItem('drawflow_lesson_completed') === 'true'
  && hasCompletedAllLessons()
);

const routeStatus = (pathname) => {
  const path = pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  const isExercisePage = path.startsWith('/pages/drawing-exercise') || path === '/pages/exercises' || path === '/pages/exercises.html';
  return {
    requiresLessonsCompletion: isExercisePage,
    lessonsComplete: hasCompletedLessonStep(),
  };
};

const currentRouteStatus = routeStatus(window.location.pathname);
const lockedStep = new URLSearchParams(window.location.search).get('locked');
const gateMessages = {
  lessons: 'Please finish the Lessons first to unlock Exercises.'
};
const showGateMessage = (message) => {
  const notice = document.createElement('div');
  notice.className = 'drawflow-lock-notice';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.innerHTML = `<span class="drawflow-lock-notice__icon" aria-hidden="true">🔒</span><span>${message}</span>`;
  document.body.append(notice);
  window.setTimeout(() => notice.remove(), 3200);
};

const enhanceLessonAccordions = () => {
  const accordionHeadings = {
    form: ['I. Definition', 'II. Three Basic Shapes of Form', 'III. Background Sources'],
    shadow: ['I. Definition', 'II. Key Elements of Shadow', 'III. Background Sources'],
    perspective: ['I. Definition', 'II. Key Elements of Perspective', 'III. Types of Perspective', 'IV. Background Sources'],
    depth: ['I. Definition', 'II. Key Elements of Depth', 'III. Background Sources']
  };
  const articles = [...document.querySelectorAll('article[id]')];
  const fetchedContent = document.querySelector('[data-lesson-content]');
  if (fetchedContent) articles.push(fetchedContent);

  articles.forEach((article) => {
    const lessonId = accordionHeadings[article.id] ? article.id : document.body.dataset.lesson;
    const expectedHeadings = accordionHeadings[lessonId];
    const content = article.querySelector('.mt-8.space-y-6');
    if (!expectedHeadings || !content) return;

    [...content.children].forEach((section) => {
      const heading = section.querySelector(':scope > h3');
      if (!heading) return;
      const title = heading.textContent.trim().replace(/\s+/g, ' ');
      if (/^[IVX]+\. Example$/i.test(title)) {
        section.remove();
        return;
      }
      const headingIndex = expectedHeadings.findIndex((expected) => (
        expected.toLowerCase() === title.toLowerCase()
        || (expected.startsWith('II. Key Elements of ') && title === 'II. Key Elements')
      ));
      if (headingIndex === -1 || section.matches('details')) return;

      const accordion = document.createElement('details');
      accordion.className = 'lesson-accordion';
      accordion.name = `lesson-${lessonId}`;
      accordion.dataset.lessonAccordion = '';
      const summary = document.createElement('summary');
      summary.className = 'lesson-accordion__summary font-display text-xl text-foreground';
      summary.textContent = expectedHeadings[headingIndex];
      const body = document.createElement('div');
      body.className = 'lesson-accordion__content';
      [...section.childNodes].forEach((child) => {
        if (child !== heading) body.append(child);
      });
      accordion.append(summary, body);
      section.replaceWith(accordion);
      accordion.addEventListener('toggle', () => {
        if (!accordion.open) return;
        content.querySelectorAll('details[name="' + accordion.name + '"]').forEach((sibling) => {
          if (sibling !== accordion) sibling.open = false;
        });
      });
    });
  });
};

enhanceLessonAccordions();
window.addEventListener('lessoncontentloaded', enhanceLessonAccordions);

if (lockedStep && gateMessages[lockedStep]) showGateMessage(gateMessages[lockedStep]);

if (currentRouteStatus.requiresLessonsCompletion && !currentRouteStatus.lessonsComplete) {
  sessionStorage.setItem(INTERNAL_NAVIGATION_KEY, 'true');
  window.location.replace('/pages/lessons/?locked=lessons');
}

document.querySelectorAll('a[href]').forEach((link) => {
  const destination = new URL(link.href, window.location.href);
  if (destination.pathname.replace(/\/$/, '') === '/pages/self-check') {
    link.remove();
    return;
  }
  if (link.textContent.trim() === 'About Us') link.textContent = 'About';
  if (destination.origin !== window.location.origin) return;
  const status = routeStatus(destination.pathname);
  const locked = status.requiresLessonsCompletion && !status.lessonsComplete;
  if (!locked) return;
  link.setAttribute('aria-disabled', 'true');
  let lockReason;
  lockReason = gateMessages.lessons;
  link.setAttribute('title', lockReason);
  const lock = document.createElement('span');
  lock.setAttribute('aria-hidden', 'true');
  lock.textContent = ' 🔒';
  link.append(lock);
  link.addEventListener('click', (event) => {
    event.preventDefault();
    showGateMessage(lockReason);
  });
});

const mainNavigation = document.querySelector('header nav[aria-label="Main navigation"]');
if (mainNavigation && ![...mainNavigation.querySelectorAll('a[href]')].some((link) => (
  new URL(link.href, window.location.href).pathname.replace(/\/$/, '') === '/pages/about'
))) {
  const aboutLink = document.createElement('a');
  aboutLink.href = '/pages/about/';
  aboutLink.textContent = 'About';
  aboutLink.className = 'focus-ring rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted';
  if (window.location.pathname.replace(/\/$/, '') === '/pages/about') {
    aboutLink.setAttribute('aria-current', 'page');
    aboutLink.className = 'focus-ring rounded-full bg-muted px-3 py-2 text-sm font-semibold';
  }
  mainNavigation.append(aboutLink);
}

const themeToggle = document.querySelector('[data-testid="button-theme-toggle"], #button-theme-toggle');
document.querySelectorAll("canvas[id$='-drawing-canvas']").forEach((canvas) => {
  canvas.style.cursor = `${mascotCursor}, crosshair`;
  canvas.style.touchAction = 'none';
});
let menuToggle = document.querySelector('[data-testid="button-mobile-menu"]');
const navigation = document.querySelector('header nav');
if (navigation && !menuToggle) {
  menuToggle = document.createElement('button');
  menuToggle.type = 'button';
  menuToggle.setAttribute('aria-label', 'Open menu');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.dataset.testid = 'button-mobile-menu';
  menuToggle.className = 'mobile-menu-fallback focus-ring grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground md:hidden';
  menuToggle.textContent = '☰';
  navigation.setAttribute('aria-label', navigation.getAttribute('aria-label') || 'Main navigation');
  navigation.parentElement.classList.add('has-mobile-menu-fallback');
  navigation.parentElement.append(menuToggle);
}
const restartButton = document.querySelector('[data-testid="button-restart-progress"]');
const studyDialog = document.querySelector('#study-dialog');

const setThemeIcon = () => {
  if (!themeToggle) return;
  const isDark = root.classList.contains('dark-mode');
  themeToggle.innerHTML = isDark ? '☾' : '☀';
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to day mode' : 'Switch to night mode');
};
const studyTitle = document.querySelector('#study-dialog-title');
const studyDescription = document.querySelector('#study-dialog-description');
const closeDialogButton = document.querySelector('[data-close-dialog]');
const startStudyButton = document.querySelector('[data-start-study]');
const videoPlayer = document.querySelector('[data-video-player]');
const videoSpeed = document.querySelector('[data-video-speed]');
const videoQuality = document.querySelector('[data-video-quality]');
const videoFullscreen = document.querySelector('[data-video-fullscreen]');

if (localStorage.getItem('drawflow-theme') === 'dark') root.classList.add('dark-mode');
setThemeIcon();

const updatePageProgress = () => {
  const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = pageHeight > 0 ? Math.min(window.scrollY / pageHeight, 1) * 100 : 100;
  root.style.setProperty('--page-progress', `${progress}%`);
};

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 })
  : null;

document.querySelectorAll('main section, main article, main aside').forEach((element) => {
  element.setAttribute('data-reveal', '');
  if (revealObserver) revealObserver.observe(element);
});

window.addEventListener('scroll', updatePageProgress, { passive: true });
window.addEventListener('resize', updatePageProgress);
updatePageProgress();

videoSpeed?.addEventListener('change', () => {
  if (videoPlayer) videoPlayer.playbackRate = Number(videoSpeed.value);
});

videoFullscreen?.addEventListener('click', async () => {
  if (!videoPlayer) return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await videoPlayer.requestFullscreen();
});

if (videoPlayer && videoQuality) {
  const qualitySources = [...videoPlayer.querySelectorAll('source[data-quality]')];
  qualitySources.forEach((source) => {
    const option = document.createElement('option');
    option.value = source.dataset.quality;
    option.textContent = source.dataset.quality;
    videoQuality.append(option);
  });

  videoQuality.addEventListener('change', () => {
    const selectedSource = qualitySources.find((source) => source.dataset.quality === videoQuality.value);
    if (!selectedSource || videoPlayer.currentSrc === selectedSource.src) return;
    const currentTime = videoPlayer.currentTime;
    const wasPlaying = !videoPlayer.paused;
    videoPlayer.src = selectedSource.src;
    videoPlayer.currentTime = currentTime;
    if (wasPlaying) videoPlayer.play();
  });
}

const closeStudyDialog = () => {
  if (!studyDialog) return;
  studyDialog.classList.add('hidden');
  studyDialog.classList.remove('flex');
  if (startStudyButton) startStudyButton.textContent = 'Start study →';
};

themeToggle?.addEventListener('click', () => {
  root.classList.toggle('dark-mode');
  const isDark = root.classList.contains('dark-mode');
  localStorage.setItem('drawflow-theme', isDark ? 'dark' : 'light');
  setThemeIcon();
});

if (themeToggle) {
  setThemeIcon();
}

menuToggle?.addEventListener('click', () => {
  if (!navigation) return;

  const isOpen = navigation.classList.toggle('mobile-nav-open');
  navigation.classList.toggle('!flex', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    if (!menuToggle || !navigation || !navigation.classList.contains('mobile-nav-open')) return;
    menuToggle.click();
  });
});

document.querySelectorAll('[data-study]').forEach((studyCard) => {
  studyCard.addEventListener('click', (event) => {
    event.preventDefault();
    if (!studyDialog || !studyTitle || !studyDescription) return;

    studyTitle.textContent = studyCard.dataset.study || 'Study guide';
    studyDescription.textContent = studyCard.dataset.studyDescription || 'More detail is coming soon.';
    studyDialog.classList.remove('hidden');
    studyDialog.classList.add('flex');
    closeDialogButton?.focus();
  });
});

document.querySelector('[data-coming-soon]')?.addEventListener('click', () => {
  if (!studyDialog || !studyTitle || !studyDescription) return;
  studyTitle.textContent = 'Color in company';
  studyDescription.textContent = 'This study is still being prepared. Check back soon for a guided exploration of tension, harmony, and the colors between colors.';
  if (startStudyButton) startStudyButton.textContent = 'Got it';
  studyDialog.classList.remove('hidden');
  studyDialog.classList.add('flex');
  closeDialogButton?.focus();
});

closeDialogButton?.addEventListener('click', closeStudyDialog);
studyDialog?.addEventListener('click', (event) => {
  if (event.target === studyDialog) closeStudyDialog();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeStudyDialog();
});
startStudyButton?.addEventListener('click', () => {
  closeStudyDialog();
  document.querySelector('[data-testid="progress-path-progress"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

restartButton?.addEventListener('click', () => {
  document.querySelectorAll('[data-testid^="progress-"] .bg-accent').forEach((bar) => { bar.style.width = '0%'; });
  restartButton.textContent = 'Progress restarted';
});
