import { NextRequest, NextResponse } from "next/server";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MAX_TIMEOUT = 5000;
const MAX_OUTPUT_SIZE = 10 * 1024;

function transpileTS(code: string): { js: string; error?: string } {
  let tmpPath = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ts = require("typescript");
    const tmp = path.join(os.tmpdir(), `ts-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`);
    fs.writeFileSync(tmp, code);
    tmpPath = tmp;
    const program = ts.createProgram([tmp], {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
    });
    const diag = ts.getPreEmitDiagnostics(program);
    const errs = diag.filter((d: { category: number }) => d.category === 1); // DiagnosticCategory.Error
    if (errs.length > 0) {
      const first = errs[0];
      const msg = ts.flattenDiagnosticMessageText(first.messageText, "\n");
      const f = first.file;
      const pos = f ? f.getLineAndCharacterOfPosition(first.start ?? 0) : { line: 0, character: 0 };
      return { js: "", error: `TypeScript error at ${pos.line + 1}:${pos.character + 1}: ${msg}` };
    }
    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        strict: false,
      },
    });
    return { js: result.outputText };
  } catch (e: unknown) {
    return { js: "", error: (e as Error).message };
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ stdout: [], result: null, error: "No code provided", executionTime: 0 });
    }

    if (code.length > 50_000) {
      return NextResponse.json({ stdout: [], result: null, error: "Code too large (max 50KB)", executionTime: 0 });
    }

    let jsCode = code;
    if (language === "typescript") {
      const out = transpileTS(code);
      if (out.error) {
        return NextResponse.json({ stdout: [], result: null, error: out.error, executionTime: 0 });
      }
      jsCode = out.js;
    }

    const stdout: string[] = [];
    let totalOutput = 0;

    const fakeConsole = {
      log: (...args: unknown[]) => {
        const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
        totalOutput += line.length;
        if (totalOutput <= MAX_OUTPUT_SIZE) stdout.push(line);
      },
      warn: (...args: unknown[]) => fakeConsole.log(...args),
      error: (...args: unknown[]) => fakeConsole.log(...args),
      info: (...args: unknown[]) => fakeConsole.log(...args),
      dir: (obj: unknown) => fakeConsole.log(JSON.stringify(obj, null, 2)),
      table: (data: unknown) => fakeConsole.log(JSON.stringify(data)),
    };

    const sandbox = {
      console: fakeConsole,
      setTimeout: undefined,
      setInterval: undefined,
      setImmediate: undefined,
      clearTimeout: undefined,
      clearInterval: undefined,
      clearImmediate: undefined,
      process: undefined,
      require: undefined,
      __filename: undefined,
      __dirname: undefined,
      module: undefined,
      exports: undefined,
      global: undefined,
      globalThis: undefined,
      fetch: undefined,
      Buffer: undefined,
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      TypeError,
      RangeError,
      SyntaxError,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Promise,
      Symbol,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
    };

    const context = vm.createContext(sandbox);

    const wrappedCode = `
      (function() {
        "use strict";
        ${jsCode}
      })();
    `;

    const start = performance.now();
    let result: unknown;
    let error: string | null = null;

    try {
      result = vm.runInContext(wrappedCode, context, {
        timeout: MAX_TIMEOUT,
        filename: "user-code.js",
      });
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message?.includes("Script execution timed out")) {
        error = "Execution timed out (5s limit)";
      } else {
        error = `${err.name || "Error"}: ${err.message || String(err)}`;
      }
    }

    const executionTime = Math.round(performance.now() - start);

    return NextResponse.json({ stdout, result, error, executionTime });
  } catch (e: unknown) {
    return NextResponse.json({ stdout: [], result: null, error: `Server error: ${(e as Error).message}`, executionTime: 0 });
  }
}
