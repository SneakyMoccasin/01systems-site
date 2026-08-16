import Image from "next/image";
import { InsightAuthorLine } from "@/components/insight-author-line";

const conceptualAltText =
  "Conceptual flow from completed Structural Analysis and Analytical Results through deterministic selection to Structural Findings.";

export function CascadeEngineArticleFive() {
  return (
    <article className="ce1-article">
      <section className="ce1-brief" aria-labelledby="ce5-brief-heading">
        <p className="ce1-brief-label" id="ce5-brief-heading">
          Executive Brief · 1 min
        </p>

        <div className="ce1-brief-opening">
          <div className="ce1-brief-question">
            <p className="ce1-brief-kicker">The question</p>
            <p className="ce1-brief-question-text">
              How are completed analytical calculations turned into findings a reader can inspect?
            </p>
          </div>

          <div className="ce1-brief-insight">
            <p className="ce1-brief-kicker">Core insight</p>
            <p>
              After the analytical calculations are complete, Cascade Engine deterministically selects and organises relevant results into Structural Findings.
            </p>
            <p>
              This layer presents the existing analytical state; it does not perform a second analysis or use a language model.
            </p>
          </div>
        </div>

        <figure className="ce5-concept-figure">
          <p className="ce5-concept-label">Conceptual illustration</p>
          <div className="ce5-concept-diagram" role="img" aria-label={conceptualAltText}>
            <section className="ce5-flow-group ce5-upstream-group">
              <h2>Upstream analytical state</h2>
              <div className="ce5-flow-nodes">
                <div className="ce5-flow-node">
                  <h3>Structural Analysis</h3>
                  <p>Calculations are complete</p>
                </div>
                <span aria-hidden="true">→</span>
                <div className="ce5-flow-node">
                  <h3>Analytical Results</h3>
                  <p>Results already exist</p>
                </div>
              </div>
            </section>

            <div className="ce5-presentation-boundary">
              <span className="ce5-boundary-arrow" aria-hidden="true">→</span>
              <div className="ce5-boundary-node">
                <h2>Deterministic selection</h2>
                <p>Relevant outputs are selected</p>
              </div>
              <span className="ce5-boundary-arrow" aria-hidden="true">→</span>
            </div>

            <section className="ce5-flow-group ce5-downstream-group">
              <h2>Downstream presentation</h2>
              <div className="ce5-flow-node ce5-findings-node">
                <h3>Structural Findings</h3>
                <p>Findings are organised and surfaced</p>
              </div>
              <div className="ce5-claim-limits">
                <span>No language model</span>
                <span>No new analytical evidence</span>
              </div>
            </section>
          </div>
          <figcaption>
            Conceptual illustration: Structural Findings selects and organises completed Analytical Results through deterministic product logic. It presents existing model-derived outputs; it does not perform a second analysis or create new analytical evidence.
          </figcaption>
        </figure>

        <div className="ce1-three-steps">
          <p className="ce1-brief-kicker">Three key points</p>
          <ol>
            <li>
              <span className="ce1-step-number">1.</span>
              <div>
                <h2>Results already exist</h2>
                <p>Analytical Results are produced before Structural Findings begins.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">2.</span>
              <div>
                <h2>Selection is deterministic</h2>
                <p>Fixed product logic surfaces relevant drivers, constraints, propagation paths and scenario differences.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">3.</span>
              <div>
                <h2>Presentation is not proof</h2>
                <p>Labels such as <code>Primary Driver</code> identify what is prioritised within the model-derived result, not a universally proven real-world root cause.</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="ce1-brief-transition">
          <p className="ce1-brief-kicker">Transition</p>
          <a href="#full-analysis">Continue to the Full Analysis · 8–9 min</a>
        </div>
      </section>

      <section className="ce1-full-analysis" id="full-analysis" aria-labelledby="ce5-title">
        <p className="eyebrow">Cascade Engine · 5 of 6</p>
        <h1 className="page-title" id="ce5-title">From Calculations to Structural Findings</h1>
        <InsightAuthorLine style={{ marginBottom: "14px" }} />
        <p className="ce1-reading-time">Estimated reading time: 8–9 minutes</p>

        <div className="article-prose ce1-prose">
          <p>Consider a scenario comparison with two diverging trajectories, three changed drivers, one active constraint and a recorded propagation chain.</p>
          <p>All of those outputs may be relevant.</p>
          <p>But presenting every value, state change and intermediate result with equal prominence would make the analysis harder to use, not easier.</p>
          <p>The problem is therefore not only to calculate the result.</p>
          <p>It is to decide which parts of the completed analytical state should be surfaced first, how they should be organised and how their origin should remain visible.</p>
          <p>That is the role of Structural Findings.</p>

          <h2>Calculation produces more than one result</h2>
          <p>A Cascade Engine scenario does not produce a single answer.</p>
          <p>It produces a structured analytical state.</p>
          <p>That state may contain:</p>
          <ul>
            <li>trajectory histories,</li>
            <li>current and terminal values,</li>
            <li>changed drivers,</li>
            <li>constraint states,</li>
            <li>scenario differences,</li>
            <li>and recorded cascade events.</li>
          </ul>
          <p>These outputs already exist before Structural Findings is rendered.</p>
          <p>The engine has executed the configured scenario. The relevant states have changed. Relationships have propagated. Margins, thresholds and constraints have been evaluated. The analytical result is therefore upstream of the presentation layer.</p>
          <p>Structural Findings does not create that result.</p>
          <p>It determines which parts should be brought forward and how they should be arranged for review.</p>

          <h2>Analytical Results are upstream</h2>
          <p>The architectural sequence is:</p>
          <blockquote>
            <p>Structural Analysis<br />→ Analytical Results<br />→ Structural Findings</p>
          </blockquote>
          <p>Structural Analysis performs the calculations.</p>
          <p>Analytical Results contain the completed output of those calculations.</p>
          <p>Structural Findings receives that output downstream.</p>
          <p>This separation matters because it preserves provenance.</p>
          <p>A displayed statement about a trajectory, driver or constraint should be traceable to an analytical state that already exists. The presentation layer may select, summarise and organise the result, but it does not sit inside the calculation loop and it does not change the model state.</p>
          <p>The distinction is similar to the difference between producing a technical analysis and preparing an executive view of that analysis.</p>
          <p>The executive view may determine what appears first, what receives emphasis and which relationships are made visible. That work is meaningful. But it does not alter where the evidence originated.</p>

          <h2>What Structural Findings selects</h2>
          <p>A completed analytical state can contain more detail than a decision-maker can reasonably examine at once.</p>
          <p>Structural Findings narrows that state into a prioritised presentation.</p>
          <p>Depending on the scenario, it may surface:</p>
          <ul>
            <li>the main modelled difference between two paths,</li>
            <li>a relevant structural-margin change,</li>
            <li>an active constraint,</li>
            <li>a recorded propagation chain,</li>
            <li>or a driver that carries particular analytical significance within the result.</li>
          </ul>
          <p>One visible label in the current interface is <strong>Primary Driver</strong>.</p>
          <p>That phrase requires precision.</p>
          <p>It does not mean that the system has independently discovered the definitive real-world root cause of the scenario.</p>
          <p>It means that, within the completed model output and under the current deterministic selection logic, one configured driver has been selected for primary presentation.</p>
          <p>“Primary” therefore refers to priority within the model-derived result.</p>
          <p>It remains dependent on:</p>
          <ul>
            <li>which drivers were represented,</li>
            <li>how the model was configured,</li>
            <li>what happened in the scenario,</li>
            <li>and how the presentation logic ranks relevance.</li>
          </ul>
          <p>The label helps the reader know where to look first.</p>
          <p>It does not close the question of causality.</p>

          <figure className="ce5-product-figure">
            <div className="ce5-product-crop">
              <Image
                src="/images/cascade-engine-structural-findings.png"
                alt="Cascade Engine Structural Findings panel showing a summary, system driver, primary driver and traceable model-derived outputs."
                width={398}
                height={848}
                sizes="(max-width: 760px) calc(100vw - 76px), 398px"
              />
            </div>
            <figcaption>
              The product view shows Structural Findings presenting selected outputs from an already completed analytical state. Labels such as <code>Primary Driver</code> indicate deterministic presentation priority within the configured model result, not an independently proven real-world root cause.
            </figcaption>
          </figure>

          <h2>Deterministic presentation</h2>
          <p>Structural Findings is deterministic.</p>
          <p>Given the same completed analytical state and the same product version, the same selection and presentation logic produces the same findings.</p>
          <p>This supports consistency.</p>
          <p>Two reviewers looking at the same completed scenario are not shown different findings because of random generation. The same modelled driver, constraint state or scenario difference remains available for the same kind of review.</p>
          <p>Deterministic presentation also helps preserve traceability.</p>
          <p>A selected statement can be linked back to:</p>
          <ul>
            <li>a trajectory,</li>
            <li>a driver state,</li>
            <li>a constraint condition,</li>
            <li>a scenario delta,</li>
            <li>or a recorded cascade event.</li>
          </ul>
          <p>The presentation is therefore stable enough to examine and challenge.</p>
          <p>That does not make every displayed statement an independently verified fact about the organisation.</p>
          <p>Repeatability establishes consistency in how the analytical state is selected and presented. The evidentiary status still comes from the configured model and the upstream calculations.</p>

          <h2>Selection is not new evidence</h2>
          <p>Structural Findings adds order and visibility.</p>
          <p>It can:</p>
          <ul>
            <li>summarise,</li>
            <li>prioritise,</li>
            <li>group,</li>
            <li>label,</li>
            <li>and narrate completed results.</li>
          </ul>
          <p>Those are meaningful product responsibilities.</p>
          <p>Without selection, a technically complete analysis may remain difficult to inspect. Important differences can be buried among lower-priority outputs. A relevant constraint may receive the same visual weight as a minor state change. A propagation chain may be present in the data without being easy to follow.</p>
          <p>Structural Findings addresses that problem by surfacing selected results in a structured form.</p>
          <p>But selection does not create a new analytical result.</p>
          <p>The layer does not rerun the scenario, introduce a new relationship, validate an assumption or retrieve external evidence. Every finding should remain grounded in a result that already exists upstream.</p>
          <p>This is why phrases such as <strong>Primary Driver</strong>, <strong>Structural Margin</strong>, <strong>Constraint State</strong> and <strong>Propagation Chain</strong> should be read as organised views of the completed model output.</p>
          <p>They are not separate analytical engines hidden behind the interface.</p>

          <h2>Why the separation matters</h2>
          <p>Separating calculation from presentation creates a clearer chain of responsibility.</p>
          <p>The configured model defines the analytical structure.</p>
          <p>Structural Analysis executes that structure.</p>
          <p>Analytical Results contain the completed outputs.</p>
          <p>Structural Findings selects and surfaces relevant parts of those outputs.</p>
          <p>Decision-makers and domain experts then assess what those findings mean in the real decision context.</p>
          <p>Each stage has a different role.</p>
          <p>That makes it possible to ask more precise questions:</p>
          <ul>
            <li>Which result is being presented?</li>
            <li>Where did it originate?</li>
            <li>Which configured assumption influenced it?</li>
            <li>Why was it surfaced ahead of other outputs?</li>
            <li>Is the statement a calculated state, a selected summary or a later interpretation?</li>
          </ul>
          <p>These questions improve the use of the analysis because they preserve the distinction between result and presentation.</p>
          <p>The value of Structural Findings is therefore not that it reveals a hidden truth absent from the model.</p>
          <p>Its value is that it creates order within the completed analytical state and keeps the selected results visible, prioritised and traceable.</p>
          <p>That is more than formatting.</p>
          <p>A good presentation layer determines whether the analytical structure can be reviewed coherently or remains dispersed across charts, histories and state changes.</p>
          <p>At the same time, the layer remains downstream.</p>
          <p>Its authority comes from the analytical result it presents, not from a separate claim to discovery.</p>

          <h2>Structural Findings and AI Interpretation</h2>
          <p>Structural Findings does not use a language model.</p>
          <p>Its selection and presentation are deterministic.</p>
          <p>AI Interpretation is a separate downstream layer.</p>
          <p>That distinction matters because the two layers have different provenance.</p>
          <p>Structural Findings presents model-derived outputs according to fixed product logic.</p>
          <p>AI Interpretation can explain completed results in more flexible language. Its wording may vary, even when the upstream analytical state remains unchanged.</p>
          <p>The two layers may discuss the same scenario.</p>
          <p>They do not perform the same function.</p>
          <p>Structural Findings provides a stable, traceable presentation of selected results.</p>
          <p>AI Interpretation adds a language-based explanation of those results.</p>
          <p>Once that boundary is clear, the next question becomes unavoidable:</p>
          <p>What happens when a language model enters the system—and what authority should its explanation have?</p>
        </div>
      </section>
    </article>
  );
}
