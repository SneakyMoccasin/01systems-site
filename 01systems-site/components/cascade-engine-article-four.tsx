import Image from "next/image";
import { InsightAuthorLine } from "@/components/insight-author-line";

const conceptualAltText =
  "Conceptual illustration of two scenario paths passing through different histories of pressure and constraint exposure before ending within a similar range; not calculated Cascade Engine output.";

const graphAltText =
  "Graph comparing two deterministic structural-margin trajectories within a configured model, including a constraint activation window and different histories of pressure and recovery.";

export function CascadeEngineArticleFour() {
  return (
    <article className="ce1-article">
      <section className="ce1-brief" aria-labelledby="ce4-brief-heading">
        <p className="ce1-brief-label" id="ce4-brief-heading">
          Executive Brief · 1 min
        </p>

        <div className="ce1-brief-opening">
          <div className="ce1-brief-question">
            <p className="ce1-brief-kicker">The question</p>
            <p className="ce1-brief-question-text">
              What do structural margin and constraints reveal about a scenario path?
            </p>
          </div>

          <div className="ce1-brief-insight">
            <p className="ce1-brief-kicker">Core insight</p>
            <p>
              Structural margin is a model-relative indicator of how much execution flexibility remains under the configured conditions and assumptions.
            </p>
            <p>
              Tracking it across a trajectory can show when modelled pressure accumulates, when a constraint becomes active and whether the path later recovers.
            </p>
          </div>
        </div>

        <figure className="ce4-concept-figure">
          <p className="ce4-concept-label">Conceptual illustration</p>
          <div
            className="ce4-concept-diagram"
            role="img"
            aria-label={conceptualAltText}
          >
            <div className="ce4-concept-context">
              <span>Different path histories</span>
              <span>Similar terminal range</span>
            </div>
            <svg
              viewBox="0 0 900 300"
              aria-hidden="true"
              focusable="false"
              preserveAspectRatio="none"
            >
              <path className="ce4-guide-line" d="M44 44 H856" />
              <path className="ce4-guide-line" d="M44 256 H856" />
              <path
                className="ce4-path ce4-path-a"
                d="M44 144 C150 56 248 70 325 150 C390 217 454 223 525 157 C612 76 714 84 856 130"
              />
              <path
                className="ce4-path ce4-path-b"
                d="M44 146 C136 176 196 238 282 220 C366 202 399 84 494 102 C588 120 668 178 856 142"
              />
              <path className="ce4-exposure-marker" d="M250 72 V238" />
              <path className="ce4-exposure-marker" d="M430 72 V238" />
              <circle className="ce4-terminal" cx="856" cy="130" r="7" />
              <circle className="ce4-terminal" cx="856" cy="142" r="7" />
            </svg>
            <div className="ce4-concept-notes" aria-hidden="true">
              <span>Different pressure and constraint exposure</span>
              <span>Endpoints remain within a comparable range</span>
            </div>
          </div>
          <figcaption>
            Conceptual illustration: Two scenario paths can pass through different histories of pressure and constraint exposure while ending within a similar range. The illustration explains the analytical principle; it is not a calculated Cascade Engine output.
          </figcaption>
        </figure>

        <div className="ce1-three-steps">
          <p className="ce1-brief-kicker">Three key points</p>
          <ol>
            <li>
              <span className="ce1-step-number">1.</span>
              <div>
                <h2>The path matters</h2>
                <p>A terminal value does not preserve the full history of pressure, threshold exposure and recovery.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">2.</span>
              <div>
                <h2>Constraints add context</h2>
                <p>Configured thresholds show when the modelled path enters a more limited analytical state.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">3.</span>
              <div>
                <h2>The result is conditional</h2>
                <p>Structural margin is deterministic and model-relative. It is not a probability, forecast or universal measure of optionality.</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="ce1-brief-transition">
          <p className="ce1-brief-kicker">Transition</p>
          <a href="#full-analysis">Continue to the Full Analysis · 9–10 min</a>
        </div>
      </section>

      <section className="ce1-full-analysis" id="full-analysis" aria-labelledby="ce4-title">
        <p className="eyebrow">Cascade Engine · 4 of 6</p>
        <h1 className="page-title" id="ce4-title">Structural Margin and Constraints</h1>
        <InsightAuthorLine style={{ marginBottom: "14px" }} />
        <p className="ce1-reading-time">Estimated reading time: 9–10 minutes</p>

        <div className="article-prose ce1-prose">
          <p>Two scenarios can end at a similar point and still have travelled through very different structural conditions.</p>
          <p>One may retain substantial room to adjust for most of the simulated period. Another may cross a configured threshold early, spend several steps under constraint and recover only near the end.</p>
          <p>A final value cannot show that difference on its own.</p>
          <p>Cascade Engine therefore records not only where a configured scenario ends, but how its analytical state develops over time. Structural margin, trajectories, thresholds and constraint states provide different views of that development.</p>
          <p>Their value lies in comparison within the configured model.</p>

          <h2>A trajectory is more than an endpoint</h2>
          <p>A terminal value summarises the state reached at the end of a simulated path.</p>
          <p>It does not preserve the full history that produced it.</p>
          <p>Consider two simplified scenarios with similar terminal values.</p>
          <p>In the first, structural margin changes gradually and remains above a configured threshold throughout most of the simulation.</p>
          <p>In the second, margin falls more quickly, crosses the threshold earlier and remains under an active constraint for several steps before recovering.</p>
          <p>The endpoint may look similar. The paths are structurally different within the model.</p>
          <p>That difference can matter because decisions are rarely made only at the final step. An organisation may need to respond, invest, delay or adapt while the scenario is still unfolding. A period of reduced flexibility can therefore affect which later actions remain feasible even if the terminal state eventually improves.</p>
          <p>Recording the trajectory makes those intermediate conditions visible.</p>
          <p>It allows the analysis to distinguish between:</p>
          <ul>
            <li>an early reduction followed by recovery,</li>
            <li>a prolonged period near a threshold,</li>
            <li>sustained constraint exposure,</li>
            <li>and a path that preserves more modelled flexibility until later.</li>
          </ul>
          <p>The trajectory does not determine which path an organisation should choose. It provides a more complete basis for comparing what each configured path entails.</p>

          <h2>What structural margin represents</h2>
          <p>Structural margin is a deterministic, model-relative analytical output.</p>
          <p>It summarises how much execution flexibility remains under the conditions and assumptions represented in the configured model.</p>
          <p>The phrase <strong>model-relative</strong> is essential.</p>
          <p>Structural margin derives its meaning from:</p>
          <ul>
            <li>the states and drivers included in the model,</li>
            <li>the relationships represented between them,</li>
            <li>the configured effects of actions,</li>
            <li>the thresholds and constraints applied,</li>
            <li>and the assumptions governing the scenario.</li>
          </ul>
          <p>It is therefore meaningful within that analytical structure.</p>
          <p>Structural margin is not a probability of success. It is not a confidence score, a standardised measure of organisational health or a universally calibrated unit of optionality.</p>
          <p>Its purpose is more specific: to support consistent comparison between scenario paths that are executed within the same configured model.</p>
          <p>If one path retains greater structural margin than another at a particular simulated step, the model is indicating that more execution flexibility remains under the assumptions represented there.</p>
          <p>That comparison can direct attention to an important difference.</p>
          <p>It does not, by itself, establish that the corresponding strategy is objectively superior. The paths may involve different objectives, trade-offs or consequences that extend beyond the model.</p>

          <h2>Why the history matters</h2>
          <p>Structural margin can be examined at several points.</p>
          <p>The <strong>current value</strong> describes the modelled state at a particular step.</p>
          <p>The <strong>history</strong> shows how that state developed.</p>
          <p>A <strong>threshold crossing</strong> indicates that the trajectory has moved into a differently defined model state.</p>
          <p>The <strong>terminal value</strong> summarises where the scenario ends.</p>
          <p>Each answers a different question.</p>
          <p>A terminal value can show that two paths finish in similar positions. Their histories may reveal that one reached that position through sustained pressure while the other retained flexibility for longer.</p>
          <p>Similarly, a positive terminal value does not erase an earlier period under constraint. A lower terminal value does not reveal whether the decline was gradual, abrupt or preceded by a long stable period.</p>
          <p>This is why comparison should not be reduced to a single final number.</p>
          <p>The path can reveal:</p>
          <ul>
            <li>when divergence began,</li>
            <li>how long it persisted,</li>
            <li>whether recovery occurred,</li>
            <li>which configured conditions changed first,</li>
            <li>and whether constraint exposure appeared before the endpoint.</li>
          </ul>
          <p>These distinctions give decision-makers a richer object for examination than a simple ranking.</p>

          <h2>What constraints represent</h2>
          <p>A constraint is a configured limiting condition inside the analytical model.</p>
          <p>It represents a state in which some aspect of execution becomes restricted, more difficult to sustain or more influential on later calculations.</p>
          <p>Constraints can take different forms depending on the decision question and domain being represented. They may relate to capacity, liquidity, implementation pressure, recovery ability or another condition considered material to the analysis.</p>
          <p>The configured model defines:</p>
          <ul>
            <li>which condition constitutes the constraint,</li>
            <li>when it becomes active,</li>
            <li>and how it affects later analytical states.</li>
          </ul>
          <p>When the engine executes a scenario, it evaluates whether those encoded conditions have been met. If they have, the constraint becomes part of the evolving model state.</p>
          <p>This allows a scenario comparison to examine more than whether margin rises or falls.</p>
          <p>It can also show whether a path:</p>
          <ul>
            <li>reaches a configured limiting condition,</li>
            <li>remains there for several simulated steps,</li>
            <li>recovers from it,</li>
            <li>or encounters it earlier than another path.</li>
          </ul>
          <p>The constraint therefore adds structural context to the trajectory.</p>

          <h2>Activation is conditional</h2>
          <p>A graph may show that a constraint activates at a particular point in the simulated sequence or within a displayed activation window.</p>
          <p>That timing belongs to the configured scenario.</p>
          <p>It means that, under the model’s starting conditions, actions, relationships and assumptions, the encoded activation conditions are met at that stage of the simulation.</p>
          <p>This is analytically useful because it allows the organisation to examine what preceded the activation and how the constraint affects later states.</p>
          <p>It can ask:</p>
          <ul>
            <li>Which earlier actions contributed to the threshold crossing?</li>
            <li>Which assumptions determine the timing?</li>
            <li>Would a different sequence delay or remove the activation?</li>
            <li>Which later options become harder to sustain while the constraint is active?</li>
          </ul>
          <p>The displayed timing is not an exact forecast of when an external event will occur.</p>
          <p>Its purpose is to expose the conditional structure:</p>
          <blockquote>
            <p>If the represented conditions develop in this way, the configured constraint becomes active at this point in the modelled path.</p>
          </blockquote>
          <p>This distinction preserves the value of the output without turning simulated timing into a prediction.</p>

          <figure className="ce4-product-figure">
            <div className="ce4-product-image">
              <Image
                src="/images/cascade-engine-structural-margin.png"
                alt={graphAltText}
                width={1500}
                height={1044}
                sizes="(max-width: 760px) calc(100vw - 48px), 760px"
              />
            </div>
            <figcaption>
              The graph shows deterministic trajectories within one configured model, including a conditional constraint activation window and materially different path histories. Structural margin is model-relative, and the displayed trajectories are analytical results—not forecasts of certain real-world outcomes or a recommendation of which path to choose.
            </figcaption>
          </figure>

          <h2>Deterministic does not mean universally true</h2>
          <p>Cascade Engine produces deterministic analytical outputs.</p>
          <p>When the same model version receives the same configured inputs, it produces the same trajectory, margin history and constraint states.</p>
          <p>This repeatability is important.</p>
          <p>It means that scenario differences arise from represented differences in actions, timing, starting conditions or assumptions rather than from random variation in the calculation.</p>
          <p>Determinism therefore establishes computational consistency.</p>
          <p>It does not independently validate every assumption inside the model.</p>
          <p>A relationship can be executed consistently and still deserve scrutiny. A threshold can be applied reproducibly and still require domain justification. A trajectory can be calculated exactly while remaining conditional on how the decision situation was represented.</p>
          <p>The analysis is strongest when both levels remain visible:</p>
          <ol>
            <li>What does the engine calculate under the configured assumptions?</li>
            <li>Are those assumptions appropriate to the decision being examined?</li>
          </ol>
          <p>Keeping the questions separate makes the numerical output more useful, not less.</p>

          <h2>What comparison makes visible</h2>
          <p>Structural margin and constraint states make it possible to compare paths through time rather than only endpoints.</p>
          <p>The analysis can examine:</p>
          <ul>
            <li>Which scenario loses structural margin first?</li>
            <li>Which path spends longer near a configured threshold?</li>
            <li>Under which assumptions does a constraint become active?</li>
            <li>Does recovery occur before or after important later actions?</li>
            <li>Do similar terminal values conceal different histories of pressure, recovery or constraint exposure?</li>
          </ul>
          <p>These questions do not reduce the decision to a score.</p>
          <p>They reveal where the paths differ inside the configured model and provide a basis for examining why.</p>
          <p>A higher margin may indicate greater modelled execution flexibility at a given step. A later constraint activation may preserve more options for longer. A smoother trajectory may reduce exposure to particular configured pressures.</p>
          <p>Whether those characteristics should dominate the decision remains a matter of objectives, trade-offs and judgement.</p>
          <p>The analytical value lies in making the differences traceable.</p>
          <p>One number does not settle the decision. A trajectory shows how the modelled conditions develop. Thresholds show when the analytical state changes. Constraints show where the configured path becomes more limited.</p>
          <p>Together, they provide a structured view of how alternative decision paths reshape the conditions surrounding future action.</p>
          <p>Once those trajectories and constraint states have been calculated, the next challenge is deciding which results deserve attention—and how to present them without performing a second analysis.</p>
        </div>
      </section>
    </article>
  );
}
