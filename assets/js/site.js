const root = document.documentElement;

if (window.location.pathname.endsWith('/index.html')) {
  const cleanPath = window.location.pathname.slice(0, -'index.html'.length) || '/';
  window.history.replaceState({}, document.title, `${cleanPath}${window.location.search}${window.location.hash}`);
}

const themeToggle = document.querySelector('[data-testid="button-theme-toggle"]');
const menuToggle = document.querySelector('[data-testid="button-mobile-menu"]');
const navigation = document.querySelector('nav');
const restartButton = document.querySelector('[data-testid="button-restart-progress"]');
const studyDialog = document.querySelector('#study-dialog');
const studyTitle = document.querySelector('#study-dialog-title');
const studyDescription = document.querySelector('#study-dialog-description');
const closeDialogButton = document.querySelector('[data-close-dialog]');
const startStudyButton = document.querySelector('[data-start-study]');
const videoPlayer = document.querySelector('[data-video-player]');
const videoSpeed = document.querySelector('[data-video-speed]');
const videoQuality = document.querySelector('[data-video-quality]');
const videoFullscreen = document.querySelector('[data-video-fullscreen]');

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
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to day mode' : 'Switch to night mode');
});

if (themeToggle) {
  themeToggle.setAttribute('aria-label', root.classList.contains('dark-mode') ? 'Switch to day mode' : 'Switch to night mode');
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
