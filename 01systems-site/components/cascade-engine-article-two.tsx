import { InsightAuthorLine } from "@/components/insight-author-line";

const sequenceAltText =
  "Conceptual comparison of two action sequences showing how different ordering creates different inherited states and diverging analytical paths.";

export function CascadeEngineArticleTwo() {
  return (
    <article className="ce1-article">
      <section className="ce1-brief" aria-labelledby="ce2-brief-heading">
        <p className="ce1-brief-label" id="ce2-brief-heading">
          Executive Brief · 1 min
        </p>

        <div className="ce1-brief-opening">
          <div className="ce1-brief-question">
            <p className="ce1-brief-kicker">The question</p>
            <p className="ce1-brief-question-text">
              How can the same planned actions produce different analytical paths?
            </p>
          </div>

          <div className="ce1-brief-insight">
            <p className="ce1-brief-kicker">Core insight</p>
            <p>
              The order of actions changes the conditions inherited by what follows. Cascade Engine compares alternative sequences within the same configured model and shows where their modelled trajectories begin to diverge.
            </p>
          </div>
        </div>

        <figure className="ce2-sequence-figure">
          <p className="ce2-concept-label">Conceptual illustration</p>
          <div
            className="ce2-sequence-diagram"
            role="img"
            aria-label={sequenceAltText}
          >
            <header className="ce2-shared-structure">
              <h2>Shared configured analytical structure</h2>
              <p>Sequence or timing changes; evolving states are not held identical.</p>
            </header>

            <div className="ce2-paths">
              <section className="ce2-path-group" aria-labelledby="ce2-path-a">
                <h3 id="ce2-path-a">Path A</h3>
                <div className="ce2-path-flow">
                  <div className="ce2-sequence-node">Stabilise</div>
                  <div className="ce2-inherited-state">
                    <span aria-hidden="true">↓</span>
                    <strong>Inherited state</strong>
                    <span>Earlier action shapes what follows</span>
                  </div>
                  <div className="ce2-sequence-node">Initiative</div>
                  <div className="ce2-inherited-state">
                    <span aria-hidden="true">↓</span>
                    <strong>Inherited state</strong>
                    <span>Updated conditions carry forward</span>
                  </div>
                  <div className="ce2-sequence-node">Recovery</div>
                  <div className="ce2-flow-arrow" aria-hidden="true">↓</div>
                  <div className="ce2-sequence-node">Next initiative</div>
                </div>
              </section>

              <section className="ce2-path-group" aria-labelledby="ce2-path-b">
                <h3 id="ce2-path-b">Path B</h3>
                <div className="ce2-path-flow">
                  <div className="ce2-sequence-node">Initiatives overlap</div>
                  <div className="ce2-inherited-state">
                    <span aria-hidden="true">↓</span>
                    <strong>Inherited state</strong>
                    <span>Overlapping demands shape what follows</span>
                  </div>
                  <div className="ce2-sequence-node">Capacity tightens</div>
                  <div className="ce2-inherited-state">
                    <span aria-hidden="true">↓</span>
                    <strong>Inherited state</strong>
                    <span>Changed conditions carry forward</span>
                  </div>
                  <div className="ce2-sequence-node">Later recovery</div>
                </div>
              </section>
            </div>

            <div className="ce2-divergence-outcome">
              <strong>Analytical paths diverge</strong>
              <span>Conditional difference · No preferred path selected</span>
            </div>
          </div>

          <div className="ce1-three-steps">
            <p className="ce1-brief-kicker">Three key points</p>
            <ol>
              <li>
                <span className="ce1-step-number">1.</span>
                <div>
                  <h2>Earlier actions reshape later conditions</h2>
                  <p>A later action enters the model state produced by everything that came before it.</p>
                </div>
              </li>
              <li>
                <span className="ce1-step-number">2.</span>
                <div>
                  <h2>Comparable paths share one structure</h2>
                  <p>The analytical model remains controlled while timing, order and the evolving states differ.</p>
                </div>
              </li>
              <li>
                <span className="ce1-step-number">3.</span>
                <div>
                  <h2>Divergence is conditional</h2>
                  <p>A difference between paths shows that sequence matters under the configured assumptions. It does not establish a universally superior strategy.</p>
                </div>
              </li>
            </ol>
          </div>

          <figcaption>
            Conceptual illustration: The paths use a comparable analytical structure, but changing the order changes the state inherited by later actions. The resulting trajectories are conditional model outputs, not forecasts or recommendations.
          </figcaption>
        </figure>

        <div className="ce1-brief-transition">
          <p className="ce1-brief-kicker">Transition</p>
          <a href="#full-analysis">Continue to the Full Analysis · 8–9 min</a>
        </div>
      </section>

      <section className="ce1-full-analysis" id="full-analysis" aria-labelledby="ce2-title">
        <p className="eyebrow">Cascade Engine · 2 of 6</p>
        <h1 className="page-title" id="ce2-title">Why Sequence Changes the Result</h1>
        <InsightAuthorLine style={{ marginBottom: "14px" }} />
        <p className="ce1-reading-time">Estimated reading time: 8–9 minutes</p>

        <div className="article-prose ce1-prose">
          <p>Two plans can contain the same broad set of actions and still produce different structural conditions.</p>
          <p>The difference may be the order.</p>
          <p>An action introduced early can change the environment encountered by every action that follows. Capacity may already be tighter. Implementation pressure may already be higher. A constraint may have become active. A later recovery measure may therefore enter a different situation than it would have encountered earlier.</p>
          <p>Sequence changes more than the calendar.</p>
          <p>It changes the state inherited by the next decision.</p>
          <p>Cascade Engine makes that difference analytically examinable by executing alternative action sequences within the same configured structure and recording how each path develops over time.</p>

          <h2>The same actions do not imply the same path</h2>
          <p>Consider two transformation plans with similar objectives and broadly the same intended actions.</p>
          <p>In the first path, the organisation stabilises operational capacity before introducing a major initiative. It allows a period for recovery and then adds the next initiative.</p>
          <p>In the second, several initiatives begin early. Stabilisation follows later, after shared capacity has already tightened.</p>
          <p>The plans may contain comparable actions:</p>
          <ul>
            <li>stabilisation,</li>
            <li>major initiatives,</li>
            <li>capacity measures,</li>
            <li>and recovery periods.</li>
          </ul>
          <p>But the actions do not encounter identical conditions.</p>
          <p>In the first path, the second initiative enters a model state shaped by prior stabilisation and recovery.</p>
          <p>In the second, the same type of initiative enters a state already affected by overlapping implementation demands.</p>
          <p>The difference is therefore not merely that one activity appears earlier on a timeline.</p>
          <p>Earlier actions have changed the starting conditions for what comes next.</p>

          <h2>Later actions inherit an existing state</h2>
          <p>A scenario does not reset between actions.</p>
          <p>Each step begins from the modelled state produced by the steps before it.</p>
          <p>An early initiative may increase implementation load. That effect can move through encoded relationships and become part of the conditions inherited by later actions. Available capacity may change. Recovery may weaken. Exposure to a configured constraint may increase.</p>
          <p>A later action is then applied to that updated state.</p>
          <p>This is why the same planned measure can have a different analytical effect depending on when it appears.</p>
          <p>A capacity intervention introduced before several initiatives overlap may help preserve room to adjust.</p>
          <p>The same intervention introduced after pressure has accumulated may instead operate as a recovery measure within an already constrained path.</p>
          <p>The action has not necessarily changed in name or intent.</p>
          <p>Its structural context has.</p>
          <p>Cascade Engine records that context rather than treating every action as an isolated event.</p>

          <h2>Comparable paths require a shared structure</h2>
          <p>For a sequence comparison to be meaningful, the paths need a common analytical basis.</p>
          <p>They should be executed within the same configured model, using the same definitions, represented relationships and analytical logic unless a difference is deliberately introduced.</p>
          <p>Otherwise, it becomes difficult to know what caused the paths to diverge.</p>
          <p>Did the sequence change?</p>
          <p>Did the initial conditions change?</p>
          <p>Were different assumptions used?</p>
          <p>Was a threshold defined differently?</p>
          <p>Did one path include an action that the other did not?</p>
          <p>A useful comparison makes these differences explicit.</p>
          <p>In the simplest sequence comparison, the broad set of actions and the underlying analytical structure remain stable while their order or timing changes. But even then, later actions will not face identical states, because that is precisely what the changed order produces.</p>
          <p>This distinction is important:</p>
          <blockquote>
            <p>The comparison controls the analytical structure. It does not freeze the evolving state of each path.</p>
          </blockquote>
          <p>The evolving state is the subject of the comparison.</p>

          <h2>What the engine records</h2>
          <p>Cascade Engine executes each path across simulated steps and records how its analytical state changes.</p>
          <p>This allows the comparison to move beyond two final values.</p>
          <p>It can show:</p>
          <ul>
            <li>where the trajectories begin to diverge,</li>
            <li>which modelled condition changes first,</li>
            <li>when structural pressure begins to accumulate,</li>
            <li>whether a configured threshold is crossed,</li>
            <li>when a constraint becomes active,</li>
            <li>whether recovery occurs,</li>
            <li>and how the terminal states relate to the histories that produced them.</li>
          </ul>
          <p>Suppose both transformation paths eventually reach a similar terminal state.</p>
          <p>That does not make them structurally equivalent.</p>
          <p>One may retain modelled flexibility through most of the sequence. The other may spend several steps under greater pressure before recovering near the end.</p>
          <p>A final value compresses those histories.</p>
          <p>The trajectory keeps them visible.</p>
          <p>It shows not only where each path ends, but what conditions later actions had to pass through along the way.</p>

          <h2>Sequence comparison is conditional, not predictive</h2>
          <p>The resulting trajectories are deterministic outputs of the configured model.</p>
          <p>They answer a conditional question:</p>
          <blockquote>
            <p>Given these starting conditions, represented relationships, assumptions and action order, how does the modelled analytical state evolve?</p>
          </blockquote>
          <p>They do not answer:</p>
          <blockquote>
            <p>What will certainly happen in the organisation?</p>
          </blockquote>
          <p>A displayed divergence is therefore not a forecast of two guaranteed futures.</p>
          <p>It shows that, under the configured assumptions, changing the sequence changes the path.</p>
          <p>That distinction preserves the practical value of the comparison.</p>
          <p>Decision-makers can examine whether the relationships are credible, whether the timing is realistic and whether an important condition has been omitted. They can compare alternative sequences consistently without treating the graph as a prediction.</p>
          <p>The engine makes the consequences of the model examinable.</p>
          <p>It does not remove the need to assess whether the model is appropriate to the real decision.</p>

          <h2>What a difference between paths means</h2>
          <p>A divergence between two trajectories establishes something specific.</p>
          <p>It shows that the configured sequences produce different analytical states within the shared model.</p>
          <p>One path may:</p>
          <ul>
            <li>retain structural margin for longer,</li>
            <li>encounter a constraint later,</li>
            <li>spend fewer simulated steps under pressure,</li>
            <li>recover earlier,</li>
            <li>or reach a different terminal state.</li>
          </ul>
          <p>These differences can be significant.</p>
          <p>They can affect which later actions remain feasible within the model and when an organisation may need to respond.</p>
          <p>But they do not automatically establish that one sequence is objectively superior.</p>
          <p>A path that preserves more modelled flexibility may require a slower launch. A sequence that creates greater short-term pressure may also pursue an objective that the model does not fully value. Different leaders may accept different trade-offs.</p>
          <p>Cascade Engine structures the comparison.</p>
          <p>It does not choose which trade-off should dominate.</p>

          <h2>Making order inspectable</h2>
          <p>In many plans, sequence remains an implicit assumption.</p>
          <p>A roadmap shows what happens first, second and third, but rarely makes explicit how the first action changes the conditions for the second.</p>
          <p>That leaves important questions buried inside the schedule:</p>
          <ul>
            <li>At what point do the paths begin to diverge?</li>
            <li>Which earlier action changed the state inherited by what followed?</li>
            <li>Does a recovery measure arrive before or after a constraint becomes active?</li>
            <li>Would reversing two actions change the modelled exposure?</li>
            <li>Do similar endpoints conceal different periods of pressure or flexibility?</li>
          </ul>
          <p>Cascade Engine turns those questions into comparable scenario paths.</p>
          <p>The value is not simply that the engine can display two lines on a graph.</p>
          <p>The value is that both paths are executed through the same analytical structure, their differences are made explicit and their histories remain available for examination.</p>
          <p>That makes action order something more than a planning preference.</p>
          <p>It becomes an analytical variable.</p>
          <p>The comparison begins with an explicit configured representation of the decision situation.</p>
          <p>Once that representation exists, sequence can be changed, executed and compared.</p>
          <p>And if changing the sequence changes the path, the next question is how the effect of one action moves into the model states that follow.</p>
        </div>
      </section>
    </article>
  );
}
