# AI Interpretation Layer Contract v0.1

## 1. Purpose and Scope

### 1.1 Definition
The AI Interpretation Layer is a deterministic analytical component within the Pulse Engine pipeline. It consumes structured simulation output data and applies a fixed analytical framework to produce structured interpretation results.

### 1.2 In Scope
- Consumption of structured simulation data (CSV or JSON format)
- Application of a locked set of analytical questions
- Production of structured interpretation output
- Identification of system phases and transitions
- Calculation of risk indicators based on input data

### 1.3 Out of Scope
- Decision-making or recommendation generation
- Modification of simulation parameters or logic
- External data integration or knowledge retrieval
- User interface rendering or interaction
- Data validation beyond format compliance
- Optimization or corrective action proposals

### 1.4 Role in Pipeline
The AI Interpretation Layer operates as a post-processing step following simulation execution. It receives simulation output as input and produces interpretation output as output. It does not modify the simulation execution or affect upstream components.

## 2. Input Contract

### 2.1 Required Format
Input MUST be provided in one of the following structured formats:
- CSV (Comma-Separated Values) with header row
- JSON (JavaScript Object Notation) array of objects

### 2.2 Required Fields
Input MUST contain the following fields for each time step:

| Field Name | Type | Range | Description |
|------------|------|-------|-------------|
| time | numeric | [0, ∞) | Sequential time step identifier |
| load | numeric | [0, ∞) | System load value |
| capacity | numeric | [0, ∞) | System capacity value |
| recovery | numeric | [0, 100] | Recovery capability value (percentage scale) |
| stress | numeric | [0, 100] | Stress indicator value (percentage scale) |

### 2.3 Format-Specific Requirements

#### 2.3.1 CSV Format
- First row MUST contain header: `time,load,capacity,recovery,stress`
- Each subsequent row MUST contain exactly five comma-separated numeric values
- Values MUST be parseable as floating-point numbers
- Decimal precision of input values is preserved but not required to be consistent

#### 2.3.2 JSON Format
- MUST be an array of objects
- Each object MUST contain exactly five keys: `time`, `load`, `capacity`, `recovery`, `stress`
- All values MUST be numeric types
- Objects MUST be ordered by ascending `time` value

### 2.4 Assumptions and Invariants
- Time steps are sequential and non-negative
- Input contains at least one data row beyond header (if CSV)
- All numeric values are finite (not NaN, not Infinity)
- Input represents a complete simulation run from initial state to completion

### 2.5 Invalid Input Conditions
Input is considered invalid if:
- Required format is not CSV or JSON
- Required fields are missing or incorrectly named
- Numeric values are not parseable or are non-finite
- Time sequence contains gaps or non-sequential values
- Input is empty or contains no data rows
- Field types do not match specified types

### 2.6 Invalid Input Handling
Upon receipt of invalid input, the AI Interpretation Layer MUST:
- Not attempt to interpret or correct invalid input
- Return an error response indicating the specific validation failure
- Not proceed with interpretation processing

## 3. Question Set (Locked)

### 3.1 Lock Status
The following question set is LOCKED and MUST NOT be modified without a contract version bump. Questions are invariant and not user-editable.

### 3.2 Core Analytical Questions

**Q1: System Phase Classification**
Identify the current system phase at each time step. Phases are: stable, fragile, unstable.

**Q2: Phase Transition Detection**
Identify time points where phase transitions occur and classify transition type (stable→fragile, fragile→unstable, unstable→fragile, fragile→stable).

**Q3: Load-Capacity Relationship Analysis**
Calculate the ratio of load to capacity at each time step. Identify periods where load exceeds capacity. Identify trend direction (increasing, decreasing, stable).

**Q4: Stress Accumulation Pattern**
Identify periods of stress accumulation, stress dissipation, and sustained stress. Calculate rate of stress change where applicable.

**Q5: Recovery Degradation Pattern**
Identify periods where recovery degrades, remains stable, or improves. Calculate rate of recovery change where applicable.

**Q6: Capacity Erosion Pattern**
Identify periods where capacity erodes, remains stable, or increases. Calculate rate of capacity change where applicable.

**Q7: Feedback Loop Detection**
Identify presence of reinforcing feedback loops (e.g., stress causing recovery degradation, which causes capacity erosion, which increases stress).

**Q8: Risk Signal Identification**
Identify time points or periods where risk indicators exceed thresholds. Risk indicators include: load exceeding capacity, sustained high stress, low recovery levels, accelerating capacity erosion.

**Q9: Trajectory Analysis**
Classify the overall system trajectory over the simulation duration. Categories: stabilizing, deteriorating, oscillating, stable.

**Q10: Critical Point Identification**
Identify time points where system state approaches or crosses critical boundaries (e.g., recovery below 50, capacity below initial value, stress above 50).

### 3.3 Question Invariance
Questions MUST be answered using only the provided input data. Questions MUST NOT be modified, rephrased, or extended without a contract version change. The order of questions in output MAY be organized for readability but all questions MUST be addressed.

## 4. Interpretation Rules

### 4.1 Allowed Reasoning Scope
The AI Interpretation Layer MAY perform the following reasoning operations:
- Mathematical calculations on input data (ratios, differences, rates, trends)
- Pattern recognition within the provided data sequence
- Comparison of values across time steps
- Threshold-based classification using calculated values
- Temporal sequencing analysis (before/after relationships)
- Aggregation of values across time ranges

### 4.2 Prohibited Reasoning
The AI Interpretation Layer MUST NOT:
- Speculate about causes of system behavior not evident in the data
- Apply external knowledge or domain expertise beyond the input schema
- Infer user intentions, goals, or desired outcomes
- Generate advice, recommendations, or optimization suggestions
- Make predictions beyond the provided time range
- Reference or incorporate information not present in the input data
- Apply moral judgment or ethical evaluation
- Assume or infer system context beyond what the data fields represent

### 4.3 Phase Transition Identification Rules

#### 4.3.1 Stable Phase
System is classified as stable when:
- Load is less than or equal to capacity (load/capacity ≤ 1.0)
- Stress is below 20
- Recovery is above 70
- Capacity is stable or increasing

#### 4.3.2 Fragile Phase
System is classified as fragile when:
- At least one of the following conditions is true:
  - Load exceeds capacity (load/capacity > 1.0)
  - Stress is between 20 and 50 (inclusive)
  - Recovery is between 50 and 70 (inclusive)
  - Capacity is decreasing but above 80% of initial capacity

#### 4.3.3 Unstable Phase
System is classified as unstable when:
- At least two of the following conditions are true:
  - Load significantly exceeds capacity (load/capacity > 1.1)
  - Stress exceeds 50
  - Recovery is below 50
  - Capacity is below 80% of initial capacity and decreasing

#### 4.3.4 Phase Transition Detection
Phase transitions are identified by comparing the phase classification of consecutive time steps. A transition occurs when the phase classification changes between time step N and time step N+1.

### 4.4 Calculation Rules
All calculations MUST:
- Use values directly from the input data without transformation unless specified
- Preserve numerical precision consistent with input precision
- Handle edge cases explicitly (e.g., division by zero, empty time ranges)
- Document calculation formulas in output when non-trivial

## 5. Output Schema

### 5.1 Output Format
Output MUST be provided in JSON format with the following strict structure.

### 5.2 Root Object Structure
```json
{
  "metadata": { ... },
  "systemPhaseAnalysis": { ... },
  "phaseTransitions": [ ... ],
  "loadCapacityAnalysis": { ... },
  "stressAnalysis": { ... },
  "recoveryAnalysis": { ... },
  "capacityAnalysis": { ... },
  "feedbackLoopAnalysis": { ... },
  "riskSignals": [ ... ],
  "trajectoryAnalysis": { ... },
  "criticalPoints": [ ... ],
  "summary": { ... }
}
```

### 5.3 Required Sections

#### 5.3.1 metadata
```json
{
  "contractVersion": "0.1",
  "timestamp": "ISO 8601 datetime string",
  "inputSource": "string identifier",
  "totalTimeSteps": number,
  "inputValidation": {
    "format": "CSV" | "JSON",
    "valid": boolean,
    "errors": [ "string array if invalid" ]
  }
}
```

#### 5.3.2 systemPhaseAnalysis
```json
{
  "phases": [
    {
      "time": number,
      "phase": "stable" | "fragile" | "unstable",
      "indicators": {
        "loadCapacityRatio": number,
        "stress": number,
        "recovery": number,
        "capacityTrend": "increasing" | "decreasing" | "stable"
      }
    }
  ],
  "phaseDistribution": {
    "stable": number,
    "fragile": number,
    "unstable": number
  }
}
```

#### 5.3.3 phaseTransitions
Array of objects, each containing:
```json
{
  "fromTime": number,
  "toTime": number,
  "fromPhase": "stable" | "fragile" | "unstable",
  "toPhase": "stable" | "fragile" | "unstable",
  "transitionType": "stable→fragile" | "fragile→unstable" | "unstable→fragile" | "fragile→stable",
  "triggeringConditions": [ "string array describing conditions" ]
}
```

#### 5.3.4 loadCapacityAnalysis
```json
{
  "loadCapacityRatios": [
    {
      "time": number,
      "ratio": number,
      "overCapacity": boolean
    }
  ],
  "overCapacityPeriods": [
    {
      "startTime": number,
      "endTime": number | null,
      "duration": number,
      "maxRatio": number
    }
  ],
  "trend": {
    "direction": "increasing" | "decreasing" | "stable" | "oscillating",
    "finalRatio": number,
    "initialRatio": number
  }
}
```

#### 5.3.5 stressAnalysis
```json
{
  "stressPatterns": [
    {
      "time": number,
      "stress": number,
      "pattern": "accumulating" | "dissipating" | "sustained"
    }
  ],
  "accumulationPeriods": [
    {
      "startTime": number,
      "endTime": number | null,
      "initialStress": number,
      "peakStress": number,
      "rate": number
    }
  ],
  "sustainedHighStress": [
    {
      "startTime": number,
      "endTime": number | null,
      "threshold": number,
      "averageStress": number
    }
  ]
}
```

#### 5.3.6 recoveryAnalysis
```json
{
  "recoveryPatterns": [
    {
      "time": number,
      "recovery": number,
      "pattern": "degrading" | "stable" | "improving",
      "rate": number
    }
  ],
  "degradationPeriods": [
    {
      "startTime": number,
      "endTime": number | null,
      "initialRecovery": number,
      "finalRecovery": number,
      "rate": number
    }
  ],
  "lowRecoveryPeriods": [
    {
      "startTime": number,
      "endTime": number | null,
      "threshold": number,
      "minRecovery": number
    }
  ]
}
```

#### 5.3.7 capacityAnalysis
```json
{
  "capacityPatterns": [
    {
      "time": number,
      "capacity": number,
      "pattern": "eroding" | "stable" | "rebuilding",
      "rate": number,
      "percentageOfInitial": number
    }
  ],
  "erosionPeriods": [
    {
      "startTime": number,
      "endTime": number | null,
      "initialCapacity": number,
      "finalCapacity": number,
      "rate": number
    }
  ],
  "rebuildingPeriods": [
    {
      "startTime": number,
      "endTime": number | null,
      "initialCapacity": number,
      "finalCapacity": number,
      "rate": number
    }
  ]
}
```

#### 5.3.8 feedbackLoopAnalysis
```json
{
  "detectedLoops": [
    {
      "startTime": number,
      "endTime": number | null,
      "loopType": "reinforcing" | "balancing",
      "components": [ "string array describing loop components" ],
      "severity": "low" | "medium" | "high"
    }
  ]
}
```

#### 5.3.9 riskSignals
Array of objects, each containing:
```json
{
  "time": number,
  "signalType": "loadExceedsCapacity" | "highStress" | "lowRecovery" | "capacityErosion" | "acceleratingDegradation",
  "severity": "low" | "medium" | "high" | "critical",
  "indicators": {
    "loadCapacityRatio": number | null,
    "stress": number | null,
    "recovery": number | null,
    "capacityChange": number | null
  },
  "threshold": number,
  "exceedance": number
}
```

#### 5.3.10 trajectoryAnalysis
```json
{
  "classification": "stabilizing" | "deteriorating" | "oscillating" | "stable",
  "indicators": {
    "finalPhase": "stable" | "fragile" | "unstable",
    "phaseChangeCount": number,
    "netLoadChange": number,
    "netCapacityChange": number,
    "netRecoveryChange": number,
    "netStressChange": number
  },
  "trends": {
    "load": "increasing" | "decreasing" | "stable",
    "capacity": "increasing" | "decreasing" | "stable",
    "recovery": "increasing" | "decreasing" | "stable",
    "stress": "increasing" | "decreasing" | "stable"
  }
}
```

#### 5.3.11 criticalPoints
Array of objects, each containing:
```json
{
  "time": number,
  "pointType": "recoveryThreshold" | "capacityThreshold" | "stressThreshold" | "phaseTransition",
  "threshold": number,
  "value": number,
  "direction": "approaching" | "crossing" | "receding"
}
```

#### 5.3.12 summary
```json
{
  "overallSystemState": "stable" | "fragile" | "unstable",
  "keyFindings": [ "string array of key findings" ],
  "riskLevel": "low" | "medium" | "high" | "critical",
  "phaseTransitionCount": number,
  "longestUnstablePeriod": number | null
}
```

### 5.4 Output Ordering
Sections MUST appear in the order specified in section 5.2. Within arrays, objects MUST be ordered by time value (ascending).

### 5.5 Output Completeness
All sections MUST be present in output, even if arrays are empty or objects contain null values where applicable. Missing sections indicate contract violation.

## 6. Reproducibility Requirements

### 6.1 Functional Reproducibility
Given identical input data, the AI Interpretation Layer MUST produce functionally equivalent output across multiple executions. Functional equivalence means:
- All calculated numeric values are identical (within floating-point precision limits)
- All phase classifications are identical
- All phase transition detections are identical
- All risk signal identifications are identical
- All critical point identifications are identical

### 6.2 Acceptable Variance
The following types of variance are acceptable across executions:
- Minor wording differences in text descriptions (e.g., "stress increased" vs "stress rose")
- Ordering of findings within non-ordered arrays (if not time-ordered)
- Timestamp values in metadata
- Minor formatting differences in string representations that do not affect semantics

### 6.3 Unacceptable Variance
The following types of variance are NOT acceptable:
- Differences in calculated numeric values (beyond floating-point precision)
- Differences in phase classifications
- Differences in phase transition detection
- Differences in risk signal identification or severity classification
- Differences in trajectory classification
- Missing or additional sections in output schema
- Structural differences in output JSON schema

### 6.4 Determinism Requirements
All calculations MUST be deterministic. Random number generation, probabilistic algorithms, or non-deterministic operations are PROHIBITED.

### 6.5 Reproducibility Testing
Implementations MUST be verifiable through automated testing that demonstrates identical output for identical input across multiple executions.

## 7. Prohibited Behavior

### 7.1 Creative Interpretation
The AI Interpretation Layer MUST NOT:
- Invent explanations or narratives not directly supported by the data
- Use creative language, metaphors, or analogies
- Generate illustrative examples or hypothetical scenarios
- Produce content intended to be engaging or persuasive

### 7.2 Advice and Recommendations
The AI Interpretation Layer MUST NOT:
- Suggest actions, interventions, or corrective measures
- Recommend parameter adjustments or system modifications
- Provide optimization guidance or best practices
- Offer strategic or tactical recommendations

### 7.3 Moral or Ethical Judgment
The AI Interpretation Layer MUST NOT:
- Evaluate system behavior as "good" or "bad"
- Apply ethical frameworks or moral reasoning
- Express approval or disapproval of outcomes
- Characterize behavior using value-laden language

### 7.4 Goal Inference
The AI Interpretation Layer MUST NOT:
- Infer user intentions or desired outcomes
- Assume optimization objectives (e.g., maximizing capacity, minimizing stress)
- Presume system success criteria or failure conditions beyond data thresholds
- Guess at unstated requirements or expectations

### 7.5 External Knowledge Application
The AI Interpretation Layer MUST NOT:
- Apply domain expertise beyond what is encoded in the interpretation rules
- Reference external data sources, standards, or benchmarks
- Incorporate knowledge about real-world systems or historical events
- Use information not present in the input data or contract

### 7.6 Prediction and Extrapolation
The AI Interpretation Layer MUST NOT:
- Predict future system behavior beyond the provided time range
- Extrapolate trends beyond available data
- Forecast outcomes or project trajectories into unobserved time periods
- Make statements about system behavior at time points not in the input

### 7.7 Input Modification
The AI Interpretation Layer MUST NOT:
- Modify, correct, or normalize input data beyond validation
- Fill missing values or interpolate data points
- Transform input values for purposes other than calculation
- Store or cache input data beyond the scope of a single execution

### 7.8 Output Format Deviation
The AI Interpretation Layer MUST NOT:
- Add sections not specified in the output schema
- Remove required sections from output
- Modify the structure of required schema elements
- Include additional data fields not specified in the contract

## 8. Versioning and Change Policy

### 8.1 Version Format
Contract versions follow semantic versioning: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes to contract semantics, input/output schemas, or interpretation rules
- MINOR: Additions to allowed behavior, new optional output fields, or clarification of existing rules
- PATCH: Corrections, clarifications, or typographical fixes that do not change semantics

### 8.2 Current Version
This document specifies version 0.1.

### 8.3 Change Process
Any modification to this contract that affects semantics, input/output schemas, or interpretation rules REQUIRES a version bump. Changes MUST be documented in a changelog section or appended version document.

### 8.4 Backward Compatibility
New MINOR versions SHOULD maintain backward compatibility with previous versions. New MAJOR versions MAY introduce breaking changes that require implementation updates.

### 8.5 Version Identification
All output produced by the AI Interpretation Layer MUST include the contract version in the `metadata.contractVersion` field. The version MUST match the version of this contract document.

### 8.6 Deprecation Policy
Deprecated features MUST be explicitly marked and given a deprecation timeline before removal. Removal of deprecated features constitutes a MAJOR version change.

### 8.7 Implementation Compliance
Implementations MUST specify which contract version they comply with. Implementations MUST NOT claim compliance with a version if they violate any mandatory requirements of that version.

---

**Document Status:** Contract v0.1  
**Effective Date:** [Date of implementation]  
**Last Updated:** [Date of last modification]  
**Next Review:** [As needed, with version bump requirements]
