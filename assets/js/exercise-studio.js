const exerciseData = {
  form: {
    label: 'Form',
    levels: [
      { label: 'Level 1', trace: '/assets/exercises/form/level-1/trace.jpg', freehand: '/assets/exercises/form/level-1/freehand.jpg', reference: '/assets/exercises/form/level-1/reference.jpg' },
      { label: 'Level 2', trace: '/assets/exercises/form/level-2/trace.jpg', freehand: '/assets/exercises/form/level-2/freehand.jpg', reference: '/assets/exercises/form/level-2/reference.jpg' },
      { label: 'Level 3', trace: '/assets/exercises/form/level-3/trace.JPG', freehand: '/assets/exercises/form/level-3/freehand.png', reference: '/assets/exercises/form/level-3/reference.png' }
    ]
  },
  perspective: {
    label: 'Perspective',
    levels: [
      { label: '1 Point', trace: '/assets/exercises/perspective/level-1/trace.png', freehand: '/assets/exercises/perspective/level-1/freehand.png', reference: '/assets/exercises/perspective/level-1/reference.png' },
      { label: '2 Point', trace: '/assets/exercises/perspective/level-2/trace.png', freehand: '/assets/exercises/perspective/level-2/freehand.png', reference: '/assets/exercises/perspective/level-2/reference.png' },
      { label: '3 Point', trace: '/assets/exercises/perspective/level-3/trace.png', freehand: '/assets/exercises/perspective/level-3/freehand.png', reference: '/assets/exercises/perspective/level-3/reference.png' }
    ]
  },
  shadow: {
    label: 'Shadow',
    levels: [
      { label: 'Level 1', trace: '/assets/exercises/shadow/level-1/trace.png', freehand: '/assets/exercises/shadow/level-1/freehand.png', reference: '/assets/exercises/shadow/level-1/reference.png' },
      { label: 'Level 2', trace: '/assets/exercises/shadow/level-2/trace.png', freehand: '/assets/exercises/shadow/level-2/freehand.png', reference: '/assets/exercises/shadow/level-2/reference.png' },
      { label: 'Level 3', trace: '/assets/exercises/shadow/level-3/trace.png', freehand: '/assets/exercises/shadow/level-3/freehand.png', reference: '/assets/exercises/shadow/level-3/reference.png' }
    ]
  },
  depth: {
    label: 'Depth',
    levels: [
      { label: 'Level 1', trace: '/assets/exercises/depth/level-1/trace.png', freehand: '/assets/exercises/depth/level-1/freehand.png', reference: '/assets/exercises/depth/level-1/reference.png' },
      { label: 'Level 2', trace: '/assets/exercises/depth/level-2/trace.png', freehand: '/assets/exercises/depth/level-2/freehand.png', reference: '/assets/exercises/depth/level-2/reference.png' },
      { label: 'Level 3', trace: '/assets/exercises/depth/level-3/trace.png', freehand: '/assets/exercises/depth/level-3/freehand.png', reference: '/assets/exercises/depth/level-3/reference.png' }
    ]
  }
};

const subjectSelect = document.querySelector('#studio-subject');
const levelSelect = document.querySelector('#studio-level');
const opacityInput = document.querySelector('#studio-opacity');
const brushSizeInput = document.querySelector('#studio-brush-size');
const brushColorInput = document.querySelector('#studio-brush-color');
const drawingCanvas = document.querySelector('#studio-drawing-canvas');
const referenceCanvas = document.querySelector('#studio-reference-layer');
const differenceCanvas = document.querySelector('#studio-difference-layer');
const drawingContext = drawingCanvas?.getContext('2d');
const referenceContext = referenceCanvas?.getContext('2d');
const differenceContext = differenceCanvas?.getContext('2d');
const stepButtons = [...document.querySelectorAll('[data-studio-step]')];
const scoreOutput = document.querySelector('#studio-score');
const scoreMessage = document.querySelector('#studio-score-message');
const levelStatus = document.querySelector('#studio-level-status');
const checkButton = document.querySelector('#studio-check');
const undoButton = document.querySelector('#studio-undo');
const redoButton = document.querySelector('#studio-redo');
const eraserButton = document.querySelector('#studio-eraser');
const clearButton = document.querySelector('#studio-clear');
const splitInput = document.querySelector('#studio-split');
const topicProgress = document.querySelector('#studio-topic-progress');

const TRACE_THRESHOLD = 75;
const FREEHAND_THRESHOLD = 70;
const progressKey = 'drawflow-exercise-progress';
const topicOrder = ['form', 'perspective', 'shadow', 'depth'];

if (subjectSelect && levelSelect && drawingCanvas && referenceCanvas && differenceCanvas && drawingContext && referenceContext && differenceContext) {
  let currentStep = 'trace';
  let currentImages = null;
  let drawing = false;
  let erasing = false;
  let history = [];
  let historyIndex = -1;
  let tracePassed = false;
  let freehandPassed = false;
  let progress = JSON.parse(localStorage.getItem(progressKey) || '{}');

  const levelKey = () => `${subjectSelect.value}-${levelSelect.value}`;
  const topicComplete = (subject) => exerciseData[subject].levels.every((_, index) => progress[`${subject}-${index}`]?.freehand >= FREEHAND_THRESHOLD);
  const topicUnlocked = (subject) => {
    const topicIndex = topicOrder.indexOf(subject);
    return topicIndex === 0 || topicComplete(topicOrder[topicIndex - 1]);
  };
  const saveProgress = () => localStorage.setItem(progressKey, JSON.stringify(progress));

  const imageCache = new Map();

  const loadImage = (source) => {
    if (imageCache.has(source)) return imageCache.get(source);
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    const promise = new Promise((resolve, reject) => {
      image.addEventListener('load', () => resolve(image), { once: true });
      image.addEventListener('error', reject, { once: true });
    });
    imageCache.set(source, promise);
    return promise;
  };

  const setCanvasSize = (image) => {
    const size = Math.max(image.naturalWidth, image.naturalHeight, 640);
    [drawingCanvas, referenceCanvas].forEach((canvas) => {
      canvas.width = size;
      canvas.height = size;
    });
  };

  const drawCentered = (context, image) => {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    const scale = Math.min(context.canvas.width / image.naturalWidth, context.canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (context.canvas.width - width) / 2, (context.canvas.height - height) / 2, width, height);
  };

  const saveSnapshot = () => {
    history = history.slice(0, historyIndex + 1);
    history.push(drawingContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
    historyIndex = history.length - 1;
  };

  const restoreSnapshot = (snapshot) => drawingContext.putImageData(snapshot, 0, 0);

  const clearDrawing = () => {
    drawingContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    saveSnapshot();
  };

  const updateControls = () => {
    const traceButton = document.querySelector('[data-studio-step="trace"]');
    const freehandButton = document.querySelector('[data-studio-step="freehand"]');
    const compareButton = document.querySelector('[data-studio-step="compare"]');
    traceButton.classList.toggle('is-active', currentStep === 'trace');
    freehandButton.classList.toggle('is-active', currentStep === 'freehand');
    compareButton.classList.toggle('is-active', currentStep === 'compare');
    freehandButton.disabled = !tracePassed;
    compareButton.disabled = !freehandPassed;
    const traceMode = currentStep === 'trace';
    referenceCanvas.style.opacity = traceMode ? opacityInput.value : currentStep === 'compare' ? '.45' : '0';
    checkButton.textContent = currentStep === 'trace' ? 'Check trace accuracy' : currentStep === 'freehand' ? 'Check freehand accuracy' : 'Recheck accuracy';
    levelStatus.textContent = `${exerciseData[subjectSelect.value].label} / ${levelSelect.options[levelSelect.selectedIndex].textContent}`;
  };

  const setStep = (step) => {
    if (step === 'freehand' && !tracePassed) return;
    if (step === 'compare' && !freehandPassed) return;
    currentStep = step;
    const imageSource = step === 'trace' ? currentImages.trace : step === 'freehand' ? currentImages.freehand : currentImages.reference;
    loadImage(imageSource).then((image) => {
      drawCentered(referenceContext, image);
      referenceCanvas.style.opacity = step === 'trace' ? opacityInput.value : '0';
      scoreMessage.textContent = step === 'compare' ? 'Compare your drawing with the original reference.' : 'Draw over the guide, then check your work.';
      updateControls();
    });
  };

  const loadLevel = async () => {
    const level = exerciseData[subjectSelect.value].levels[Number(levelSelect.value)];
    currentImages = level;
    tracePassed = false;
    freehandPassed = false;
    currentStep = 'trace';
    scoreOutput.textContent = '--%';
    const traceImage = await loadImage(level.trace);
    setCanvasSize(traceImage);
    drawCentered(referenceContext, traceImage);
    clearDrawing();
    updateControls();
  };

  const populateSubjects = () => {
    Object.entries(exerciseData).forEach(([key, subject]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = subject.label;
      subjectSelect.append(option);
    });
  };

  const populateLevels = () => {
    levelSelect.replaceChildren();
    exerciseData[subjectSelect.value].levels.forEach((level, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = level.label;
      levelSelect.append(option);
    });
  };

  const getPoint = (event) => {
    const bounds = drawingCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * drawingCanvas.width / bounds.width,
      y: (event.clientY - bounds.top) * drawingCanvas.height / bounds.height
    };
  };

  const drawPoint = (event) => {
    const point = getPoint(event);
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
    drawingContext.lineWidth = Math.max(3, drawingCanvas.width / 180);
    drawingContext.strokeStyle = erasing ? '#ffffff' : '#173e36';
    drawingContext.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
    if (!drawing) drawingContext.moveTo(point.x, point.y);
    drawingContext.lineTo(point.x, point.y);
    drawingContext.stroke();
  };

  drawingCanvas.addEventListener('pointerdown', (event) => {
    drawing = true;
    drawingCanvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    drawingContext.beginPath();
    drawingContext.moveTo(point.x, point.y);
    drawPoint(event);
  });
  drawingCanvas.addEventListener('pointermove', (event) => { if (drawing) drawPoint(event); });
  drawingCanvas.addEventListener('pointerup', () => { if (!drawing) return; drawing = false; drawingContext.closePath(); drawingContext.globalCompositeOperation = 'source-over'; saveSnapshot(); });
  drawingCanvas.addEventListener('pointercancel', () => { drawing = false; drawingContext.globalCompositeOperation = 'source-over'; });

  const scoreDrawing = async () => {
    const referenceImage = await loadImage(currentImages.reference);
    const offscreen = document.createElement('canvas');
    offscreen.width = drawingCanvas.width;
    offscreen.height = drawingCanvas.height;
    const context = offscreen.getContext('2d');
    drawCentered(context, referenceImage);
    const referencePixels = context.getImageData(0, 0, offscreen.width, offscreen.height).data;
    const drawingPixels = drawingContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height).data;
    const radius = Math.max(3, Math.round(drawingCanvas.width / 160));
    let referenceCount = 0;
    let matchedReference = 0;
    let drawingCount = 0;
    let matchedDrawing = 0;
    const isInk = (pixels, index) => pixels[index + 3] > 30 && (pixels[index] + pixels[index + 1] + pixels[index + 2]) < 690;
    const hasInkNear = (pixels, x, y) => {
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const nearX = x + offsetX;
          const nearY = y + offsetY;
          if (nearX < 0 || nearY < 0 || nearX >= offscreen.width || nearY >= offscreen.height) continue;
          if (isInk(pixels, (nearY * offscreen.width + nearX) * 4)) return true;
        }
      }
      return false;
    };
    for (let y = 0; y < offscreen.height; y += 2) {
      for (let x = 0; x < offscreen.width; x += 2) {
        const index = (y * offscreen.width + x) * 4;
        if (isInk(referencePixels, index)) { referenceCount += 1; if (hasInkNear(drawingPixels, x, y)) matchedReference += 1; }
        if (isInk(drawingPixels, index)) { drawingCount += 1; if (hasInkNear(referencePixels, x, y)) matchedDrawing += 1; }
      }
    }
    const recall = referenceCount ? matchedReference / referenceCount : 0;
    const precision = drawingCount ? matchedDrawing / drawingCount : 0;
    const score = Math.round((recall * .65 + precision * .35) * 100);
    scoreOutput.textContent = `${score}%`;
    if (currentStep === 'trace' && score >= 70) { tracePassed = true; scoreMessage.textContent = 'Trace passed. Freehand practice is unlocked.'; }
    else if (currentStep === 'freehand' && score >= 70) { freehandPassed = true; scoreMessage.textContent = 'Level complete. Compare your work with the reference.'; }
    else if (score < 70) scoreMessage.textContent = 'Keep practicing. A score of 70% unlocks the next step.';
    updateControls();
  };

  subjectSelect.addEventListener('change', () => { populateLevels(); loadLevel(); });
  levelSelect.addEventListener('change', loadLevel);
  opacityInput.addEventListener('input', updateControls);
  stepButtons.forEach((button) => button.addEventListener('click', () => setStep(button.dataset.studioStep)));
  checkButton.addEventListener('click', scoreDrawing);
  undoButton.addEventListener('click', () => { if (historyIndex > 0) { historyIndex -= 1; restoreSnapshot(history[historyIndex]); } });
  redoButton.addEventListener('click', () => { if (historyIndex < history.length - 1) { historyIndex += 1; restoreSnapshot(history[historyIndex]); } });
  eraserButton.addEventListener('click', () => { erasing = !erasing; eraserButton.classList.toggle('primary', erasing); });
  clearButton.addEventListener('click', clearDrawing);
  populateSubjects();
  populateLevels();
  loadLevel();
}
