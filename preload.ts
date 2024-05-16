/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
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

function rgbToHex(rgbString) {
  // Extract the numbers from the RGB string
  const matches = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  
  // Ensure the RGB string format is correct
  if (!matches) {
      throw new Error('Invalid RGB string format');
  }

  // Parse the numbers
  const r = parseInt(matches[1]);
  const g = parseInt(matches[2]);
  const b = parseInt(matches[3]);

  // Convert the numbers to hexadecimal
  const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

  return hex.toUpperCase(); // Optionally convert to uppercase
}

window.addEventListener('DOMContentLoaded', () => {
  const options = {
    backgroundColor: TitlebarColor.fromHex(rgbToHex(getTitlebarColor(loadStoredTheme()))),
		menuTransparency: 0.2,
    titleHorizontalAlignment: 'center',
    removeMenuBar: true
		// icon: path.resolve('example/assets', 'logo.svg'),
		// icons: path.resolve('example/assets', 'icons.json'),
  };
	new Titlebar(options);
})