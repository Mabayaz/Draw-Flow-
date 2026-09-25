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
  if (event.target.closest?.('[data-internal-navigation], #proceed-to-exercises, #form-proceed-self-check, #form-continue-topic, #form-review-exercises, #progression-continue, #progression-quit')) {
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

const hasCompletedAllExercises = () => {
  if (localStorage.getItem('drawflow_exercises_completed') !== 'true') return false;
  try {
    const progression = JSON.parse(localStorage.getItem('drawflow_progression') || '{}');
    return ['form', 'shadow', 'perspective', 'depth'].every((topic) => progression[topic]?.completed === true);
  } catch {
    return false;
  }
};

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

const hasCompletedPreTest = () => (
  localStorage.getItem('drawflow_pretest_completed') === 'true'
  && localStorage.getItem('drawflow_pretest_submitted') === 'true'
);

const routeStatus = (pathname) => {
  const path = pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  const isSelfCheck = path === '/pages/self-check';
  const isLessonsPage = path === '/pages/lessons';
  const isExercisePage = path.startsWith('/pages/drawing-exercise') || path === '/pages/exercises' || path === '/pages/exercises.html';
  const isStandaloneLesson = [
    '/pages/lessons.html',
    '/pages/form', '/pages/form.html',
    '/pages/shadow', '/pages/shadow.html',
    '/pages/perspective', '/pages/perspective.html',
    '/pages/depth', '/pages/depth.html'
  ].includes(path);
  const preTestComplete = hasCompletedPreTest();
  return {
    isLessonsPage,
    isSelfCheck,
    requiresPreTest: isExercisePage || isStandaloneLesson,
    requiresLessonsCompletion: isExercisePage,
    preTestComplete,
    lessonsComplete: hasCompletedLessonStep(),
    exercisesComplete: hasCompletedAllExercises()
  };
};

const currentRouteStatus = routeStatus(window.location.pathname);
const lockedStep = new URLSearchParams(window.location.search).get('locked');
const gateMessages = {
  pretest: 'Please complete the Pre-Test Evaluation first before accessing the lessons.',
  lessons: 'Please finish the Lessons first to unlock Exercises.',
  exercises: 'Please finish all Exercises first to unlock the Post-Test Evaluation.'
};
const showGateMessage = (message) => {
  const notice = document.createElement('div');
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.textContent = message;
  notice.style.cssText = 'position:fixed;left:50%;bottom:1.5rem;z-index:10000;max-width:min(34rem,calc(100vw - 2rem));transform:translateX(-50%);border-radius:.75rem;background:#173e36;padding:.9rem 1.2rem;color:#f8f4eb;box-shadow:0 10px 30px rgba(0,0,0,.2);font-size:.875rem;text-align:center;';
  document.body.append(notice);
};

if (lockedStep && gateMessages[lockedStep]) showGateMessage(gateMessages[lockedStep]);

if (currentRouteStatus.isSelfCheck && !currentRouteStatus.preTestComplete) {
  sessionStorage.setItem(INTERNAL_NAVIGATION_KEY, 'true');
  window.location.replace('/pages/lessons/?locked=pretest');
} else if (currentRouteStatus.isSelfCheck && !currentRouteStatus.lessonsComplete) {
  sessionStorage.setItem(INTERNAL_NAVIGATION_KEY, 'true');
  window.location.replace('/pages/lessons/?locked=lessons');
} else if (currentRouteStatus.isSelfCheck && !currentRouteStatus.exercisesComplete) {
  sessionStorage.setItem(INTERNAL_NAVIGATION_KEY, 'true');
  window.location.replace('/pages/drawing-exercise/exercises/?locked=exercises');
} else if (currentRouteStatus.requiresPreTest && !currentRouteStatus.preTestComplete) {
  sessionStorage.setItem(INTERNAL_NAVIGATION_KEY, 'true');
  window.location.replace('/pages/lessons/?locked=pretest');
} else if (currentRouteStatus.requiresLessonsCompletion && !currentRouteStatus.lessonsComplete) {
  sessionStorage.setItem(INTERNAL_NAVIGATION_KEY, 'true');
  window.location.replace('/pages/lessons/?locked=lessons');
}

document.querySelectorAll('header nav a[href]').forEach((link) => {
  const destination = new URL(link.href, window.location.href);
  if (destination.origin !== window.location.origin) return;
  const status = routeStatus(destination.pathname);
  if (status.isLessonsPage && !status.preTestComplete) link.textContent = 'Pre-Test/Lesson';
  if (status.isSelfCheck) link.textContent = 'Post-Test';
  const locked = (status.requiresPreTest && !status.preTestComplete)
    || (status.requiresLessonsCompletion && (!status.preTestComplete || !status.lessonsComplete))
    || (status.isSelfCheck && (!status.preTestComplete || !status.lessonsComplete || !status.exercisesComplete));
  if (!locked) return;
  link.setAttribute('aria-disabled', 'true');
  let lockReason;
  if (!status.preTestComplete) lockReason = gateMessages.pretest;
  else if (!status.lessonsComplete) lockReason = gateMessages.lessons;
  else lockReason = gateMessages.exercises;
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

const themeToggle = document.querySelector('[data-testid="button-theme-toggle"], #button-theme-toggle');
document.querySelectorAll("canvas[id$='-drawing-canvas']").forEach((canvas) => {
  canvas.style.cursor = `${mascotCursor}, crosshair`;
  canvas.style.touchAction = 'none';
});
const menuToggle = document.querySelector('[data-testid="button-mobile-menu"]');
const navigation = document.querySelector('nav');
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

  const isOpen = navigation.classList.toggle('!flex');
  navigation.classList.toggle('absolute', isOpen);
  navigation.classList.toggle('right-5', isOpen);
  navigation.classList.toggle('top-20', isOpen);
  navigation.classList.toggle('flex-col', isOpen);
  navigation.classList.toggle('bg-background', isOpen);
  navigation.classList.toggle('p-3', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    if (!menuToggle || !navigation || !navigation.classList.contains('!flex')) return;
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
