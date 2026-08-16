import Image from "next/image";
import { InsightAuthorLine } from "@/components/insight-author-line";

const conceptualAltText =
  "Conceptual flow from a configured action through a direct condition change and encoded relationship to downstream model states and later simulated steps.";

const productAltText =
  "Cascade Engine results panel showing configured effects appearing across model states from M1 to M4, followed by demand response and structural-margin information.";

export function CascadeEngineArticleThree() {
  return (
    <article className="ce1-article">
      <section className="ce1-brief" aria-labelledby="ce3-brief-heading">
        <p className="ce1-brief-label" id="ce3-brief-heading">
          Executive Brief · 1 min
        </p>

        <div className="ce1-brief-opening">
          <div className="ce1-brief-question">
            <p className="ce1-brief-kicker">The question</p>
            <p className="ce1-brief-question-text">
              How does the effect of one action move through the model?
            </p>
          </div>

          <div className="ce1-brief-insight">
            <p className="ce1-brief-kicker">Core insight</p>
            <p>
              Cascade Engine applies configured action effects to the current model state and propagates them through relationships already encoded in the configured model.
            </p>
            <p>
              The resulting cascade shows how the model behaves under those assumptions; it is not an autonomous discovery of real-world causality.
            </p>
          </div>
        </div>

        <figure className="ce3-propagation-figure">
          <p className="ce3-concept-label">Conceptual illustration</p>
          <div
            className="ce3-propagation-diagram"
            role="img"
            aria-label={conceptualAltText}
          >
            <section className="ce3-responsibility-group ce3-modelling-group">
              <h2>Modelling process</h2>
              <p>Relationships are identified, challenged and configured.</p>
              <div className="ce3-modelling-steps" aria-hidden="true">
                <span>Identify</span>
                <span>Challenge</span>
                <span>Configure</span>
              </div>
            </section>

            <div className="ce3-execution-boundary">
              <strong>Relationship encoded before execution</strong>
              <span aria-hidden="true">↓</span>
            </div>

            <section className="ce3-responsibility-group ce3-software-group">
              <h2>Software execution</h2>
              <p>The configured relationships are executed consistently.</p>
              <div className="ce3-propagation-flow">
                <div className="ce3-propagation-node">Configured action</div>
                <span aria-hidden="true">→</span>
                <div className="ce3-propagation-node">Direct condition change</div>
                <span aria-hidden="true">→</span>
                <div className="ce3-propagation-node ce3-encoded-node">Encoded relationship</div>
                <span aria-hidden="true">→</span>
                <div className="ce3-propagation-node">Downstream state</div>
                <span aria-hidden="true">→</span>
                <div className="ce3-propagation-node">Later model step</div>
              </div>
              <p className="ce3-execution-note">Configured model behaviour · Not autonomous causal discovery</p>
            </section>
          </div>
          <figcaption>
            Conceptual illustration: A configured action changes selected conditions, and encoded relationships carry eligible effects into downstream model states. The relationships are defined through the modelling process; the engine does not discover causal structure autonomously.
          </figcaption>
        </figure>

        <div className="ce1-three-steps">
          <p className="ce1-brief-kicker">Three key points</p>
          <ol>
            <li>
              <span className="ce1-step-number">1.</span>
              <div>
                <h2>Actions change configured conditions</h2>
                <p>An action applies specified effects to selected drivers or states.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">2.</span>
              <div>
                <h2>Encoded relationships carry the change</h2>
                <p>Applicable relationships move the effect into downstream model states.</p>
              </div>
            </li>
            <li>
              <span className="ce1-step-number">3.</span>
              <div>
                <h2>Later steps inherit the result</h2>
                <p>Updated states can affect later relationships, constraints and actions in the simulated sequence.</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="ce1-brief-transition">
          <p className="ce1-brief-kicker">Transition</p>
          <a href="#full-analysis">Continue to the Full Analysis · 8–9 min</a>
        </div>
      </section>

      <section className="ce1-full-analysis" id="full-analysis" aria-labelledby="ce3-title">
        <p className="eyebrow">Cascade Engine · 3 of 6</p>
        <h1 className="page-title" id="ce3-title">How Effects Propagate</h1>
        <InsightAuthorLine style={{ marginBottom: "14px" }} />
        <p className="ce1-reading-time">Estimated reading time: 8–9 minutes</p>

        <div className="article-prose ce1-prose">
          <p>A decision rarely affects only the place where it is made.</p>
          <p>Accelerating one programme may increase delivery speed, but it may also consume capacity needed elsewhere. Expanding a team may increase available resources while adding coordination load. Delaying maintenance may protect short-term capacity while making a later constraint more consequential.</p>
          <p>The important question is therefore not only whether an action has an effect.</p>
          <p>It is how that effect moves through the structure surrounding it.</p>
          <p>Cascade Engine represents this movement through configured relationships. An action changes selected conditions in the model. Those changes may then influence other modelled conditions over time.</p>
          <p>The engine executes that structure consistently. But the structure itself must first be identified, examined and represented.</p>

          <h2>Actions have direct effects</h2>
          <p>Inside a configured Cascade Engine model, an action is more than a label.</p>
          <p>The model specifies which conditions the action affects directly.</p>
          <p>Accelerating an initiative may increase implementation load. Adding capacity may improve delivery conditions while creating new coordination requirements. Deferring an activity may preserve resources in one period while changing the conditions that later actions encounter.</p>
          <p>These direct effects are configured before the scenario is executed.</p>
          <p>When the engine runs, it applies the specified effects to the relevant drivers or states. The same configured action, introduced under the same conditions and model version, produces the same direct analytical change.</p>
          <p>This creates a stable starting point for comparison.</p>
          <p>Two scenario paths can contain different actions, introduce the same action at different points, or begin from different initial conditions. Their consequences can then be compared within the same analytical structure.</p>
          <p>But the direct effect of an action is only the beginning.</p>

          <h2>Direct effects are not the whole result</h2>
          <p>Organisational conditions are rarely independent.</p>
          <p>Implementation load may affect recovery capacity. Reduced recovery capacity may increase pressure on shared resources. Resource pressure may make an existing constraint more significant. That constraint may then change what remains feasible later in the sequence.</p>
          <p>Cascade Engine represents selected connections of this kind as relationships inside the configured model.</p>
          <p>When a modelled driver changes, the engine evaluates whether that change is relevant to other represented conditions. If an encoded relationship becomes applicable, the downstream state can change as the scenario progresses.</p>
          <p>This is what propagation means in Cascade Engine:</p>
          <p>A configured change influences later model states through relationships already represented in the analytical structure.</p>
          <p>The engine is not simply adding together a list of isolated action effects. It is examining how those effects interact with the surrounding model.</p>
          <p>That distinction matters because two actions with similar immediate effects can produce different trajectories when introduced into different structural conditions.</p>

          <h2>Where the relationships come from</h2>
          <p>The relationships executed by the engine do not appear automatically.</p>
          <p>They are identified and formalised as part of the modelling process.</p>
          <p>Decision-makers and domain experts contribute knowledge about the situation being examined. They may identify shared resources, operational dependencies, implementation pressures, sequencing conditions or existing constraints that connect one part of the decision environment to another.</p>
          <p>Those relationships can then be challenged before they are encoded.</p>
          <p>Is the connection material to the decision? Is the direction of the effect credible? Under which conditions should it apply? Is an important intermediate condition missing? Would the same relationship still hold under a different starting state?</p>
          <p>This work produces modelling assumptions, not unquestionable causal truth.</p>
          <p>An encoded relationship states that, for the purpose of this analysis, a specified change should influence another represented condition in a defined way. Its analytical value depends on whether that representation is appropriate to the question being examined.</p>
          <p>The facilitated process identifies and scrutinises the relationship.</p>
          <p>The configured model formalises it.</p>
          <p>The software executes it.</p>
          <p>Keeping those responsibilities separate prevents the analytical output from being mistaken for autonomous causal discovery.</p>

          <h2>What propagation means inside the engine</h2>
          <p>Once the relevant relationships have been configured, Cascade Engine can execute them over a sequence of simulated steps.</p>
          <p>At a high level, the process is:</p>
          <ol>
            <li>A configured action changes one or more modelled conditions.</li>
            <li>The engine evaluates the relationships connected to those changes.</li>
            <li>Applicable relationships influence downstream states.</li>
            <li>Those updated states may become relevant to later relationships or constraints.</li>
            <li>The resulting sequence is recorded as part of the scenario’s analytical history.</li>
          </ol>
          <p>Consider a simplified example.</p>
          <p>An organisation accelerates several initiatives at the same time. In the configured model, this increases implementation load. Higher implementation load affects recovery capacity. Lower recovery capacity then makes an existing resource constraint more significant later in the sequence.</p>
          <p>The cascade is not a separate narrative added after the calculation.</p>
          <p>It is part of how the configured model evolves.</p>
          <p>The engine records which modelled conditions changed, when they changed within the simulation and which represented pathways connected them. This makes the resulting trajectory traceable to the structure that produced it.</p>
          <p>The exact calculation remains part of the implementation. What matters analytically is the responsibility boundary: the model defines the relationships, and the engine executes their consequences consistently.</p>

          <figure className="ce3-product-figure">
            <div className="ce3-product-panel">
              <Image
                src="/images/cascade-engine-propagation-results.png"
                alt={productAltText}
                width={396}
                height={677}
                sizes="(max-width: 440px) calc(100vw - 48px), 396px"
              />
            </div>
            <figcaption>
              The product view shows when configured effects begin to appear across simulated steps. The sequence reflects relationships encoded in the model and executed by the engine, not causal relationships autonomously discovered by the software.
            </figcaption>
          </figure>

          <h2>What a cascade shows</h2>
          <p>A cascade visualisation can make the propagation path easier to inspect.</p>
          <p>It can show:</p>
          <ul>
            <li>which configured action or driver initiated a change,</li>
            <li>which represented relationships carried that change,</li>
            <li>which downstream conditions were affected,</li>
            <li>and where those changes appeared in the simulated sequence.</li>
          </ul>
          <p>This gives the reader more than a final score or terminal state.</p>
          <p>It provides a path through the model.</p>
          <p>A difference between two scenarios can therefore be examined as a chain of represented effects rather than treated as an unexplained output. A reviewer can ask whether the initiating action was modelled appropriately, whether the relationship is credible and whether an intermediate condition should be revised.</p>
          <p>The arrows in such a visualisation have a specific meaning.</p>
          <p>They show relationships encoded in the configured model and executed by the engine. They do not independently establish that the same causal pathway has been empirically proven in every real organisation.</p>
          <p>The cascade is evidence about the model’s behaviour under its stated assumptions.</p>
          <p>Its credibility in a real decision context depends on the quality of those assumptions and the relevance of the structure being represented.</p>

          <h2>Why explicit propagation matters</h2>
          <p>Without explicit propagation, downstream consequences often remain buried inside general statements.</p>
          <p>A team may say that one initiative will “create pressure elsewhere,” that two programmes are “connected,” or that a decision could “limit future flexibility.” These observations may be reasonable, but they are difficult to examine when the underlying pathway remains implicit.</p>
          <p>Representing the pathway changes the discussion.</p>
          <p>The organisation can inspect which condition is expected to change first, what that change influences and where the consequence appears later in the sequence. Competing interpretations can be compared using different configured relationships rather than remaining as incompatible narratives.</p>
          <p>Explicit propagation also makes scenario differences easier to trace.</p>
          <p>If two paths diverge, the analysis can return to the actions and relationships that produced the divergence. The result is not accepted merely because the engine generated it. Its structure remains available for scrutiny.</p>
          <p>This is the value of combining explicit modelling with deterministic execution.</p>
          <p>The modelling process makes the proposed relationships visible.</p>
          <p>Cascade Engine makes their consequences executable and comparable over time.</p>
          <p>Once those effects have moved through the configured structure, they begin to shape the analytical outputs: trajectories, structural margin, thresholds and constraints.</p>
        </div>
      </section>
    </article>
  );
}
