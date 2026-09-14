export const LEGACY_ALGORITHM_ASSUMPTIONS_V1 = Object.freeze([
  { status: "NOT IN PROFILE PAYLOAD", subject: "risk score anchors, clamp, and materialization bands", runtimeAnchor: "src/pilotFastighet/driverScoreState.ts" },
  { status: "NOT IN PROFILE PAYLOAD", subject: "propagation trigger polarity and adverse trigger levels", runtimeAnchor: "src/pilotFastighet/impactContract.ts::getPropagationTriggerLevels" },
  { status: "NOT IN PROFILE PAYLOAD", subject: "propagation fixed-point iteration, severity ranking, and event delay", runtimeAnchor: "src/pilotFastighet/riskPropagation.ts::propagateRisks" },
  { status: "NOT IN PROFILE PAYLOAD", subject: "exponential exponent and logistic k/x0 parameters", runtimeAnchor: "src/pilotFastighet/curveConfig.ts::resolveExponential/resolveLogistic" },
  { status: "NOT IN PROFILE PAYLOAD", subject: "curve missing/unsupported neutral fallback", runtimeAnchor: "src/pilotFastighet/curveConfig.ts::getImpactMultiplier" },
  { status: "NOT IN PROFILE PAYLOAD", subject: "Structural Margin baseline, sensitivity, coefficients, and recovery pull", runtimeAnchor: "src/pilotFastighet/RealEstateEngine.ts::constructor/stepForward" },
  { status: "NOT IN PROFILE PAYLOAD", subject: "constraint registry and initial lifecycle state", runtimeAnchor: "src/pilotFastighet/constraintState.ts::createInitialConstraintRegistry" },
  { status: "NOT IN PROFILE PAYLOAD", subject: "refinancing activation, sustainThreshold override, lifecycle, and effect application semantics", runtimeAnchor: "src/pilotFastighet/simulateConstraintsStep.ts::simulateConstraintsStep" },
] as const);
