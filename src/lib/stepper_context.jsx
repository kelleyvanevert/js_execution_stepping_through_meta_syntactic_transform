import React, { createContext } from "react";

export const StepperContext = createContext();

export function StepperContextProvider({ children }) {
  const addStep = (...data) => {
    console.log("step:", ...data);
  };

  return (
    <StepperContext.Provider
      value={{
        addStep
      }}
    >
      {children}
    </StepperContext.Provider>
  );
}
