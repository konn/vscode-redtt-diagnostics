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
    let stdout = "";
    let stderr = "";
    if (redtt.pid) {
      redtt.stdout.on("data", input => (stdout += input));
      redtt.stderr.on("data", input => (stderr += input));
      redtt.on("close", (code, _sig) => {
        const diagnostics: Diagnostic[] = [];
        // Do Something
        let regex = /^(.+):(\d+)\.(\d+)-(\d+)\.(\d+) \[(Info|Warn|Error)\]:$/gm;
        let pos: RegExpExecArray | null;
        while ((pos = regex.exec(stdout))) {
          let path = pos[1];
          let startLine = Number(pos[2]);
          let startCol = Number(pos[3]);
          let endLine = Number(pos[4]);
          let endCol = Number(pos[5]);
          let severity = parseSeverity(pos[6]);
          let range = new Range(startLine - 1, startCol, endLine - 1, endCol);
          let msg: RegExpExecArray | null;
          let lines = "Unknown Notice";
          const rest = stdout.slice(regex.lastIndex + 1);
          if ((msg = /(^  (.+?)\n)+/gm.exec(rest))) {
            lines = msg[0];
          }
          console.log(JSON.stringify([rest, lines]));
          let d = new Diagnostic(range, lines.replace(/^  /gm, ""), severity);
          if (path === document.fileName) {
            diagnostics.push(d);
          }
        }
        let internalError = /^(?!\s*Check(ed|ing)|$)/m;
        if ((pos = internalError.exec(stderr))) {
          let msg = stderr.slice(pos.index);
          let range = new Range(0, 0, 0, 0);
          let result = /Failure\s+"Could not resolve variable: (.+?)"/.exec(
            msg
          );
          if (result) {
            const ident = result[1];
            const offset = document.getText().indexOf(ident);
            const start = document.positionAt(offset);
            const end = new Position(
              start.line,
              start.character + ident.length
            );
            range = new Range(start, end);
          }
          let d = new Diagnostic(range, msg, DiagnosticSeverity.Error);
          diagnostics.push(d);
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
