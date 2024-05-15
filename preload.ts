/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { Titlebar, TitlebarColor } = require('custom-electron-titlebar')
const path = require('path')

window.addEventListener('DOMContentLoaded', () => {
  const options = {
    backgroundColor: TitlebarColor.fromHex('#6538b9'),
		menuTransparency: 0.2,
    titleHorizontalAlignment: 'center',
    removeMenuBar: true
		// icon: path.resolve('example/assets', 'logo.svg'),
		// icons: path.resolve('example/assets', 'icons.json'),
  };
	new Titlebar(options);
})