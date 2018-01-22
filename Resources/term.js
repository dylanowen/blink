'use strict';

hterm.defaultStorage = new lib.Storage.Memory();

function _postMessage(op, data) {
  window.webkit.messageHandlers.interOp.postMessage({ op, data });
}

hterm.copySelectionToClipboard = function(document, content) {
  document.getSelection().removeAllRanges();
  _postMessage('copy', { content });
};

// Speedup a little bit.
hterm.Screen.prototype.syncSelectionCaret = function() {};

// Before we fully load hterm. We set options here.
var _prefs = new hterm.PreferenceManager('blink');
var t = { prefs_: _prefs }; // <- `t` will become actual hterm instance after decorate.

function term_set(key, value) {
  _prefs.set(key, value);
}

function term_get(key) {
  return _prefs.get(key);
}

function term_setupDefaults() {
  term_set('audible-bell-sound', '');
  term_set('receive-encoding', 'raw'); // we are UTF8
  term_set('allow-images-inline', true); // need to make it work
}

function term_setup() {
  t = new hterm.Terminal('blink');

  t.onTerminalReady = function() {
    t.io.onTerminalResize = function(cols, rows) {
      _postMessage('sigwinch', { cols, rows });
    };

    _postMessage('terminalReady', {
      cols: t.screenSize.width,
      rows: t.screenSize.height,
    });

    t.uninstallKeyboard();
  };

  t.decorate(document.getElementById('terminal'));
  term_blur();
}

function term_init() {
  term_setupDefaults();
  applyUserSettings();
  waitForFontFamily(term_setup);
}

function term_write(data) {
  t.interpret(data);
}

function term_clear() {
  t.clear();
}

function term_reset() {
  t.reset();
}

function term_focus() {
  t.onFocusChange_(true);
}

function term_blur() {
  t.onFocusChange_(false);
}

function term_setWidth(cols) {
  t.setWidth(cols);
}

function term_increaseFontSize() {
  var size = t.getFontSize();
  term_setFontSize(++size);
}

function term_decreaseFontSize() {
  var size = t.getFontSize();
  term_setFontSize(--size);
}

function term_resetFontSize() {
  term_setFontSize();
}

function term_scale(scale) {
  var minScale = 0.5;
  var maxScale = 2.0;
  scale = Math.max(minScale, Math.min(maxScale, scale));
  var fontSize = t.getFontSize()
  term_setFontSize(Math.round(fontSize * scale));
}

function term_setFontSize(size) {
  term_set('font-size', size);
  _postMessage('fontSizeChanged', { size: parseInt(size) });
}

function term_setCursorBlink(state) {
  term_set('cursor-blink', state);
}

function term_setFontFamily(name) {
  term_set('font-family', name + ', Menlo');
}

function term_appendUserCss(css) {
  var style = document.createElement('style');

  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));

  document.head.appendChild(style);
}

function term_loadFontFromCss(url, name) {
  WebFont.load({
    custom: {
      families: [name],
      urls: [url],
    },
    active: function() {
      t.syncFontFamily();
    },
  });
  term_setFontFamily(name);
}

function term_getCurrentSelection() {
  const selection = document.getSelection();
  if (!selection || document.rangeCount == 0) {
    return { base: '', offset: 0, text: '' };
  }

  return {
    base: selection.baseNode.textContent,
    offset: selection.baseOffset,
    text: selection.toString(),
  };
}

function term_cleanSelection() {
  document.getSelection().removeAllRanges();
}

function waitForFontFamily(callback) {
  const fontFamily = term_get('font-family');
  if (!fontFamily) {
    return callback();
  }

  const families = fontFamily.split(/\s*,\s*/);

  WebFont.load({
    custom: { families },
    active: callback,
    inactive: callback,
  });
}

function term_applySexyTheme(theme) {
  term_set('color-palette-overrides', theme.color);
  term_set('foreground-color', theme.foreground);
  term_set('background-color', theme.background);
}
