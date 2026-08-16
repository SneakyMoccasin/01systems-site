import Image from "next/image";
import { InsightAuthorLine } from "@/components/insight-author-line";

const flowAltText =
  "One-way flow from deterministic analysis to Analytical Results, Structural Findings and then AI Interpretation, with no write-back.";

export function CascadeEngineArticleSix() {
  return (
    <article className="ce1-article">
      <section className="ce1-brief" aria-labelledby="ce6-brief-heading">
        <p className="ce1-brief-label" id="ce6-brief-heading">
          Executive Brief · 1 min
        </p>

        <div className="ce1-brief-opening">
          <div className="ce1-brief-question">
            <p className="ce1-brief-kicker">The question</p>
            <p className="ce1-brief-question-text">
              Where does AI enter Cascade Engine — and what can it change?
            </p>
          </div>

          <div className="ce1-brief-insight">
            <p className="ce1-brief-kicker">Core insight</p>
            <p>AI enters only after Cascade Engine has completed the deterministic analysis.</p>
            <p>
              It can explain, summarise and contextualise existing results, but it cannot alter the analytical state, write back into the engine or create new analytical evidence.
            </p>
          </div>
        </div>

        <figure className="ce6-flow-figure">
          <p className="ce4-concept-label">Conceptual illustration</p>
          <div className="ce6-flow-diagram" role="img" aria-label={flowAltText}>
            <section className="ce6-flow-group ce6-deterministic-group">
              <div className="ce6-flow-node">
                <h2>Deterministic analysis</h2>
              </div>
              <span className="ce6-flow-arrow" aria-hidden="true">→</span>
              <div className="ce6-flow-node">
                <h2>Analytical Results</h2>
              </div>
              <span className="ce6-flow-arrow" aria-hidden="true">→</span>
              <div className="ce6-flow-node ce6-findings-node">
                <h2>Structural Findings</h2>
                <p>No language model</p>
              </div>
            </section>

            <div className="ce6-one-way-boundary">
              <span>One-way flow · No write-back</span>
            </div>

            <section className="ce6-flow-group ce6-ai-group">
              <div className="ce6-flow-node ce6-ai-node">
                <h2>AI Interpretation</h2>
                <p>Downstream explanation · No new analytical evidence</p>
              </div>
            </section>
          </div>
        </figure>

        <div className="ce1-three-steps">
          <p className="ce1-brief-kicker">Three steps</p>
          <ol>
            <li>
              <span className="ce1-step-number">1.</span>
              <div>
                <h2>Analysis is completed</h2>
                <p>The configured model produces Analytical Results deterministically.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">2.</span>
              <div>
                <h2>Findings are selected</h2>
                <p>Structural Findings organises relevant results without using a language model.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">3.</span>
              <div>
                <h2>AI explains downstream</h2>
                <p>AI Interpretation expresses the existing analytical state in flexible language. The wording may vary; the underlying result does not.</p>
              </div>
            </li>
          </ol>
        </div>

        <figure className="ce6-product-evidence">
          <div className="ce6-product-crop">
            <Image
              src="/images/cascade-engine-ai-interpretation.png"
              alt="Cascade Engine interface showing a completed system status above a separate downstream AI Interpretation panel."
              width={1470}
              height={1168}
              sizes="(max-width: 760px) calc(100vw - 76px), 1074px"
            />
          </div>
          <figcaption>
            The system status is derived from the completed analytical state. AI Interpretation operates downstream on those results and can vary in wording without changing the analytical result it describes.
          </figcaption>
        </figure>

        <div className="ce1-brief-transition">
          <p className="ce1-brief-kicker">Transition</p>
          <a href="#full-analysis">Continue to the Full Analysis · 8–9 min</a>
        </div>
      </section>

      <section className="ce1-full-analysis" id="full-analysis" aria-labelledby="ce6-title">
        <p className="eyebrow">Cascade Engine · 6 of 6</p>
        <h1 className="page-title" id="ce6-title">Where AI Enters — and Where It Does Not</h1>
        <InsightAuthorLine style={{ marginBottom: "14px" }} />
        <p className="ce1-reading-time">Estimated reading time: 8–9 minutes</p>

        <div className="article-prose ce1-prose">
          <p>By the time AI Interpretation enters Cascade Engine, the analysis already exists.</p>
          <p>The scenarios have been executed. The trajectories have been calculated. Driver and constraint states have been established. Structural Findings may already have selected the results that deserve primary attention.</p>
          <p>The language model enters after that work is complete.</p>
          <p>Its role is not to perform the analysis.</p>
          <p>Its role is to explain completed analytical results in flexible language.</p>

          <h2>The analysis already exists</h2>
          <p>Cascade Engine’s analytical foundation is deterministic.</p>
          <p>A configured scenario is executed through the engine. Actions affect represented conditions. Encoded relationships propagate eligible changes. Structural margin, trajectories and constraint states are calculated as the model evolves.</p>
          <p>Those outputs exist before AI Interpretation is called.</p>
          <p>This order matters because it establishes where the analytical result comes from.</p>
          <p>The language model does not receive an unresolved strategic decision and then determine what the structural consequences are. It receives a representation of results that have already been produced by the configured model.</p>
          <p>The analytical provenance is therefore upstream.</p>
          <p>AI Interpretation can describe the result.</p>
          <p>It is not the source of the result.</p>

          <h2>What AI Interpretation receives</h2>
          <p>Once the deterministic analysis is complete, selected analytical information can be passed downstream to AI Interpretation.</p>
          <p>This may include structured information such as:</p>
          <ul>
            <li>scenario summaries,</li>
            <li>differences between trajectories,</li>
            <li>relevant driver states,</li>
            <li>constraint states,</li>
            <li>structural-margin changes,</li>
            <li>selected Structural Findings,</li>
            <li>and contextual metadata needed to describe the result coherently.</li>
          </ul>
          <p>The language model operates on that supplied material.</p>
          <p>It does not receive authority to alter the configured actions, relationships, thresholds, constraints or analytical histories that produced it.</p>
          <p>In the current architecture, the direction of travel is one way:</p>
          <blockquote>
            <p>Completed analytical result<br />→ AI Interpretation</p>
          </blockquote>
          <p>There is no write path from the interpretation layer back into the analytical engine or scenario state.</p>
          <p>That boundary describes the implemented system today. It is an architectural property of the current product, not a permanent claim about every possible future version.</p>

          <h2>What the language model adds</h2>
          <p>Structured analytical results are not always easy to read.</p>
          <p>A scenario may contain several trajectories, changed drivers, active constraints and differences between alternative paths. A technical representation can preserve those results accurately while still requiring effort to interpret.</p>
          <p>AI Interpretation adds linguistic flexibility.</p>
          <p>It can:</p>
          <ul>
            <li>summarise several outputs in a coherent passage,</li>
            <li>restate technical information in more accessible language,</li>
            <li>compare two scenario paths,</li>
            <li>connect related results in prose,</li>
            <li>contextualise a constraint or driver change,</li>
            <li>and formulate questions for further examination.</li>
          </ul>
          <p>This can make the analysis easier to approach for readers with different levels of technical familiarity.</p>
          <p>The value lies in expression and synthesis.</p>
          <p>The language model can turn structured results into a readable explanation without becoming the source of the underlying calculation.</p>
          <p>That distinction allows the product to combine a stable analytical core with a more flexible explanatory layer.</p>

          <h2>Same result, different wording</h2>
          <p>Deterministic analysis and generated language behave differently.</p>
          <p>If the same configured model receives the same inputs under the same engine version, the analytical result remains the same.</p>
          <p>A language model may express that result differently on separate requests.</p>
          <p>One explanation may begin with the constraint state. Another may emphasise the divergence between trajectories. A third may organise the same information around the primary modelled driver.</p>
          <p>The wording, structure and emphasis may vary.</p>
          <p>The upstream result does not.</p>
          <p>This gives the two layers different forms of consistency.</p>
          <p>The engine provides computational repeatability.</p>
          <p>AI Interpretation provides adaptable language.</p>
          <p>Variation in the explanation should therefore not be mistaken for variation in the analytical state. Conversely, fluent and confident wording should not be mistaken for additional analytical evidence.</p>
          <p>The prose is generated from the result.</p>
          <p>It does not change the result it describes.</p>

          <h2>What AI Interpretation cannot change</h2>
          <p>In the current implemented architecture, AI Interpretation cannot alter:</p>
          <ul>
            <li>configured inputs,</li>
            <li>action effects,</li>
            <li>encoded relationships,</li>
            <li>thresholds,</li>
            <li>constraint logic,</li>
            <li>scenario histories,</li>
            <li>calculated trajectories,</li>
            <li>structural-margin values,</li>
            <li>Structural Findings,</li>
            <li>or the engine state.</li>
          </ul>
          <p>It can generate language about those outputs.</p>
          <p>It cannot write a different result back into them.</p>
          <p>This boundary is important for more than technical clarity.</p>
          <p>It means that an unavailable, delayed or unsuccessful AI request does not invalidate the completed analysis. The deterministic result still exists. Structural Findings can still present selected outputs. The scenario state remains unchanged.</p>
          <p>AI Interpretation is therefore an optional downstream capability, not a dependency of the analytical calculation itself.</p>
          <p>That separation allows the explanatory layer to vary or fail gracefully without changing the analytical result it is designed to describe.</p>
          <p>Its presence can improve accessibility.</p>
          <p>Its absence does not remove the result.</p>

          <h2>Different provenance, different authority</h2>
          <p>Not every statement shown in an analytical product has the same origin.</p>
          <p>A structural-margin value comes from the configured analytical model.</p>
          <p>A constraint state comes from encoded engine logic.</p>
          <p>A Structural Finding comes from deterministic selection and presentation of completed outputs.</p>
          <p>An AI Interpretation comes from a language model operating on those outputs.</p>
          <p>These layers may refer to the same scenario, but they do not have identical evidentiary status.</p>
          <p>A model-derived value can be traced to the configured assumptions and calculation.</p>
          <p>A deterministic finding can be traced to an upstream analytical state and fixed selection logic.</p>
          <p>Generated prose must be evaluated as language produced from that material.</p>
          <p>It may accurately summarise the result. It may make the relationship between several outputs easier to follow. It may formulate a useful implication or question.</p>
          <p>But fluency does not create authority.</p>
          <p>An AI-generated explanation should remain traceable to the analytical output it describes and open to human review.</p>
          <p>If a sentence cannot be supported by the supplied result, its confident phrasing does not make it an additional finding.</p>

          <h2>Structural Findings and AI Interpretation</h2>
          <p>Structural Findings and AI Interpretation both help make analytical results usable, but they perform different functions.</p>
          <p>Structural Findings selects and presents completed results through deterministic product logic.</p>
          <p>AI Interpretation generates flexible language from completed results.</p>
          <p>The first is stable and repeatable under the same analytical state and product version.</p>
          <p>The second may vary in wording, structure and emphasis.</p>
          <p>The distinction is not that one layer is useful and the other is decorative.</p>
          <p>They solve different presentation problems.</p>
          <p>Structural Findings creates a consistent view of which model-derived outputs are brought forward.</p>
          <p>AI Interpretation makes those outputs easier to explain, compare and discuss in natural language.</p>
          <p>Keeping them separate preserves both benefits:</p>
          <ul>
            <li>stable analytical provenance,</li>
            <li>and adaptable explanation.</li>
          </ul>

          <h2>Why the separation matters</h2>
          <p>The architecture assigns different responsibilities to different layers.</p>
          <p>The engine calculates.</p>
          <p>Structural Findings selects and surfaces.</p>
          <p>AI Interpretation explains and synthesises.</p>
          <p>People assess relevance, challenge assumptions and make the decision.</p>
          <p>This separation makes it possible to ask:</p>
          <ul>
            <li>What was calculated?</li>
            <li>What was selected for presentation?</li>
            <li>What was generated as language?</li>
            <li>Which statement can be traced directly to the configured model?</li>
            <li>Which statement requires review as an AI-generated explanation?</li>
          </ul>
          <p>These questions are practical.</p>
          <p>They help prevent a readable explanation from being mistaken for a calculation, and a deterministic output from being mistaken for an unquestionable fact about the organisation.</p>
          <p>The system does not need to choose between analytical consistency and accessible language.</p>
          <p>It assigns them to different layers.</p>

          <h2>The complete chain</h2>
          <blockquote>
            <p>Real decision situation<br />→ facilitated modelling<br />→ configured model<br />→ deterministic execution<br />→ Analytical Results<br />→ Structural Findings<br />→ AI Interpretation<br />→ human judgement</p>
          </blockquote>
          <p>Cascade Engine does not use AI to replace the analytical structure.</p>
          <p>It uses AI after that structure has already produced a result.</p>
          <p>The distinction is architectural, but its consequence is practical:</p>
          <p>Readers can see what was calculated, what was selected and what was generated as language.</p>
        </div>
      </section>
    </article>
  );
}
