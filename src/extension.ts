"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext } from "vscode";

import RedttProvider from "./diagnostics";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  let provider: RedttProvider = new RedttProvider();
  context.subscriptions.push(provider);
}

// this method is called when your extension is deactivated
export function deactivate() {}
