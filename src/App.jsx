import React, { useState, useMemo, useContext } from "react";
import stripIndent from "common-tags/lib/stripIndent";

import { StepperContext, StepperContextProvider } from "./lib/stepper_context";
import gen from "./lib/gen";

import "./App.scss";

window.React = React;

window._LIB = {
  render(componentName) {
    const stepper = useContext(StepperContext);
    console.log("rendering", componentName, stepper);
  },
  component(C, componentName, loc) {
    console.log("registered component", componentName, "at", loc);
    return C;
  },
  Step: function Step({ step: S }) {
    const [done, set_done] = useState(false);
    return done ? <S /> : <button onClick={() => set_done(true)}>step</button>;
  }
};

export default function App() {
  const [code, set_code] = useState(stripIndent`
    export default function App() {
      const [count, set_count] = useState(0);

      // does not "work"
      useEffect(() => {
        set_count(10);
      }, []);

      return <div>
        hello <MicroCosmos
          increment={() => set_count( count+ 1)}
        /> {count}
      </div>;
    }

    function MicroCosmos({ increment }) {
      return <button onClick={increment}>microcosmos</button>;
    }
  `);

  const generated_code = useMemo(() => gen(code), [code]);

  const student_app_rendered = useMemo(() => {
    try {
      const StudentApp = eval(`
        const exports = {};
        {
          const useState = React.useState;
          const useEffect = React.useEffect;
          const useContext = React.useContext;
          ${generated_code};
        }
        exports.default;
      `);
      return (
        <StepperContextProvider>
          <StudentApp />
        </StepperContextProvider>
      );
    } catch (e) {
      return (
        <p>
          <strong>COULD NOT RENDER</strong>
        </p>
      );
    }
  }, [generated_code]);

  return (
    <div>
      <textarea
        className="student_code"
        value={code}
        onChange={e => set_code(e.target.value)}
      />
      <pre className="generated_code">{generated_code}</pre>
      <div className="student_app">{student_app_rendered}</div>
    </div>
  );
}
