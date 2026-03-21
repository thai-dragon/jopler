"use client";

import { useRef, useState, useCallback } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 900;

interface CodeEditorProps {
  language?: "javascript" | "typescript";
  value: string;
  onChange: (value: string) => void;
  defaultValue?: string;
  readOnly?: boolean;
  height?: string;
  defaultHeight?: number;
  resizable?: boolean;
  showRunButton?: boolean;
}

interface RunResult {
  stdout: string[];
  result: unknown;
  error: string | null;
  executionTime: number;
}

function parseHeight(h: string | number): number {
  if (typeof h === "number") return h;
  const m = String(h).match(/^(\d+)(px)?$/);
  return m ? parseInt(m[1], 10) : 500;
}

export default function CodeEditor({
  language = "typescript",
  value,
  onChange,
  defaultValue,
  readOnly = false,
  height = "500px",
  defaultHeight,
  resizable = true,
  showRunButton = true,
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<RunResult | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [editorHeight, setEditorHeight] = useState(defaultHeight ?? parseHeight(height));
  const resizeStartY = useRef(0);
  const resizeStartH = useRef(0);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowJs: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      noEmit: true,
      esModuleInterop: true,
      skipLibCheck: true,
    });
    const reactTypes = `
declare module 'react' {
  export function useState<T>(initial: T): [T, (v: T | ((p: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useRef<T>(initial: T | null): { current: T | null };
  export function useCallback<T extends (...args: unknown[]) => unknown>(fn: T, deps: unknown[]): T;
  export function useMemo<T>(fn: () => T, deps: unknown[]): T;
  export function memo<P>(component: (props: P) => React.ReactElement | null): (props: P) => React.ReactElement | null;
  export default class React {}
  export namespace React {
    type ReactElement = unknown;
    type ReactNode = unknown;
    type FC<P = object> = (props: P) => ReactElement | null;
  }
}
declare module 'react-dom' {
  export function createRoot(container: Element): { render: (el: unknown) => void };
}
`;
    monaco.languages.typescript.typescriptDefaults.addExtraLib(reactTypes, "file:///node_modules/@types/react/index.d.ts");
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      allowJs: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
    });
    monaco.languages.typescript.javascriptDefaults.addExtraLib(reactTypes, "file:///node_modules/@types/react/index.d.ts");
  };

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault();
    resizeStartY.current = e.clientY;
    resizeStartH.current = editorHeight;
    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - resizeStartY.current;
      const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartH.current + dy));
      setEditorHeight(newH);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [resizable, editorHeight]);

  async function runCode() {
    setRunning(true);
    setShowOutput(true);
    setOutput(null);
    try {
      const res = await fetch("/api/training/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value, language }),
      });
      const data: RunResult = await res.json();
      setOutput(data);
    } catch {
      setOutput({ stdout: [], result: null, error: "Failed to connect to server", executionTime: 0 });
    }
    setRunning(false);
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono uppercase">{language}</span>
        <div className="flex items-center gap-2">
          {showRunButton && !readOnly && (
            <button
              onClick={runCode}
              disabled={running || !value.trim()}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium rounded transition"
            >
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2l10 6-10 6V2z" />
              </svg>
              {running ? "Running..." : "Run"}
            </button>
          )}
        </div>
      </div>

      <Editor
        height={editorHeight}
        language={language}
        theme="vs-dark"
        value={value}
        defaultValue={defaultValue}
        onChange={(v) => onChange(v ?? "")}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
          renderLineHighlight: "none",
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        }}
      />

      {resizable && (
        <div
          onMouseDown={handleResizeStart}
          className="h-2 flex items-center justify-center cursor-ns-resize hover:bg-gray-700/50 transition group"
          title="Drag to resize"
        >
          <div className="w-16 h-1 rounded-full bg-gray-600 group-hover:bg-gray-500 transition" />
        </div>
      )}

      {showOutput && (
        <div className="border-t border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
            <span className="text-xs text-gray-500 font-mono">Output</span>
            <div className="flex items-center gap-3">
              {output && (
                <span className="text-xs text-gray-600">
                  {output.executionTime}ms
                </span>
              )}
              <button
                onClick={() => setShowOutput(false)}
                className="text-gray-600 hover:text-gray-400 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-3 font-mono text-xs max-h-48 overflow-y-auto">
            {!output && <span className="text-gray-500">Running...</span>}
            {output?.error && (
              <div className="text-red-400 whitespace-pre-wrap">{output.error}</div>
            )}
            {output?.stdout && output.stdout.length > 0 && (
              <div className="text-gray-300 whitespace-pre-wrap">
                {output.stdout.join("\n")}
              </div>
            )}
            {output && !output.error && output.result !== undefined && output.result !== null && (
              <div className="text-emerald-400 mt-1">
                → {typeof output.result === "string" ? output.result : JSON.stringify(output.result)}
              </div>
            )}
            {output && !output.error && output.stdout.length === 0 && output.result === undefined && (
              <span className="text-gray-600">(no output)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
