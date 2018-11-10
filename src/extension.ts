"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, window } from "vscode";

import RedttProvider from "./diagnostics";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "redtt-diagnosis" is now active!'
  );
  let provider: RedttProvider = new RedttProvider();
  context.subscriptions.push(provider);
}

export function onChange() {
  let editor = window.activeTextEditor;
  if (editor) {
    let document = editor.document;
    console.log(`Changed: ${document.uri}`);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
