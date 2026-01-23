// Bevis case definitions for Leadership mode v1
// Exactly 3 cases, locked structure

export type BevisCaseV1 = {
  id: string;
  name: string;
  context: string;
  planA: {
    name: "Nuvarande plan";
    decision: string;
  };
  planB: {
    name: "Alternativ";
    decision: string;
  };
  difference: string; // Single-line difference summary
  deltaSummary: string; // One sentence describing outcome difference
  consequence: {
    vadSomHander: string; // 1-2 sentences
    varfor: string; // 1-2 sentences
    vadDetInnebar: string; // 1-2 sentences
  };
};

export const BEVIS_CASES_V1: BevisCaseV1[] = [
  {
    id: "1",
    name: "Ökat tryck utan förstärkning",
    context: "Verksamheten möter ett ökande inflöde utan att kapacitet eller återhämtning förstärks.",
    planA: {
      name: "Nuvarande plan",
      decision: "Normal kapacitet"
    },
    planB: {
      name: "Alternativ",
      decision: "Förstärkt kapacitet"
    },
    difference: "Skillnad: Operativ kapacitet – Normal → Förstärkt",
    deltaSummary: "Alternativet visar en mer kontrollerad belastningsutveckling med bibehållen återhämtning över tid.",
    consequence: {
      vadSomHander: "Belastningen ökar gradvis i nuvarande plan medan alternativet håller belastningen mer jämn. Återhämtningen förblir stabil i alternativet men minskar i nuvarande plan.",
      varfor: "Förstärkt kapacitet möter det ökande inflödet tidigare vilket förhindrar ackumulering av belastning som annars skulle påverka återhämtningsförmågan.",
      vadDetInnebar: "I praktiken innebär alternativet att verksamheten kan hantera fluktuationer medan återhämtningen påverkas annorlunda över tid."
    }
  },
  {
    id: "2",
    name: "Tidig förstärkning av kapacitet",
    context: "Kapaciteten förstärks tidigt för att möta ett ökande inflöde innan trycket byggs upp.",
    planA: {
      name: "Nuvarande plan",
      decision: "Sen förstärkning"
    },
    planB: {
      name: "Alternativ",
      decision: "Tidig förstärkning"
    },
    difference: "Skillnad: Timing för kapacitetsförstärkning – Sen → Tidig",
    deltaSummary: "Tidig förstärkning resulterar i lägre toppbelastning och mer kontrollerad återhämtning jämfört med sen förstärkning.",
    consequence: {
      vadSomHander: "Nuvarande plan visar en topp i belastning innan förstärkningen träder i kraft medan alternativet håller belastningen mer kontrollerad från start. Återhämtningen påverkas mindre i alternativet.",
      varfor: "Tidig förstärkning möter belastningen innan den når kritiska nivåer vilket påverkar återhämtningsförmågan annorlunda.",
      vadDetInnebar: "I praktiken innebär tidig förstärkning att verksamheten har inte perioder av hög belastning som annars skulle påverka långsiktig återhämtning."
    }
  },
  {
    id: "3",
    name: "Sen förstärkning med begränsad effekt",
    context: "Kapaciteten förstärks först efter att belastningen byggts upp under en längre period.",
    planA: {
      name: "Nuvarande plan",
      decision: "Sen förstärkning"
    },
    planB: {
      name: "Alternativ",
      decision: "Tidig förstärkning"
    },
    difference: "Skillnad: Timing för kapacitetsförstärkning – Sen → Tidig",
    deltaSummary: "Sen förstärkning visar begränsad effekt på återhämtningen medan tidig förstärkning behåller återhämtningsförmågan mer kontrollerad.",
    consequence: {
      vadSomHander: "Nuvarande plan visar en lång period av ökande belastning som påverkar återhämtningen innan förstärkningen träder i kraft. Alternativet håller både belastning och återhämtning mer stabila.",
      varfor: "När belastningen byggs upp under en längre period innan förstärkning påverkas återhämtningsförmågan redan innan åtgärden träder i kraft vilket begränsar dess effekt.",
      vadDetInnebar: "I praktiken innebär sen förstärkning att verksamheten redan har påverkats av belastningen när åtgärden implementeras vilket påverkar dess långsiktiga effekt."
    }
  }
];
