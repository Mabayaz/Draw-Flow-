class CubeGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.strokes = [];
    this.currentStroke = [];
    this.isDrawing = false;
    this.score = Number(localStorage.getItem('drawflow-cube-score') || 0);
    this.promptFace = null;
    this.targetEdges = [];
    this.dpr = window.devicePixelRatio || 1;
    this.modal = document.getElementById('game-modal');
    this.nextButton = document.getElementById('btn-next-level');
    this.evaluateButton = document.getElementById('btn-evaluate');

    this.bindControls();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.canvas.addEventListener('pointerdown', (event) => this.startDraw(event));
    this.canvas.addEventListener('pointermove', (event) => this.draw(event));
    window.addEventListener('pointerup', () => this.endDraw());
    this.canvas.addEventListener('pointercancel', () => this.endDraw());
    this.generateNewPrompt();
    this.updateScore();
    this.render();
  }

  bindControls() {
    document.getElementById('btn-undo')?.addEventListener('click', () => {
      this.strokes.pop();
      this.setStatus(this.strokes.length ? 'Editing' : 'Ready');
      this.render();
    });
    document.getElementById('btn-clear')?.addEventListener('click', () => {
      this.strokes = [];
      this.setStatus('Ready');
      this.render();
    });
    document.getElementById('btn-reset-challenge')?.addEventListener('click', () => {
      this.strokes = [];
      this.generateNewPrompt();
      this.setStatus('New prompt');
      this.render();
    });
    document.getElementById('btn-evaluate')?.addEventListener('click', () => this.evaluate());
    this.nextButton?.addEventListener('click', () => {
      this.hideModal();
      this.strokes = [];
      this.generateNewPrompt();
      this.setStatus('New prompt');
      this.render();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.hideModal();
    });
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const previousWidth = this.width;
    const previousHeight = this.height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    if (!previousWidth || !previousHeight || !this.promptFace) this.generateNewPrompt(false);
    else this.scaleGeometry(previousWidth, previousHeight, this.width, this.height);
    this.render();
  }

  scalePoint(point, scaleX, scaleY) {
    return { x: point.x * scaleX, y: point.y * scaleY };
  }

  scaleGeometry(previousWidth, previousHeight, nextWidth, nextHeight) {
    const scaleX = nextWidth / previousWidth;
    const scaleY = nextHeight / previousHeight;
    this.promptFace = this.promptFace.map((point) => this.scalePoint(point, scaleX, scaleY));
    this.vanishingPoint = this.scalePoint(this.vanishingPoint, scaleX, scaleY);
    this.targetEdges = this.targetEdges.map((edge) => ({
      start: this.scalePoint(edge.start, scaleX, scaleY),
      end: this.scalePoint(edge.end, scaleX, scaleY),
    }));
    this.strokes = this.strokes.map((stroke) => stroke.map((point) => this.scalePoint(point, scaleX, scaleY)));
    this.currentStroke = this.currentStroke.map((point) => this.scalePoint(point, scaleX, scaleY));
  }

  getPos(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  startDraw(event) {
    if (this.modal && !this.modal.classList.contains('hidden')) return;
    event.preventDefault();
    this.canvas.setPointerCapture?.(event.pointerId);
    this.isDrawing = true;
    this.currentStroke = [this.getPos(event)];
    this.setStatus('Drawing');
  }

  draw(event) {
    if (!this.isDrawing) return;
    this.currentStroke.push(this.getPos(event));
    this.render();
  }

  endDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentStroke.length > 1) this.strokes.push(this.currentStroke);
    this.currentStroke = [];
    this.setStatus(this.strokes.length ? 'Editing' : 'Ready');
    this.render();
  }

  generateNewPrompt(randomize = true) {
    const width = this.width || 700;
    const height = this.height || 525;
    const shiftX = randomize ? (Math.random() - .5) * width * .12 : 0;
    const shiftY = randomize ? (Math.random() - .5) * height * .08 : 0;
    const scale = Math.min(width / 700, height / 525);
    const x = width * .33 + shiftX;
    const y = height * .42 + shiftY;
    const faceWidth = 150 * scale;
    const faceHeight = 120 * scale;
    this.promptFace = [{ x, y }, { x: x + faceWidth, y: y - faceHeight * .22 }, { x: x + faceWidth, y: y + faceHeight }, { x, y: y + faceHeight * 1.12 }];
    const vanishing = { x: width * (.78 + (randomize ? (Math.random() - .5) * .08 : 0)), y: height * (.38 + (randomize ? (Math.random() - .5) * .08 : 0)) };
    this.vanishingPoint = vanishing;
    this.targetEdges = this.promptFace.map((point) => ({ start: point, end: { x: point.x + (vanishing.x - point.x) * .24, y: point.y + (vanishing.y - point.y) * .24 } }));
  }

  evaluate() {
    if (!this.strokes.length) {
      this.setStatus('Draw a line first');
      return;
    }
    const accuracy = this.calculateAccuracy();
    this.score += accuracy;
    localStorage.setItem('drawflow-cube-score', String(this.score));
    this.updateScore();
    document.getElementById('hud-status').textContent = 'Evaluated';
    document.getElementById('modal-score').textContent = `${accuracy}% accuracy`;
    document.getElementById('modal-desc').textContent = accuracy > 85 ? 'Strong construction. Your edges are tracking toward a coherent vanishing point.' : 'Good attempt. Compare your stroke direction with the guide lines and try another prompt.';
    this.modal?.classList.remove('hidden');
    this.modal?.classList.add('flex');
    this.nextButton?.focus();
  }

  hideModal() {
    this.modal?.classList.add('hidden');
    this.modal?.classList.remove('flex');
    this.evaluateButton?.focus();
  }

  calculateAccuracy() {
    const userLines = this.strokes.map((stroke) => ({ start: stroke[0], end: stroke[stroke.length - 1] }));
    const target = this.targetEdges.map((edge) => ({ start: edge.start, end: edge.end }));
    const matched = target.reduce((total, edge) => total + Math.max(...userLines.map((line) => this.lineSimilarity(line, edge)), 0), 0) / target.length;
    return Math.round(Math.max(12, Math.min(98, 20 + matched * 78)));
  }

  lineSimilarity(first, second) {
    const firstAngle = Math.atan2(first.end.y - first.start.y, first.end.x - first.start.x);
    const secondAngle = Math.atan2(second.end.y - second.start.y, second.end.x - second.start.x);
    const angleScore = 1 - Math.min(Math.abs(Math.atan2(Math.sin(firstAngle - secondAngle), Math.cos(firstAngle - secondAngle))) / (Math.PI / 2), 1);
    const startDistance = this.distance(first.start, second.start);
    const diagonal = Math.hypot(this.width, this.height);
    return angleScore * Math.max(0, 1 - startDistance / (diagonal * .35));
  }

  distance(first, second) {
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  updateScore() {
    const scoreElement = document.getElementById('hud-score');
    if (scoreElement) scoreElement.textContent = `${this.score} pts`;
  }

  setStatus(status) {
    const statusElement = document.getElementById('hud-status');
    if (statusElement) statusElement.textContent = status;
  }

  drawLine(start, end, color, width, dash = []) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.setLineDash(dash);
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  render() {
    if (!this.width || !this.height) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg') || '#fffdf8';
    this.ctx.fillRect(0, 0, this.width, this.height);
    for (let x = 0; x < this.width; x += 40) this.drawLine({ x, y: 0 }, { x, y: this.height }, 'rgba(23, 62, 54, .07)', 1);
    for (let y = 0; y < this.height; y += 40) this.drawLine({ x: 0, y }, { x: this.width, y }, 'rgba(23, 62, 54, .07)', 1);
    this.drawLine({ x: 0, y: this.vanishingPoint.y }, { x: this.width, y: this.vanishingPoint.y }, 'rgba(232, 111, 69, .24)', 1, [7, 7]);
    this.targetEdges.forEach((edge) => this.drawLine(edge.start, edge.end, 'rgba(47, 137, 108, .32)', 1.5, [5, 5]));
    this.ctx.save();
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.promptFace.forEach((point, index) => index ? this.ctx.lineTo(point.x, point.y) : this.ctx.moveTo(point.x, point.y));
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();
    [...this.strokes, this.currentStroke].forEach((stroke) => {
      if (stroke.length < 2) return;
      this.ctx.save();
      this.ctx.strokeStyle = '#e86f45';
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      stroke.forEach((point, index) => index ? this.ctx.lineTo(point.x, point.y) : this.ctx.moveTo(point.x, point.y));
      this.ctx.stroke();
      this.ctx.restore();
    });
    this.ctx.fillStyle = '#e86f45';
    this.ctx.beginPath();
    this.ctx.arc(this.vanishingPoint.x, this.vanishingPoint.y, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

new CubeGame();
