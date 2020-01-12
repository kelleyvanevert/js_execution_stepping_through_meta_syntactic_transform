import React, { useState, useRef } from "react";
import stripIndent from "common-tags/lib/stripIndent";

import { ControlledEditor } from "@monaco-editor/react";

// import gen from "./lib/gen";

import "./App.scss";

const CODE_EXAMPLES = [
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

  // const generated_code = useMemo(() => gen(code), [code]);

  // const student_app = useMemo(() => {
  //   if (!generated_code) return;

  //   try {
  //     window.app = eval(generated_code);
  //     return <p>successfully compiled app</p>;
  //   } catch (e) {
  //     console.error("COULD NOT COMPILE:", e, generated_code);
  //     return (
  //       <p>
  //         <strong>COULD NOT COMPILE</strong>
  //       </p>
  //     );
  //   }
  // }, [generated_code]);

  return (
    <div>
      <ControlledEditor
        editorDidMount={(e, editor) => {
          editorRef.current = editor;

          const model = (window.model = editor.getModel());
          console.log(editor, model);

          // editor.setModelMarkers(editor.getModel(), null, [
          //   {
          //     startLineNumber: 2,
          //     startColumn: 1,
          //     endLineNumber: 1,
          //     endColumn: 8,
          //     message: "message",
          //     severity: 4
          //   }
          // ]);
        }}
        height={400}
        width={600}
        value={code}
        onChange={(e, code) => set_code(code)}
        language="javascript"
        theme="tomorrow-night" // todo
        options={EDITOR_OPTIONS}
      />
      {/* <textarea
        className="student_code"
        value={code}
        onChange={e => set_code(e.target.value)}
      />
      <pre className="generated_code">{generated_code}</pre>
      {<div className="student_app">{student_app}</div>} */}
    </div>
  );
}
