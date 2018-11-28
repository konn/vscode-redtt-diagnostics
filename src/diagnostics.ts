"use strict";

import * as proc from "child_process";

import {
  DiagnosticCollection,
  Disposable,
  languages,
  TextDocument,
  Diagnostic,
  workspace,
  DiagnosticSeverity,
  Range,
  Position
} from "vscode";

export default class RedttProvider implements Disposable {
  private collection: DiagnosticCollection;
  private redtt: string;
  private disposables: Disposable[];

  constructor() {
    let conf = workspace.getConfiguration();
    this.redtt = conf.get("redtt.executable", "redtt");
    let onChange = conf.get("redtt.diagnostics.onChange", false);
    this.disposables = [];
    this.collection = languages.createDiagnosticCollection();
    if (onChange) {
      workspace.onDidOpenTextDocument(this.checkRedtt, this);
    }
    workspace.onDidSaveTextDocument(this.checkRedtt, this);
    workspace.textDocuments.forEach(this.checkRedtt, this);
  }

  private checkRedtt(document: TextDocument) {
    if (document.languageId !== "redtt") {
      return;
    }

    let options = workspace.rootPath ? { cwd: workspace.rootPath } : undefined;
    let redtt = proc.spawn(
      this.redtt,
      ["load-file", document.fileName],
      options
    );
    let input = "";
    if (redtt.pid) {
      redtt.stdout.on("data", i => (input += i));
      redtt.stderr.on("data", i => (input += i));
      redtt.on("close", (code, _sig) => {
        const diagnostics: Diagnostic[] = [];
        // Do Something
        let regex = /^(((.+):(\d+)\.(\d+)-(\d+)\.(\d+) \[(Info|Warn|Error)\]:)|(\s*\(Failure\s+(".+")\)))$/gm;
        let pos: RegExpExecArray | null;

        while ((pos = regex.exec(input))) {
          if (pos[2]) {
            let path = pos[3];
            let startLine = Number(pos[4]);
            let startCol = Number(pos[5]);
            let endLine = Number(pos[6]);
            let endCol = Number(pos[7]);
            let severity = parseSeverity(pos[8]);
            let range = new Range(startLine - 1, startCol, endLine - 1, endCol);

            let msg: RegExpExecArray | null;
            let lines = "Unknown Notice";
            const rest = input.slice(regex.lastIndex + 1);

            if ((msg = /(^  (.*?)\n)+/gm.exec(rest))) {
              lines = msg[0];
            }
            let d = new Diagnostic(range, lines.replace(/^  /gm, ""), severity);
            if (path === document.fileName) {
              diagnostics.push(d);
            }
          } else {
            const msg = JSON.parse(pos[10]);
            let range = new Range(0, 0, 0, 0);
            let matched: RegExpMatchArray | null;
            if ((matched = msg.match(/^Could not resolve variable: (.+?)$/))) {
              const varName = matched[1];
              const re = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
              const pos = document.getText().match(re);
              console.log("Variable: " + varName);
              if (pos && pos.index) {
                const start = document.positionAt(pos.index);
                const end = new Position(
                  start.line,
                  start.character + varName.length
                );
                range = new Range(start, end);
              }
            }
            let d = new Diagnostic(range, msg, DiagnosticSeverity.Error);
            diagnostics.push(d);
          }
        }
        this.collection.set(document.uri, diagnostics);
      });
    }
  }

  public dispose() {
    this.collection.clear();
    this.collection.dispose();
    this.disposables.forEach(i => i.dispose());
  }
}

function parseSeverity(kind: string): DiagnosticSeverity {
  if (kind.match(/Info/i)) {
    return DiagnosticSeverity.Information;
  } else if (kind.match(/Warn/i)) {
    return DiagnosticSeverity.Warning;
  } else if (kind.match(/Error/i)) {
    return DiagnosticSeverity.Error;
  } else {
    return DiagnosticSeverity.Information;
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^=!:${}()|[\]\/\\]/g, "\\$&");
}
