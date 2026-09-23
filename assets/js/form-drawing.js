const formAssets = (level) => ({
  trace: `/assets/drawing-exercise/form/${level === 1 ? 'lvl-1' : `level-${level}`}/${level === 3 ? 'trace.JPG' : 'trace.jpg'}`,
  blank: `/assets/drawing-exercise/form/${level === 1 ? 'lvl-1' : `level-${level}`}/${level === 3 ? 'freehand.png' : 'freehand.jpg'}`,
  complete: `/assets/drawing-exercise/form/${level === 1 ? 'lvl-1' : `level-${level}`}/${level === 3 ? 'complete.png' : 'complete.jpg'}`
});

const formStateKey = 'drawflow-form-challenge';
const formProgress = JSON.parse(localStorage.getItem(formStateKey) || '{"unlocked":1,"levels":{}}');
const levelSelect = document.querySelector('#form-level');
const levelLabel = document.querySelector('#form-level-label');
const stageButtons = [...document.querySelectorAll('[data-form-stage]')];
const guideCanvas = document.querySelector('#form-guide-canvas');
const drawingCanvas = document.querySelector('#form-drawing-canvas');
const differenceCanvas = document.querySelector('#form-difference-canvas');
const guideContext = guideCanvas?.getContext('2d', { willReadFrequently: true });
const drawingContext = drawingCanvas?.getContext('2d', { willReadFrequently: true });
const differenceContext = differenceCanvas?.getContext('2d', { willReadFrequently: true });
const opacityInput = document.querySelector('#form-trace-opacity');
const brushSizeInput = document.querySelector('#form-brush-size');
const brushColorInput = document.querySelector('#form-brush-color');
const scoreOutput = document.querySelector('#form-score');
const messageOutput = document.querySelector('#form-message');
const progressOutput = document.querySelector('#form-progress');
const submitButton = document.querySelector('#form-submit');
const nextButton = document.querySelector('#form-next-level');
const splitInput = document.querySelector('#form-review-split');
const guideToggle = document.querySelector('#form-guide-toggle');
const rankOutput = document.querySelector('#form-rank');
const evaluationView = document.querySelector('#form-evaluation');
const formToolbar = document.querySelector('#form-toolbar');
const evaluationActions = document.querySelector('.challenge-actions');
const userEvaluationCanvas = document.querySelector('#form-user-evaluation');
const targetEvaluationCanvas = document.querySelector('#form-target-evaluation');
const evaluationDifferenceCanvas = document.querySelector('#form-evaluation-difference');
const evaluationSplitInput = document.querySelector('#form-evaluation-split');
const penButton = document.querySelector('#form-pen');
const eraserButton = document.querySelector('#form-eraser');
const peekButton = document.querySelector('#form-peek');
const coverageBar = document.querySelector('#form-coverage-bar');
const coverageLabel = document.querySelector('#form-coverage-label');
const peekTimer = document.querySelector('#form-peek-timer');

if (levelSelect && guideCanvas && drawingCanvas && differenceCanvas && guideContext && drawingContext && differenceContext) {
  let level = 1;
  let stage = 'trace';
  let erasing = false;
  let drawing = false;
  let history = [];
  let historyIndex = -1;
  let images = {};
  let tool = 'pen';
  let strokes = [];
  let activeStroke = null;
  let freehandFailed = false;
  let lastPoint = null;
  let tracePixels = null;
  let traceCoverage = 0;
  let guideVisible = true;
  let traceNodes = [];
  let peekUses = 3;
  let peekTimeout = null;
  let peekInterval = null;
  let traceImage = null;
  let blankImage = null;

  const cache = new Map();
  const loadImage = (source) => {
    if (cache.has(source)) return cache.get(source);
    const image = new Image();
    image.src = source;
    const promise = new Promise((resolve, reject) => {
      image.addEventListener('load', () => resolve(image), { once: true });
      image.addEventListener('error', reject, { once: true });
    });
    cache.set(source, promise);
    return promise;
  };

  const saveState = () => localStorage.setItem(formStateKey, JSON.stringify(formProgress));
  const levelRecord = () => formProgress.levels[level] || {};
  const completedCount = () => Object.values(formProgress.levels).filter((record) => record.freehand >= 70).length;
  const drawImage = (context, image) => {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    const scale = Math.min(context.canvas.width / image.naturalWidth, context.canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (context.canvas.width - width) / 2, (context.canvas.height - height) / 2, width, height);
  };

  const snapshot = () => {
    history = history.slice(0, historyIndex + 1);
    history.push(drawingContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
    historyIndex = history.length - 1;
  };
  const clearDrawing = () => { drawingContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height); snapshot(); };

  const buildTraceNodes = () => {
    const nodes = [];
    for (let y = 0; y < guideCanvas.height; y += 8) for (let x = 0; x < guideCanvas.width; x += 8) {
      const index = (y * guideCanvas.width + x) * 4;
      const red = tracePixels[index];
      if (red > 80 && red < 235 && Math.abs(red - tracePixels[index + 1]) < 8 && Math.abs(red - tracePixels[index + 2]) < 8) nodes.push({ x, y });
    }
    const stride = Math.max(1, Math.ceil(nodes.length / 32));
    return nodes.filter((_, index) => index % stride === 0).slice(0, 40);
  };

  const updateTraceCoverage = () => {
    if (!tracePixels) return;
    const width = drawingCanvas.width;
    const height = drawingCanvas.height;
    const drawingPixels = drawingContext.getImageData(0, 0, width, height).data;
    const radius = Math.max(4, Math.round(width / 150));
    if (traceNodes.length) {
      let covered = 0;
      traceNodes.forEach(({ x, y }) => {
        let hit = false;
        for (let offsetY = -radius; offsetY <= radius && !hit; offsetY += 1) for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const nearX = x + offsetX;
          const nearY = y + offsetY;
          if (nearX >= 0 && nearY >= 0 && nearX < width && nearY < height && drawingPixels[(nearY * width + nearX) * 4 + 3] > 30) { hit = true; break; }
        }
        if (hit) covered += 1;
      });
      traceCoverage = (covered / traceNodes.length) * 100;
      renderStage();
      return;
    }
    const isDashedGuide = (index) => {
      const red = tracePixels[index];
      const green = tracePixels[index + 1];
      const blue = tracePixels[index + 2];
      return red > 80 && red < 235 && Math.abs(red - green) < 8 && Math.abs(green - blue) < 8;
    };
    const hasUserInkNear = (x, y) => {
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const nearX = x + offsetX;
        const nearY = y + offsetY;
        if (nearX < 0 || nearY < 0 || nearX >= width || nearY >= height) continue;
        const index = (nearY * width + nearX) * 4;
        if (drawingPixels[(nearY * width + nearX) * 4 + 3] > 30) return true;
      }
      return false;
    };
    let guideCount = 0;
    let coveredCount = 0;
    for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) {
      const index = (y * width + x) * 4;
      if (isDashedGuide(index)) { guideCount += 1; if (hasUserInkNear(x, y)) coveredCount += 1; }
    }
    traceCoverage = guideCount ? (coveredCount / guideCount) * 100 : 0;
    renderStage();
  };

  const updateProgress = () => {
    progressOutput.textContent = `${completedCount()} / 3 levels`;
    [...levelSelect.options].forEach((option) => { option.disabled = Number(option.value) > formProgress.unlocked; });
  };

  const renderStage = () => {
    stageButtons.forEach((button) => {
      const name = button.dataset.formStage;
      button.classList.toggle('is-active', name === stage);
      button.disabled = name === 'freehand' ? stage === 'trace' : name === 'compare' ? !(levelRecord().freehand >= 70) : false;
    });
    guideCanvas.style.opacity = guideVisible ? (stage === 'trace' ? opacityInput.value : stage === 'compare' ? '1' : '.25') : '0';
    differenceCanvas.style.opacity = stage === 'compare' ? '1' : '0';
    formToolbar.hidden = stage === 'compare';
    document.querySelector('.canvas-wrap').hidden = stage === 'compare';
    evaluationActions.hidden = stage === 'compare';
    evaluationView.hidden = stage !== 'compare';
    submitButton.disabled = stage === 'trace' ? traceCoverage < 80 : stage === 'compare';
    submitButton.textContent = stage === 'trace' ? `Unlock Freehand Mode (${Math.round(traceCoverage)}%)` : stage === 'freehand' ? (freehandFailed ? 'Try Freehand Again' : 'Judge / Evaluate') : 'Evaluation Complete';
    nextButton.disabled = stage !== 'compare' || level >= 3 || formProgress.unlocked <= level;
    peekButton.hidden = stage !== 'freehand';
    peekButton.textContent = `💡 Peek Guide (${peekUses} Left)`;
    coverageBar.style.width = `${traceCoverage}%`;
    coverageLabel.textContent = `${Math.round(traceCoverage)}%`;
    messageOutput.textContent = stage === 'trace' ? `Trace at least 80% of the dashed guides to unlock freehand. Current: ${Math.round(traceCoverage)}%.` : stage === 'freehand' ? 'The guide is hidden. Draw the form from memory.' : 'Review the red marks and compare your drawing with the complete reference.';
    updateProgress();
  };

  const setCanvasSize = (image) => [guideCanvas, drawingCanvas, differenceCanvas].forEach((canvas) => { canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; });
  const renderEvaluation = (reference) => {
    if (!userEvaluationCanvas || !targetEvaluationCanvas || !evaluationDifferenceCanvas) return;
    [userEvaluationCanvas, targetEvaluationCanvas, evaluationDifferenceCanvas].forEach((canvas) => { canvas.width = drawingCanvas.width; canvas.height = drawingCanvas.height; });
    userEvaluationCanvas.getContext('2d').drawImage(drawingCanvas, 0, 0);
    drawImage(targetEvaluationCanvas.getContext('2d'), reference);
    evaluationDifferenceCanvas.getContext('2d').drawImage(differenceCanvas, 0, 0);
    const clip = `${100 - Number(evaluationSplitInput.value)}% 0 0`;
    targetEvaluationCanvas.style.clipPath = `inset(0 ${clip})`;
  };

  const loadLevel = async () => {
    level = Number(levelSelect.value);
    images = formAssets(level);
    const trace = await loadImage(images.trace);
    const blank = await loadImage(images.blank);
    const complete = await loadImage(images.complete);
    setCanvasSize(trace);
    drawImage(guideContext, trace);
    tracePixels = guideContext.getImageData(0, 0, guideCanvas.width, guideCanvas.height).data;
    traceNodes = buildTraceNodes();
    traceCoverage = 0;
    clearDrawing();
    strokes = [];
    freehandFailed = false;
    guideVisible = true;
    peekUses = 3;
    clearTimeout(peekTimeout);
    clearInterval(peekInterval);
    peekTimer.textContent = '';
    differenceContext.clearRect(0, 0, differenceCanvas.width, differenceCanvas.height);
    stage = 'trace';
    if (stage === 'freehand') drawImage(guideContext, blank);
    if (stage === 'compare') { drawImage(guideContext, complete); renderEvaluation(complete); }
    levelLabel.textContent = String(level);
    scoreOutput.textContent = '--%';
    renderStage();
  };

  const pointFor = (event) => {
    const bounds = drawingCanvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * drawingCanvas.width / bounds.width, y: (event.clientY - bounds.top) * drawingCanvas.height / bounds.height };
  };
  const drawPoint = (event) => {
    const point = pointFor(event);
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
    drawingContext.lineWidth = Number(brushSizeInput.value);
    drawingContext.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColorInput.value;
    drawingContext.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    if (lastPoint) {
      const midPoint = { x: (lastPoint.x + point.x) / 2, y: (lastPoint.y + point.y) / 2 };
      drawingContext.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
    } else {
      drawingContext.lineTo(point.x, point.y);
    }
    drawingContext.stroke();
    lastPoint = point;
  };
  drawingCanvas.addEventListener('pointerdown', (event) => { event.preventDefault(); drawing = true; drawingCanvas.setPointerCapture(event.pointerId); const point = pointFor(event); activeStroke = [{ ...point, tool }]; lastPoint = null; drawingContext.beginPath(); drawingContext.moveTo(point.x, point.y); drawPoint(event); });
  drawingCanvas.addEventListener('pointermove', (event) => { if (drawing) { const point = pointFor(event); activeStroke?.push({ ...point, tool }); drawPoint(event); } });
  drawingCanvas.addEventListener('pointerup', (event) => { event.preventDefault(); drawing = false; drawingContext.closePath(); drawingContext.globalCompositeOperation = 'source-over'; if (activeStroke?.length) strokes.push(activeStroke); activeStroke = null; lastPoint = null; snapshot(); if (stage === 'trace') updateTraceCoverage(); });
  drawingCanvas.addEventListener('pointercancel', () => { drawing = false; drawingContext.globalCompositeOperation = 'source-over'; activeStroke = null; lastPoint = null; });

  const scoreCanvas = async () => {
    const reference = await loadImage(images.complete);
    const referenceCanvasCopy = document.createElement('canvas');
    referenceCanvasCopy.width = drawingCanvas.width;
    referenceCanvasCopy.height = drawingCanvas.height;
    const referenceCopyContext = referenceCanvasCopy.getContext('2d', { willReadFrequently: true });
    drawImage(referenceCopyContext, reference);
    const referencePixels = referenceCopyContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height).data;
    const drawingPixels = drawingContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height).data;
    const radius = Math.max(3, Math.round(drawingCanvas.width / 160));
    const ink = (pixels, index) => pixels[index + 3] > 30 && pixels[index] + pixels[index + 1] + pixels[index + 2] < 690;
    const near = (pixels, x, y) => { for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) { const nx = x + dx; const ny = y + dy; if (nx >= 0 && ny >= 0 && nx < drawingCanvas.width && ny < drawingCanvas.height && ink(pixels, (ny * drawingCanvas.width + nx) * 4)) return true; } return false; };
    let expected = 0; let matched = 0; let drawn = 0; let aligned = 0;
    differenceContext.clearRect(0, 0, differenceCanvas.width, differenceCanvas.height);
    differenceContext.fillStyle = 'rgba(220, 60, 45, .78)';
    const split = Number(splitInput.value) / 100;
    for (let y = 0; y < drawingCanvas.height; y += 2) for (let x = 0; x < drawingCanvas.width; x += 2) { const index = (y * drawingCanvas.width + x) * 4; const expectedInk = ink(referencePixels, index); const drawnInk = ink(drawingPixels, index); if (expectedInk) { expected += 1; if (near(drawingPixels, x, y)) matched += 1; } if (drawnInk) { drawn += 1; if (near(referencePixels, x, y)) aligned += 1; } if ((expectedInk && !near(drawingPixels, x, y) && x / drawingCanvas.width <= split) || (drawnInk && !near(referencePixels, x, y) && x / drawingCanvas.width > split)) differenceContext.fillRect(x, y, 4, 4); }
    const score = Math.round(((expected ? matched / expected : 0) * .65 + (drawn ? aligned / drawn : 0) * .35) * 100);
    scoreOutput.textContent = `${score}%`;
    rankOutput.textContent = `Rank ${score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D'}`;
    if (stage === 'trace' && score >= 75) { formProgress.levels[level] = { ...(levelRecord()), trace: score }; stage = 'freehand'; messageOutput.textContent = 'Trace passed. The guide is hidden; redraw the form from memory.'; }
    else if (stage === 'freehand' && score >= 70) { formProgress.levels[level] = { ...(levelRecord()), freehand: score }; formProgress.unlocked = Math.max(formProgress.unlocked, Math.min(3, level + 1)); stage = 'compare'; messageOutput.textContent = 'Level passed. Review your result, then continue to the next level.'; }
    else if (stage === 'trace') messageOutput.textContent = 'Proceed to freehand when you have completed the guided trace.';
    else if (stage === 'freehand') { freehandFailed = true; messageOutput.textContent = 'Freehand accuracy needs to reach 70%. Try the freehand stage again.'; }
    saveState();
    if (stage === 'freehand') drawImage(guideContext, await loadImage(images.blank));
    if (stage === 'compare') { drawImage(guideContext, reference); renderEvaluation(reference); }
    renderStage();
  };

  const drawStudyGuides = () => {
    differenceContext.clearRect(0, 0, differenceCanvas.width, differenceCanvas.height);
    differenceContext.strokeStyle = 'rgba(47, 137, 108, .7)';
    differenceContext.fillStyle = '#e86f45';
    differenceContext.lineWidth = Math.max(2, differenceCanvas.width / 320);
    const center = differenceCanvas.width / 2;
    differenceContext.beginPath();
    differenceContext.moveTo(center, differenceCanvas.height * .08);
    differenceContext.lineTo(center, differenceCanvas.height * .92);
    differenceContext.moveTo(differenceCanvas.width * .08, center);
    differenceContext.lineTo(differenceCanvas.width * .92, center);
    differenceContext.stroke();
    [[differenceCanvas.width * .08, center], [differenceCanvas.width * .92, center], [center, differenceCanvas.height * .08]].forEach(([x, y]) => { differenceContext.beginPath(); differenceContext.arc(x, y, differenceCanvas.width / 45, 0, Math.PI * 2); differenceContext.fill(); });
  };

  const replayStrokes = () => {
    if (!strokes.length) return;
    drawingContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    let strokeIndex = 0;
    let pointIndex = 0;
    const tick = () => {
      const stroke = strokes[strokeIndex];
      if (!stroke) return;
      const point = stroke[pointIndex];
      drawingContext.globalCompositeOperation = point.tool === 'eraser' ? 'destination-out' : 'source-over';
      drawingContext.strokeStyle = point.tool === 'eraser' ? '#ffffff' : brushColorInput.value;
      drawingContext.lineWidth = Number(brushSizeInput.value);
      drawingContext.lineCap = 'round';
      if (pointIndex === 0) { drawingContext.beginPath(); drawingContext.moveTo(point.x, point.y); } else { drawingContext.lineTo(point.x, point.y); drawingContext.stroke(); }
      pointIndex += 1;
      if (pointIndex >= stroke.length) { drawingContext.closePath(); strokeIndex += 1; pointIndex = 0; }
      if (strokeIndex < strokes.length) requestAnimationFrame(tick);
      else drawingContext.globalCompositeOperation = 'source-over';
    };
    tick();
  };

  const startPeek = async () => {
    if (stage !== 'freehand' || peekUses <= 0) return;
    clearTimeout(peekTimeout);
    clearInterval(peekInterval);
    peekUses -= 1;
    guideVisible = true;
    drawImage(guideContext, await loadImage(images.trace));
    guideCanvas.style.opacity = '.4';
    let secondsLeft = 5;
    peekTimer.textContent = `${secondsLeft}s`;
    peekInterval = setInterval(() => { secondsLeft -= 1; peekTimer.textContent = secondsLeft > 0 ? `${secondsLeft}s` : ''; }, 1000);
    peekTimeout = setTimeout(async () => {
      clearInterval(peekInterval);
      guideVisible = false;
      drawImage(guideContext, await loadImage(images.blank));
      guideCanvas.style.opacity = '0';
      peekTimer.textContent = '';
      renderStage();
    }, 5000);
    renderStage();
  };

  stageButtons.forEach((button) => button.addEventListener('click', () => { if (!button.disabled) { stage = button.dataset.formStage; if (stage === 'freehand') loadImage(images.blank).then((image) => drawImage(guideContext, image)); if (stage === 'compare') loadImage(images.complete).then((image) => drawImage(guideContext, image)); renderStage(); } }));
  levelSelect.addEventListener('change', loadLevel);
  opacityInput.addEventListener('input', renderStage);
  guideToggle.addEventListener('click', () => { guideVisible = !guideVisible; guideToggle.textContent = guideVisible ? 'Guide On' : 'Guide Off'; guideToggle.classList.toggle('primary', guideVisible); renderStage(); });
  peekButton.addEventListener('click', startPeek);
  splitInput.addEventListener('input', () => { if (stage === 'compare') scoreCanvas(); });
  evaluationSplitInput.addEventListener('input', () => { if (stage === 'compare') loadImage(images.complete).then(renderEvaluation); });
  submitButton.addEventListener('click', async () => {
    if (stage === 'trace') {
      formProgress.levels[level] = { ...(levelRecord()), traceStrokes: strokes, traceReady: true };
      saveState();
      console.info(`Form Level ${level} trace saved and ready for freehand.`);
      stage = 'freehand';
      freehandFailed = false;
      guideVisible = false;
      clearDrawing();
      drawImage(guideContext, await loadImage(images.blank));
      renderStage();
      return;
    }
    if (freehandFailed) { freehandFailed = false; clearDrawing(); renderStage(); return; }
    scoreCanvas();
  });
  penButton.addEventListener('click', () => { tool = 'pen'; penButton.classList.add('primary'); eraserButton.classList.remove('primary'); });
  eraserButton.addEventListener('click', () => { tool = 'eraser'; eraserButton.classList.add('primary'); penButton.classList.remove('primary'); });
  document.querySelector('#form-clear').addEventListener('click', () => { clearDrawing(); if (stage === 'trace') updateTraceCoverage(); });
  document.querySelector('#form-undo').addEventListener('click', () => { if (historyIndex > 0) { historyIndex -= 1; drawingContext.putImageData(history[historyIndex], 0, 0); if (stage === 'trace') updateTraceCoverage(); } });
  document.querySelector('#form-redo').addEventListener('click', () => { if (historyIndex < history.length - 1) { historyIndex += 1; drawingContext.putImageData(history[historyIndex], 0, 0); if (stage === 'trace') updateTraceCoverage(); } });
  document.querySelector('#form-next-level').addEventListener('click', () => { if (level < 3 && formProgress.unlocked > level) { levelSelect.value = String(level + 1); loadLevel(); } });
  loadLevel();
}
