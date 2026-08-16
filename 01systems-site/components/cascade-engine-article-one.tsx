import { InsightAuthorLine } from "@/components/insight-author-line";

const diagramAltText =
  "Diagram showing a human-led process from a real decision situation through facilitated modelling to a configured model, followed by software execution through deterministic analysis.";

export function CascadeEngineArticleOne() {
  return (
    <article className="ce1-article">
      <section className="ce1-brief" aria-labelledby="ce1-brief-heading">
        <p className="ce1-brief-label" id="ce1-brief-heading">
          Executive Brief · 1 min
        </p>

        <div className="ce1-brief-opening">
          <div className="ce1-brief-question">
            <p className="ce1-brief-kicker">The question</p>
            <p className="ce1-brief-question-text">
              What must happen before Cascade Engine can analyse a decision?
            </p>
          </div>

          <div className="ce1-brief-insight">
            <p className="ce1-brief-kicker">Core insight</p>
            <p>
              A real decision situation must first be represented as a configured model of relevant actions, conditions, relationships and constraints.
            </p>
            <p>
              That representation is created through a facilitated modelling process. Cascade Engine executes the configured model; it does not autonomously determine what the organisation’s decision situation means.
            </p>
          </div>
        </div>

        <figure className="ce1-responsibility-figure">
          <div
            className="ce1-responsibility-diagram"
            role="img"
            aria-label={diagramAltText}
          >
            <section className="ce1-responsibility-group ce1-human-group">
              <h2>Human-led representation</h2>
              <div className="ce1-diagram-flow">
                <div className="ce1-diagram-node">
                  <h3>Real decision situation</h3>
                  <p>Decisions, conditions and domain knowledge</p>
                </div>
                <span className="ce1-diagram-arrow" aria-hidden="true">↓</span>
                <div className="ce1-diagram-node">
                  <h3>Facilitated modelling</h3>
                  <p>Relevant actions, relationships and constraints are made explicit</p>
                </div>
                <span className="ce1-diagram-arrow" aria-hidden="true">↓</span>
                <div className="ce1-diagram-node ce1-configured-model">
                  <h3>Configured model</h3>
                  <p>The analytical representation used by the engine</p>
                </div>
              </div>
            </section>

            <div className="ce1-execution-boundary" aria-hidden="true">
              <span>Model configured — engine execution begins</span>
              <span className="ce1-diagram-arrow">↓</span>
            </div>

            <section className="ce1-responsibility-group ce1-software-group">
              <h2>Software execution</h2>
              <div className="ce1-diagram-node">
                <h3>Deterministic analysis</h3>
                <p>Alternative paths are executed and compared</p>
              </div>
            </section>
          </div>
          <figcaption>
            A real decision situation does not enter Cascade Engine directly. Relevant actions, conditions, relationships and constraints are first represented through a facilitated modelling process. The engine then executes the resulting configured model deterministically.
          </figcaption>
        </figure>

        <div className="ce1-three-steps">
          <p className="ce1-brief-kicker">Three steps</p>
          <ol>
            <li>
              <span className="ce1-step-number">1.</span>
              <div>
                <h2>Identify</h2>
                <p>Decision-makers and domain experts determine what is material to the decision.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">2.</span>
              <div>
                <h2>Represent</h2>
                <p>Relevant actions, conditions, relationships and constraints are made explicit in a configured model.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">3.</span>
              <div>
                <h2>Execute</h2>
                <p>Cascade Engine runs and compares that representation deterministically.</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="ce1-brief-transition">
          <p className="ce1-brief-kicker">Transition</p>
          <a href="#full-analysis">Continue to the Full Analysis · 7–8 min</a>
        </div>
      </section>

      <section className="ce1-full-analysis" id="full-analysis" aria-labelledby="ce1-title">
        <p className="eyebrow">Cascade Engine · 1 of 6</p>
        <h1 className="page-title" id="ce1-title">Before Cascade Engine Can Analyse a Decision</h1>
        <InsightAuthorLine style={{ marginBottom: "14px" }} />
        <p className="ce1-reading-time">Estimated reading time: 7–8 minutes</p>

        <div className="article-prose ce1-prose">
          <p>A strategic decision does not enter an analytical engine as “a decision.” It has to be represented.</p>
          <p>What is changing? Which commitments are being made? What existing conditions matter? Which resources are shared? What depends on what? Which constraints are already present? And which alternative paths should be compared?</p>
          <p>Without that work, a decision remains a label. “Accelerate the transformation programme” may sound specific enough in a meeting. But it does not yet reveal which initiatives will run concurrently, which teams they will depend on, which commitments will become difficult to reverse, or how the sequence may affect what remains possible later.</p>
          <p>Before Cascade Engine can analyse a decision, the relevant structure has to be made explicit.</p>

          <h2>A real decision is not yet an analytical model</h2>
          <p>Organisational decisions arrive in many forms: a proposal, a target, a programme, a board resolution or a list of initiatives.</p>
          <p>These descriptions are meaningful to the people involved. But they usually combine several different things:</p>
          <ul>
            <li>intended actions,</li>
            <li>assumptions about what those actions will affect,</li>
            <li>existing operational conditions,</li>
            <li>dependencies between initiatives,</li>
            <li>resource requirements,</li>
            <li>and constraints that may emerge over time.</li>
          </ul>
          <p>An analytical engine cannot operate on the name of a decision alone. It needs an explicit representation of the parts that are relevant to the question being examined.</p>
          <p>That does not mean attempting to reproduce the entire organisation. A useful model is selective. It identifies the commitments, conditions and relationships that are considered material to a particular decision problem.</p>
          <p>Its purpose is not to become a complete digital copy of reality, but to create a sufficiently explicit structure for consistent comparison.</p>

          <h2>What has to be represented</h2>
          <p>Inside a configured Cascade Engine model, a decision situation can be represented through several types of elements.</p>
          <p><strong>Initial conditions</strong> describe the relevant starting point. These may include current operational pressure, available capacity, financial conditions or existing constraints.</p>
          <p><strong>Actions and commitments</strong> represent the changes being considered. An action may alter one or more parts of the configured state.</p>
          <p><strong>Drivers</strong> represent conditions that can change as actions are introduced and effects accumulate.</p>
          <p><strong>Relationships</strong> describe how changes in one part of the model may affect another. These relationships are defined as part of the model; they are not discovered automatically while the engine is running.</p>
          <p><strong>Constraints</strong> represent conditions that limit execution or alter how the model behaves when specified thresholds or states are reached.</p>
          <p><strong>Assumptions</strong> define how the represented elements interact. They make the analytical basis visible rather than leaving it implicit in a discussion.</p>
          <p><strong>Scenario paths</strong> determine which actions are introduced, in what order and under which starting conditions.</p>
          <p>Together, these elements form an explicit representation of the decision situation. They are not the decision itself. They are the structure through which the decision can be examined.</p>

          <h2>Where expert judgement enters</h2>
          <p>The software does not autonomously determine which parts of an organisation are relevant to a strategic question. That work belongs to the modelling process.</p>
          <p>Decision-makers and domain experts help identify which actions, relationships, pressures and constraints should be represented. They contribute the operational knowledge needed to distinguish a plausible model from an arbitrary one.</p>
          <p>This does not make every assumption objectively correct. Expert judgement can still be incomplete. Relationships can be disputed. Different people may interpret the same commitment differently. Some effects may be difficult to quantify or may depend on conditions outside the model.</p>
          <p>The value of the process is not that it removes judgement. It makes judgement explicit.</p>
          <p>Instead of leaving assumptions distributed across meetings, spreadsheets and individual interpretations, the modelling process turns selected assumptions into a structure that can be inspected and discussed.</p>
          <p>Questions that were previously implicit can then be asked directly:</p>
          <ul>
            <li>Is this relationship material?</li>
            <li>Is the assumed direction of the effect credible?</li>
            <li>Are we missing an important constraint?</li>
            <li>Are the two scenarios being compared on the same basis?</li>
            <li>Which assumptions are driving the difference between them?</li>
          </ul>
          <p>The model does not end disagreement. It gives disagreement a more precise object.</p>

          <h2>What becomes configured</h2>
          <p>Once the relevant structure has been identified, it becomes part of a configured model.</p>
          <p>The configured model defines the analytical environment in which Cascade Engine operates. It specifies the starting states, available actions, encoded effects, relationships, constraints and comparison paths.</p>
          <p>This distinction matters. A real organisation contains far more information than any single model can represent. The configured model therefore reflects a particular question and a particular analytical purpose.</p>
          <p>A model created to examine transformation overload may represent shared implementation capacity, sequencing pressure and operational constraints. A model created for another domain may use different drivers and relationships while retaining the same underlying analytical architecture.</p>
          <p>That shared architecture makes configuration across different contexts possible. It does not by itself establish that every domain model is independently calibrated or empirically validated.</p>
          <p>The quality of an analysis therefore depends on more than the engine. It also depends on whether the configured representation is relevant, coherent and appropriate for the decision being examined.</p>

          <h2>What Cascade Engine then does</h2>
          <p>Once the model has been configured, the responsibility shifts. Cascade Engine executes the represented structure.</p>
          <p>It applies encoded action effects, updates configured states, propagates eligible changes through defined relationships and records how the modelled conditions evolve over a sequence of steps.</p>
          <p>Alternative scenario paths can then be executed against the same analytical structure.</p>
          <p>Because the engine is deterministic, the same configured inputs and model version produce the same analytical outputs. This makes comparisons reproducible.</p>
          <p>Differences between scenario paths can be traced back to differences in actions, timing, assumptions or initial conditions rather than to random variation in the calculation.</p>
          <p>Determinism does not prove that the model’s assumptions are true. It establishes something different: computational consistency.</p>
          <p>The model can therefore be examined on two levels:</p>
          <ol>
            <li><strong>Are the represented assumptions and relationships credible?</strong></li>
            <li><strong>Given those assumptions, what does the engine calculate?</strong></li>
          </ol>
          <p>Keeping those questions separate is essential. Otherwise, repeatable calculation can be mistaken for empirical certainty.</p>

          <h2>Representation makes the analysis inspectable</h2>
          <p>The main value of explicit representation is not that it eliminates uncertainty or produces an unquestionable answer. It makes the basis of the analysis visible.</p>
          <p>Actions can be traced to their encoded effects. Relationships can be inspected. Constraints can be identified. Alternative paths can be compared using the same assumptions.</p>
          <p>When a result is challenged, the discussion can return to the structure that produced it.</p>
          <p>This creates a different kind of decision conversation. Instead of asking only whether someone agrees with the conclusion, the organisation can examine what the conclusion depends on.</p>
          <p>That makes it possible to revise assumptions before execution, compare competing interpretations and understand why two apparently similar strategies produce different analytical trajectories.</p>
          <p>Cascade Engine does not replace the work of representing the decision situation. It makes that representation executable.</p>
          <p>And once the structure has been made explicit, the next question is no longer only which actions are included. It is also the order in which they occur.</p>
        </div>
      </section>
    </article>
  );
}
