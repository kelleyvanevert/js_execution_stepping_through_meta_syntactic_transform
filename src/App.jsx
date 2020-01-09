import React, { useState, useMemo } from "react";
import stripIndent from "common-tags/lib/stripIndent";

import gen from "./lib/gen";

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

export default function App() {
  const [code, set_code] = useState(CODE_EXAMPLES[1]);

  const generated_code = useMemo(() => gen(code), [code]);

  const student_app = useMemo(() => {
    if (!generated_code) return;

    try {
      window.app = eval(generated_code);
      return <p>successfully compiled app</p>;
    } catch (e) {
      console.error("COULD NOT COMPILE:", e, generated_code);
      return (
        <p>
          <strong>COULD NOT COMPILE</strong>
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
      {<div className="student_app">{student_app}</div>}
    </div>
  );
}
