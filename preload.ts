/**
 * The preload script runs before the renderer. It has access to web APIs
 * and Electron renderer process modules.
 * Theme colors here must stay in sync with src/constants/index.ts (TITLEBAR_COLORS).
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { Titlebar, TitlebarColor } = require('custom-electron-titlebar')
const path = require('path')

function loadStoredTheme() {
  const storedTheme = localStorage.getItem('theme');
  const theme = storedTheme ? storedTheme : 'dark';
  return theme;
}

function getTitlebarColor(theme) {
  switch (theme) {
    case 'dark':
      return 'rgb(25, 28, 32)';
    case 'light':
      return 'rgb(31, 36, 47)';
    case 'aqua':
      return 'rgb(53, 72, 136)';
    case 'cupcake':
      return '#6538b9';
    case 'dracula':
      return 'rgb(33, 33, 42)';
    case 'forest':
      return 'rgb(19, 17, 17)';
    case 'night':
      return 'rgb(17, 20, 32)';
    case 'synthwave':
      return 'rgb(16, 11, 41)';
    case 'winter':
      return 'rgb(56, 68, 93)';
    default:
      return 'rgb(25, 28, 32)'; // Return an empty string or any default color if theme doesn't match
  }
}

/**
 * Converts a color string to hex for TitlebarColor.fromHex.
 * Accepts "rgb(r, g, b)" or "#rrggbb" / "#rgb" (e.g. cupcake theme).
 */
function colorToHex(colorString) {
  const trimmed = (colorString || '').trim();
  const hexMatch = trimmed.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return '#' + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return '#' + hex;
  }
  const rgbMatch = trimmed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }
  return '#191C20';
}

window.addEventListener('DOMContentLoaded', () => {
  const options = {
    backgroundColor: TitlebarColor.fromHex(colorToHex(getTitlebarColor(loadStoredTheme()))),
		menuTransparency: 0.2,
    titleHorizontalAlignment: 'center',
    removeMenuBar: true
		// icon: path.resolve('example/assets', 'logo.svg'),
		// icons: path.resolve('example/assets', 'icons.json'),
  };
	new Titlebar(options);
})