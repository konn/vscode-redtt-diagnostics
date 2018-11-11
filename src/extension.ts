"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, extensions } from "vscode";
import RedttProvider from "./diagnostics";

const REDTT_IM_NAME = "mr-konn.redtt-dignostics.im";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  const gim = extensions.getExtension("mr-konn.generic-input-method");
  if (gim) {
    console.log(`${gim.extensionPath}/types/api.d.ts`);
    const api: any = await gim.activate();
    const im: any = {
      name: REDTT_IM_NAME,
      languages: ["redtt"],
      triggers: ["\\"],
      dictionary: ["defaults/math.json", { label: "to", body: "→" }]
    };
    api.registerInputMethod(im);
  } else {
  }
  let provider: RedttProvider = new RedttProvider();
  context.subscriptions.push(provider);
}

// this method is called when your extension is deactivated
export function deactivate() {
  let gim = extensions.getExtension("mr-konn.generic-input-method");
  if (gim) {
    const api = gim.exports;
    api.unregisterInputMethodByName(REDTT_IM_NAME);
  }
}
