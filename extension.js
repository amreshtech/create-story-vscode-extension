// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const babel = require('@babel/core');
const ejs = require('ejs');
const path = require('path');
const jsx = require('@babel/plugin-transform-react-jsx');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.createStory', function () {
		// The code you place here will be executed every time your command is executed
		const file = vscode.window.activeTextEditor.document.fileName.toString();
		var booleanValues = [];
		var textValues = {};
		var filename = path.parse(file).name;
		var colorValues = {};
		var rangeValues = {};
		var props = {};

		const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1);
		const pascalCase = string => string.indexOf('-') ? string.split('-').map(item => capitalize(item)).join('') : string;
		const showToast = string => vscode.window.showInformationMessage(string);
		const extractValuesAndMerge = (source, destination) => {
			Object.keys(destination).forEach(item => {
				destination[item] = source[item];
			})
			return destination;
		};
		const writeToTemplate = (story = null) => {
			ejs.renderFile(path.join(__dirname, "storytemplate.ejs"), { componentName: pascalCase(filename), filename: filename, booleanValues: booleanValues, colorValues: colorValues, textValues: textValues, rangeValues: rangeValues }).then(output => {
				if (story && story === output) {
					showToast(`No changes detected in ${filename}.jsx! Exiting without updating ${filename}.stories.js`);
				} else {
					if(story !== null ) showToast(`Changes detected in ${filename}.jsx! ${filename}.stories.js updated successfully.`);
					fs.writeFile(`${path.dirname(file)}/${filename}.stories.js`, output, function (err) {
						if (err) { showToast(`Error writing ${filename}.stories.js`); throw err; }
						showToast(`${filename}.stories.js created successfully.`);
					})
				}
			});
		}
		const transferDefaultProps = () => {
			if (Object.entries(props).length > 0 && Object.entries(colorValues).length > 0) {
				extractValuesAndMerge(props, colorValues);
			}

			if (Object.entries(props).length > 0 && Object.entries(rangeValues).length > 0) {
				extractValuesAndMerge(props, rangeValues);
			}

			if (Object.entries(props).length > 0 && Object.entries(textValues).length > 0) {
				extractValuesAndMerge(props, textValues);
			}
			return;
		}
		const createStory = () => {
			return {
				visitor: {
					Identifier(path) {
						if (path.isIdentifier({ name: 'defaultProps' })) {
							path.parentPath.parentPath.node.right.properties.map(({ key: { name }, value: { value } }) => props[name] = value);
						}
						if (!path.parentPath.parentPath.isLogicalExpression() && path.parentPath.isMemberExpression() && path.isIdentifier({ name: 'props' }) && path.container.property.name.toLowerCase().indexOf('color') >= 0) {
							colorValues[path.container.property.name] = '';
						}
						if (!path.parentPath.parentPath.isLogicalExpression() && path.parentPath.isMemberExpression() && path.isIdentifier({ name: 'props' }) && path.container.property.name.toLowerCase().indexOf('color') === -1) {
							const templateElements = path.parentPath.parentPath.parentPath.node.quasis;
							const currentElementKey = path.parentPath.parentPath.key;
							if (templateElements[currentElementKey + 1].value.raw.indexOf('px') >= 0) {
								rangeValues[path.container.property.name] = '';
							}
						}
						if ((path.parentPath.parentPath.isLogicalExpression() || path.parentPath.parentPath.isConditionalExpression()) && path.parentPath.isMemberExpression() && path.isIdentifier({ name: 'props' })) {
							booleanValues.push(path.container.property.name);
						}
						if (path.parentPath.isJSXExpressionContainer() && !path.parentPath.parentPath.isJSXAttribute()) {
							textValues[path.node.name] = '';
						}
					}
				},
			}
		};

		fs.exists(`${path.dirname(file)}/${filename}.stories.js`, exists => {
			if (exists) {
				showToast(`${filename}.stories.js already exists, detecting changes...`);
				fs.readFile(`${path.dirname(file)}/${filename}.stories.js`, (err, story) => {
					if (err) { showToast(`Error reading ${filename}.stories.js`); throw err; }
					fs.readFile(file, function (err, code) {
						if (err) { showToast(`Error reading ${filename}.jsx`); throw err; }
						babel.transformSync(code.toString(), {
							plugins: [
								jsx,
								createStory(),
							],
						});

						transferDefaultProps();
						writeToTemplate(story.toString());
					});
				});
			} else {
				fs.readFile(file, function (err, code) {
					if (err) throw err;
					babel.transformSync(code.toString(), {
						plugins: [
							jsx,
							createStory(),
						],
					});

					transferDefaultProps();
					writeToTemplate();
				});
				// Display a message box to the user
				showToast('Story created!');
			}
		});
	});
	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
