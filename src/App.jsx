import React, { useState, useMemo, useRef } from "react";
import stripIndent from "common-tags/lib/stripIndent";

import MonacoEditor from "react-monaco-editor";
import * as monaco from "monaco-editor";
import TomorrowTheme from "./lib/Tomorrow.json";

import gen, { TEMPLATE } from "./lib/gen";

import "./App.scss";

monaco.editor.defineTheme("Tomorrow", TomorrowTheme);
monaco.editor.setTheme("Tomorrow");

self.MonacoEnvironment = {
  getWorkerUrl: function(moduleId, label) {
    if (label === "typescript" || label === "javascript") {
      return "./ts.worker.js";
    }
    return "./editor.worker.js";
  }
};

const CODE_EXAMPLES = [
  stripIndent`
    const obj = {
      a: 41,
      f: function(b) {
        return this.a + b;
      }
    };

    const result = obj.f(1);
    const str = obj.toString();

    console.log("result", result, str);
  `,
  stripIndent`
    const x = [];
    x.push(5);
    console.log(x);
  `,
  stripIndent`
    const kelley = {
      name: "Kelley",
      age: 27
    };

    console.log("kelley:", kelley);

    const heleen = {
      name: "Heleen",
      age: 24
    };

    const elsie = {
      name: "Elsie",
      age: 22
    };

    const siblings = [kelley, heleen, elsie];

    console.log("siblings:", siblings);

    const names = siblings.map(person => {
      return person.name;
    });

    console.log(names);
  `
];

const EDITOR_OPTIONS = {
  acceptSuggestionOnCommitCharacter: true,
  acceptSuggestionOnEnter: "on",
  accessibilitySupport: "auto",
  autoIndent: false,
  automaticLayout: true,
  codeLens: true,
  colorDecorators: true,
  contextmenu: false,
  cursorBlinking: "blink",
  cursorSmoothCaretAnimation: false,
  cursorStyle: "line",
  disableLayerHinting: false,
  disableMonospaceOptimizations: false,
  dragAndDrop: false,
  fixedOverflowWidgets: false,
  folding: false,
  foldingStrategy: "auto",
  fontLigatures: false,
  formatOnPaste: false,
  formatOnType: false,
  hideCursorInOverviewRuler: false,
  highlightActiveIndentGuide: true,
  links: true,
  minimap: {
    enabled: false
  },
  mouseWheelZoom: false,
  multiCursorMergeOverlapping: true,
  multiCursorModifier: "alt",
  overviewRulerBorder: true,
  overviewRulerLanes: 2,
  quickSuggestions: true,
  quickSuggestionsDelay: 100,
  readOnly: false,
  renderControlCharacters: false,
  renderFinalNewline: true,
  renderIndentGuides: true,
  renderLineHighlight: "all",
  renderWhitespace: "none",
  revealHorizontalRightPadding: 30,
  roundedSelection: true,
  rulers: [],
  scrollBeyondLastColumn: 5,
  scrollBeyondLastLine: true,
  selectOnLineNumbers: true,
  selectionClipboard: true,
  selectionHighlight: true,
  showFoldingControls: "mouseover",
  smoothScrolling: false,
  suggestOnTriggerCharacters: true,
  wordBasedSuggestions: true,
  wordSeparators: "~!@#$%^&*()-=+[{]}|;:'\",.<>/?",
  wordWrap: "off",
  wordWrapBreakAfterCharacters: "\t})]?|&,;",
  wordWrapBreakBeforeCharacters: "{([+",
  wordWrapBreakObtrusiveCharacters: ".",
  wordWrapColumn: 80,
  wordWrapMinified: true,
  wrappingIndent: "none"
};

export default function App() {
  const [code, set_code] = useState(CODE_EXAMPLES[0]);
  const editorRef = useRef();

  const { app, error } = useMemo(() => {
    try {
      const generated_code = TEMPLATE.replace("GENERATED_CODE", gen(code));
      console.log("generated code:", generated_code);
      const app = eval(generated_code);

      app._lift = r => {
        // console.log("_lift", r);
        if (
          r &&
          r[Symbol.iterator] &&
          typeof r !== "string" &&
          !Array.isArray(r)
        ) {
          // console.log("  ...already a stepper, so OK");
          return r;
        } else {
          // console.log("  ...wrap into a stepper");
          return (function*() {
            return r;
          })();
        }
      };

      app._stm = info => {
        return {
          type: "statement",
          info
        };
      };

      app._expr = (info, value) => {
        return {
          type: "expression",
          info,
          value
        };
      };

      return { app };
    } catch (error) {
      return { error };
    }
  }, [code]);

  const [executionState, set_executionState] = useState({
    state: "idle"
  });

  const [decorationIds, set_decorationIds] = useState([]);

  const decorate = step => {
    set_decorationIds(
      editorRef.current.deltaDecorations(
        decorationIds,
        step.done
          ? []
          : [
              {
                range: {
                  startLineNumber: step.value.info.loc.start.line,
                  startColumn: step.value.info.loc.start.column + 1,
                  endLineNumber: step.value.info.loc.end.line,
                  endColumn: step.value.info.loc.end.column + 1
                },
                options: {
                  className:
                    step.value.type === "statement"
                      ? "stepper-before-execute"
                      : "stepper-after-execute"
                }
              }
            ]
      )
    );
  };

  const startExecution = () => {
    if (!editorRef.current) return;
    if (!app) return;

    const stepper = app();
    const firstStep = stepper.next();
    decorate(firstStep);

    set_executionState({
      state: "executing",
      app,
      stepper,
      steps: [firstStep]
    });
  };

  const step = () => {
    if (!editorRef.current) return;
    if (executionState.state !== "executing") return;

    if (executionState.steps[0].done) {
      console.log("already done");
      return;
    }

    const { steps, stepper } = executionState;
    const nextStep = stepper.next(
      steps[0].value.type === "expression" ? steps[0].value.value : undefined
    );
    decorate(nextStep);

    set_executionState({
      ...executionState,
      steps: [nextStep, ...executionState.steps]
    });
  };

  const backToEditMode = () => {
    set_executionState({
      state: "idle"
    });
  };

  return (
    <div className="App">
      <div className="EditorPane">
        <MonacoEditor
          width="100%"
          height="100%"
          language="javascript"
          theme="Tomorrow"
          value={code}
          options={{
            ...EDITOR_OPTIONS,
            readOnly: executionState.state === "executing"
          }}
          onChange={(code, e) => {
            set_code(code);
          }}
          editorDidMount={(editor, m) => {
            editorRef.current = editor;

            // console.log(editor, monaco.editor);
            // monaco.editor.setModelMarkers(editor.getModel(), "stepper", [
            //   {
            //     startLineNumber: 2,
            //     startColumn: 1,
            //     endLineNumber: 1,
            //     endColumn: 8,
            //     message: "Some message",
            //     severity: 4
            //   }
            // ]);
          }}
        />
      </div>
      <div className="ResultPane">
        {executionState.state === "executing" ? (
          <div>
            <h2>Executing</h2>
            <p>
              At step {executionState.steps.length}{" "}
              <button onClick={backToEditMode}>Back to edit mode</button>{" "}
              {executionState.steps[0].done ? (
                <strong>DONE</strong>
              ) : (
                <button onClick={step}>Step</button>
              )}
            </p>
            <ul>
              {executionState.steps
                .slice()
                .reverse()
                .map((step, i) => {
                  if (step.done) {
                    return (
                      <li key={i}>
                        <strong>DONE</strong>
                      </li>
                    );
                  }

                  return (
                    <li key={i}>
                      <em>{step.value.type}</em>{" "}
                      {step.value.type === "expression" &&
                        (typeof step.value.value === "function" ? (
                          <strong>fn</strong>
                        ) : (
                          <code>{JSON.stringify(step.value.value)}</code>
                        ))}
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : (
          <div>
            <h2>Edit mode</h2>
            {error ? (
              <p>Error: {error.message}</p>
            ) : (
              <p>
                <button onClick={startExecution}>Start executing</button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
