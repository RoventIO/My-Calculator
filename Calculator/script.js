/**
 * ProCalc — Professional Web Calculator
 * Implements full arithmetic calculation, live preview, accurate decimal precision,
 * calculation history, synthetic audio feedback, and responsive keyboard controls.
 */

(() => {
  'use strict';

  // --- DOM Elements ---
  const primaryDisplay = document.getElementById('primaryDisplay');
  const expressionDisplay = document.getElementById('expressionDisplay');
  const livePreview = document.getElementById('livePreview');
  const keyAC = document.getElementById('keyAC');
  const copyBtn = document.getElementById('copyBtn');
  const copyTooltip = document.getElementById('copyTooltip');
  const themeToggle = document.getElementById('themeToggle');
  const soundToggle = document.getElementById('soundToggle');
  const historyToggle = document.getElementById('historyToggle');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyDrawer = document.getElementById('historyDrawer');
  const historyList = document.getElementById('historyList');
  const keypad = document.querySelector('.keypad');

  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');
  const soundOnIcon = soundToggle.querySelector('.sound-on-icon');
  const soundOffIcon = soundToggle.querySelector('.sound-off-icon');

  // --- Calculator State ---
  let currentInput = '0';
  let previousInput = null;
  let activeOperator = null;
  let shouldResetInput = false;
  let calculationJustCompleted = false;
  let history = [];
  let isSoundEnabled = true;

  // --- Audio Synthesizer (Web Audio API) ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtxClass();
    }
  }

  function playTone(freq = 440, type = 'sine', duration = 0.035, gainValue = 0.05) {
    if (!isSoundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainValue, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio might be blocked by browser policy prior to gesture
    }
  }

  const soundFx = {
    number: () => playTone(360, 'sine', 0.03, 0.04),
    operator: () => playTone(540, 'triangle', 0.045, 0.06),
    equals: () => playTone(720, 'sine', 0.06, 0.08),
    clear: () => playTone(240, 'sine', 0.04, 0.05),
    error: () => playTone(160, 'sawtooth', 0.1, 0.06),
  };

  // --- Precision Math Helpers ---
  function safeEvaluate(a, op, b) {
    const numA = Number(a);
    const numB = Number(b);

    if (isNaN(numA) || isNaN(numB)) return 0;

    let result = 0;
    switch (op) {
      case '+':
        result = numA + numB;
        break;
      case '−':
      case '-':
        result = numA - numB;
        break;
      case '×':
      case '*':
        result = numA * numB;
        break;
      case '÷':
      case '/':
        if (numB === 0) return 'Cannot divide by 0';
        result = numA / numB;
        break;
      default:
        return numB;
    }

    // Eliminate floating-point inaccuracies like 0.1 + 0.2 = 0.30000000000000004
    return formatPrecision(result);
  }

  function formatPrecision(num) {
    if (typeof num === 'string') return num;
    if (!isFinite(num)) return 'Error';

    // Round to 12 decimal places to catch floating artifacts while retaining precision
    const factor = Math.pow(10, 12);
    const rounded = Math.round((num + Number.EPSILON) * factor) / factor;

    // Convert to string and handle exponential notation if extreme
    if (Math.abs(rounded) > 1e14 || (Math.abs(rounded) < 1e-7 && rounded !== 0)) {
      return rounded.toExponential(6).replace(/\+/, '');
    }

    return String(rounded);
  }

  function formatDisplayNumber(strVal) {
    if (strVal === 'Error' || strVal === 'Cannot divide by 0') return strVal;
    if (strVal.includes('e')) return strVal;

    const parts = strVal.split('.');
    let intPart = parts[0];
    const decPart = parts.length > 1 ? '.' + parts[1] : '';

    // Format integer portion with commas
    const isNegative = intPart.startsWith('-');
    if (isNegative) intPart = intPart.slice(1);

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (isNegative ? '-' : '') + formattedInt + decPart;
  }

  // --- Display Updates & Auto-scaling ---
  function updateDisplay() {
    primaryDisplay.textContent = formatDisplayNumber(currentInput);

    // Auto-adjust font size to avoid visual overflow
    const length = currentInput.length;
    if (length > 15) {
      primaryDisplay.style.fontSize = '1.35rem';
    } else if (length > 11) {
      primaryDisplay.style.fontSize = '1.8rem';
    } else if (length > 8) {
      primaryDisplay.style.fontSize = '2.25rem';
    } else {
      primaryDisplay.style.fontSize = '';
    }

    // Expression line
    if (previousInput !== null && activeOperator !== null) {
      expressionDisplay.textContent = `${formatDisplayNumber(previousInput)} ${activeOperator}`;
      updateLivePreview();
    } else {
      expressionDisplay.innerHTML = '&nbsp;';
      livePreview.textContent = '';
    }

    // Update AC button label (C when typing, AC when zero)
    if (currentInput !== '0' || previousInput !== null) {
      keyAC.textContent = 'C';
    } else {
      keyAC.textContent = 'AC';
    }

    // Active operator button styling
    document.querySelectorAll('.key-op').forEach(btn => {
      if (btn.dataset.op === activeOperator) {
        btn.classList.add('active-op');
      } else {
        btn.classList.remove('active-op');
      }
    });
  }

  function updateLivePreview() {
    if (previousInput !== null && activeOperator !== null && !shouldResetInput) {
      const tempRes = safeEvaluate(previousInput, activeOperator, currentInput);
      if (typeof tempRes === 'number' || (!isNaN(Number(tempRes)) && tempRes !== 'Error')) {
        livePreview.textContent = `= ${formatDisplayNumber(String(tempRes))}`;
        return;
      }
    }
    livePreview.textContent = '';
  }

  // --- Core Calculator Actions ---
  function inputDigit(digit) {
    soundFx.number();

    if (currentInput === 'Cannot divide by 0' || currentInput === 'Error') {
      currentInput = digit;
      shouldResetInput = false;
      calculationJustCompleted = false;
      updateDisplay();
      return;
    }

    if (shouldResetInput || calculationJustCompleted) {
      currentInput = digit;
      shouldResetInput = false;
      calculationJustCompleted = false;
    } else {
      if (currentInput === '0') {
        currentInput = digit;
      } else {
        // Prevent exceeding sensible length
        if (currentInput.replace(/[.-]/g, '').length >= 15) return;
        currentInput += digit;
      }
    }
    updateDisplay();
  }

  function inputDecimal() {
    soundFx.number();

    if (currentInput === 'Cannot divide by 0' || currentInput === 'Error' || calculationJustCompleted) {
      currentInput = '0.';
      shouldResetInput = false;
      calculationJustCompleted = false;
      updateDisplay();
      return;
    }

    if (shouldResetInput) {
      currentInput = '0.';
      shouldResetInput = false;
      updateDisplay();
      return;
    }

    if (!currentInput.includes('.')) {
      currentInput += '.';
      updateDisplay();
    }
  }

  function handleOperator(nextOp) {
    soundFx.operator();

    if (currentInput === 'Cannot divide by 0' || currentInput === 'Error') {
      clearAll();
      return;
    }

    if (previousInput !== null && activeOperator !== null && !shouldResetInput) {
      const result = safeEvaluate(previousInput, activeOperator, currentInput);
      if (result === 'Cannot divide by 0' || result === 'Error') {
        currentInput = result;
        previousInput = null;
        activeOperator = null;
        soundFx.error();
        updateDisplay();
        return;
      }
      currentInput = String(result);
      previousInput = String(result);
    } else {
      previousInput = currentInput;
    }

    activeOperator = nextOp;
    shouldResetInput = true;
    calculationJustCompleted = false;
    updateDisplay();
  }

  function calculate() {
    if (activeOperator === null || previousInput === null) {
      soundFx.equals();
      return;
    }

    if (currentInput === 'Cannot divide by 0' || currentInput === 'Error') {
      clearAll();
      return;
    }

    const opA = previousInput;
    const opB = currentInput;
    const op = activeOperator;
    const result = safeEvaluate(opA, op, opB);

    if (result === 'Cannot divide by 0' || result === 'Error') {
      soundFx.error();
      currentInput = result;
      previousInput = null;
      activeOperator = null;
      shouldResetInput = true;
      updateDisplay();
      return;
    }

    soundFx.equals();
    const formattedResult = String(result);
    expressionDisplay.textContent = `${formatDisplayNumber(opA)} ${op} ${formatDisplayNumber(opB)} =`;

    // Add to history
    addHistoryItem(`${formatDisplayNumber(opA)} ${op} ${formatDisplayNumber(opB)}`, formattedResult);

    currentInput = formattedResult;
    previousInput = null;
    activeOperator = null;
    shouldResetInput = true;
    calculationJustCompleted = true;
    livePreview.textContent = '';

    updateDisplay();
  }

  function handlePercentage() {
    soundFx.operator();
    if (currentInput === 'Cannot divide by 0' || currentInput === 'Error') return;

    const val = Number(currentInput);
    if (isNaN(val)) return;

    if (previousInput !== null && (activeOperator === '+' || activeOperator === '−' || activeOperator === '-')) {
      // 100 + 10% => 10% of 100 is 10
      const base = Number(previousInput);
      const percentVal = (base * val) / 100;
      currentInput = formatPrecision(percentVal);
    } else {
      // Direct percentage: 50% => 0.5
      currentInput = formatPrecision(val / 100);
    }

    updateDisplay();
  }

  function handleNegate() {
    soundFx.number();
    if (currentInput === 'Cannot divide by 0' || currentInput === 'Error') return;
    if (currentInput === '0') return;

    if (currentInput.startsWith('-')) {
      currentInput = currentInput.slice(1);
    } else {
      currentInput = '-' + currentInput;
    }
    updateDisplay();
  }

  function handleDelete() {
    soundFx.clear();
    if (calculationJustCompleted || shouldResetInput) {
      return;
    }

    if (currentInput === 'Cannot divide by 0' || currentInput === 'Error') {
      clearAll();
      return;
    }

    if (currentInput.length > 1) {
      currentInput = currentInput.slice(0, -1);
      if (currentInput === '-' || currentInput === '-0') currentInput = '0';
    } else {
      currentInput = '0';
    }
    updateDisplay();
  }

  function handleClear() {
    soundFx.clear();
    if (keyAC.textContent === 'C') {
      currentInput = '0';
      shouldResetInput = false;
      updateDisplay();
    } else {
      clearAll();
    }
  }

  function clearAll() {
    currentInput = '0';
    previousInput = null;
    activeOperator = null;
    shouldResetInput = false;
    calculationJustCompleted = false;
    livePreview.textContent = '';
    updateDisplay();
  }

  // --- History Management ---
  function loadHistory() {
    try {
      const saved = localStorage.getItem('procalc_history');
      if (saved) {
        history = JSON.parse(saved);
        renderHistory();
      }
    } catch {
      history = [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem('procalc_history', JSON.stringify(history));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  function addHistoryItem(expression, result) {
    history.unshift({ expression, result, timestamp: Date.now() });
    if (history.length > 30) history.pop();
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>No calculations yet</p>
        </div>`;
      return;
    }

    historyList.innerHTML = history.map((item, index) => `
      <div class="history-item" data-index="${index}" tabindex="0" role="button" aria-label="Use result ${item.result}">
        <span class="history-expression">${item.expression} =</span>
        <span class="history-result">${formatDisplayNumber(item.result)}</span>
      </div>
    `).join('');

    // Attach click listeners to history items
    historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.index);
        const selected = history[idx];
        if (selected) {
          currentInput = selected.result;
          previousInput = null;
          activeOperator = null;
          shouldResetInput = true;
          calculationJustCompleted = true;
          updateDisplay();
          toggleHistoryDrawer(false);
          soundFx.equals();
        }
      });
    });
  }

  function clearHistory() {
    soundFx.clear();
    history = [];
    saveHistory();
    renderHistory();
  }

  function toggleHistoryDrawer(forceState) {
    const isOpen = typeof forceState === 'boolean' ? forceState : !historyDrawer.classList.contains('open');
    historyDrawer.classList.toggle('open', isOpen);
    historyDrawer.setAttribute('aria-hidden', String(!isOpen));
  }

  // --- Copy to Clipboard ---
  async function copyResult() {
    try {
      await navigator.clipboard.writeText(currentInput);
      copyTooltip.classList.add('show');
      soundFx.operator();
      setTimeout(() => copyTooltip.classList.remove('show'), 1600);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = currentInput;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyTooltip.classList.add('show');
      setTimeout(() => copyTooltip.classList.remove('show'), 1600);
    }
  }

  // --- Theme Toggle ---
  function initTheme() {
    const savedTheme = localStorage.getItem('procalc_theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    if (theme === 'light') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
    try {
      localStorage.setItem('procalc_theme', theme);
    } catch {}
  }

  function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    soundFx.operator();
  }

  // --- Sound Toggle ---
  function initSound() {
    const saved = localStorage.getItem('procalc_sound');
    if (saved !== null) {
      isSoundEnabled = saved === 'true';
    }
    updateSoundUI();
  }

  function updateSoundUI() {
    if (isSoundEnabled) {
      soundOnIcon.style.display = 'block';
      soundOffIcon.style.display = 'none';
      soundToggle.setAttribute('title', 'Sound: On (Click to mute)');
    } else {
      soundOnIcon.style.display = 'none';
      soundOffIcon.style.display = 'block';
      soundToggle.setAttribute('title', 'Sound: Muted (Click to unmute)');
    }
  }

  function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    updateSoundUI();
    try {
      localStorage.setItem('procalc_sound', String(isSoundEnabled));
    } catch {}
    if (isSoundEnabled) {
      soundFx.operator();
    }
  }

  // --- Keypad Button Click Handlers ---
  keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.num !== undefined) {
      inputDigit(btn.dataset.num);
    } else if (btn.dataset.action) {
      switch (btn.dataset.action) {
        case 'operator':
          handleOperator(btn.dataset.op);
          break;
        case 'calculate':
          calculate();
          break;
        case 'decimal':
          inputDecimal();
          break;
        case 'negate':
          handleNegate();
          break;
        case 'percent':
          handlePercentage();
          break;
        case 'delete':
          handleDelete();
          break;
        case 'all-clear':
          handleClear();
          break;
      }
    }
  });

  // --- Keyboard Event Handling & Animation ---
  function flashKey(selector) {
    const key = document.querySelector(selector);
    if (key) {
      key.classList.add('pressed');
      setTimeout(() => key.classList.remove('pressed'), 120);
    }
  }

  window.addEventListener('keydown', (e) => {
    // Check if user is typing numbers or operators
    const key = e.key;

    if (key >= '0' && key <= '9') {
      e.preventDefault();
      inputDigit(key);
      flashKey(`[data-num="${key}"]`);
    } else if (key === '.') {
      e.preventDefault();
      inputDecimal();
      flashKey('[data-action="decimal"]');
    } else if (key === '+' || key === '-') {
      e.preventDefault();
      const op = key === '+' ? '+' : '−';
      handleOperator(op);
      flashKey(`[data-key="${key}"]`);
    } else if (key === '*' || key.toLowerCase() === 'x') {
      e.preventDefault();
      handleOperator('×');
      flashKey('[data-op="×"]');
    } else if (key === '/') {
      e.preventDefault();
      handleOperator('÷');
      flashKey('[data-op="÷"]');
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      calculate();
      flashKey('[data-action="calculate"]');
    } else if (key === 'Backspace') {
      e.preventDefault();
      handleDelete();
      flashKey('[data-action="delete"]');
    } else if (key === 'Escape' || key.toLowerCase() === 'c') {
      e.preventDefault();
      handleClear();
      flashKey('#keyAC');
    } else if (key === '%') {
      e.preventDefault();
      handlePercentage();
      flashKey('[data-action="percent"]');
    } else if (key.toLowerCase() === 'h') {
      // Shortcut for history
      e.preventDefault();
      toggleHistoryDrawer();
    }
  });

  // --- Attach Event Listeners ---
  themeToggle.addEventListener('click', toggleTheme);
  soundToggle.addEventListener('click', toggleSound);
  historyToggle.addEventListener('click', () => toggleHistoryDrawer());
  closeHistoryBtn.addEventListener('click', () => toggleHistoryDrawer(false));
  clearHistoryBtn.addEventListener('click', clearHistory);
  copyBtn.addEventListener('click', copyResult);

  // Close history drawer when clicking outside
  document.addEventListener('click', (e) => {
    if (
      historyDrawer.classList.contains('open') &&
      !historyDrawer.contains(e.target) &&
      !historyToggle.contains(e.target)
    ) {
      toggleHistoryDrawer(false);
    }
  });

  // --- Initialize App ---
  initTheme();
  initSound();
  loadHistory();
  updateDisplay();
})();
