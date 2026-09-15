import type { LearningExperience } from "./learning";

/**
 * Curated micro-lessons: short, accurate explanations of ideas worth knowing.
 * Bundled with the app so learning quests work without a book or the AI
 * Mentor. Keep each one under five minutes to read.
 */
export const LESSON_LIBRARY: LearningExperience[] = [
  {
    id: "why-we-procrastinate",
    provider: "library",
    title: "Why do we procrastinate?",
    minutes: 5,
    hook: "It's rarely laziness. It's usually about feelings.",
    sections: [
      {
        heading: "It's a mood problem",
        body: "Researchers increasingly describe procrastination as a way of regulating emotions. When a task feels boring, confusing or threatening, putting it off gives instant relief. The task doesn't change — but the bad feeling goes away for a while, and that relief is what gets reinforced.",
      },
      {
        heading: "Your future self is a stranger",
        body: "People tend to value rewards now far more than rewards later, a pattern called present bias. Studies even suggest we think about our future selves a little like other people — so it feels easy to hand them the hard work.",
      },
      {
        heading: "What actually helps",
        body: "Make starting smaller than the feeling: commit to just two minutes, or only open the document. Name the uncomfortable emotion instead of fighting it. And forgive yourself for past delays — self-compassion has been linked to less procrastination, not more.",
      },
    ],
    keyIdea: "Procrastination is short-term mood repair. Shrink the first step until starting feels easy.",
    reflectionPrompt: "What's one task you've been avoiding — and what feeling is it giving you?",
    tags: ["psychology", "productivity", "habits", "discipline", "focus", "self", "mind"],
  },
  {
    id: "compound-interest",
    provider: "library",
    title: "How does compound interest work?",
    minutes: 4,
    hook: "Money that earns money, which then earns money.",
    sections: [
      {
        heading: "Interest on interest",
        body: "With simple interest you only earn on what you put in. With compound interest, each period's interest is added to the balance, so the next period earns interest on the interest too. Growth starts slow and then accelerates.",
      },
      {
        heading: "The rule of 72",
        body: "A quick estimate: divide 72 by the yearly rate to find roughly how many years it takes to double. At 7% a year, that's about 10 years. So an amount could double around year 10, and double again around year 20 — without adding anything.",
      },
      {
        heading: "It cuts both ways",
        body: "Debt compounds too. A credit card charging 24% a year doubles an unpaid balance in about three years. That's why paying down high-interest debt is often the best 'investment' available, and why starting to save early matters more than saving a lot later.",
      },
    ],
    keyIdea: "Time is the main ingredient. Start early with savings, and stop compounding debt as soon as you can.",
    reflectionPrompt: "Where is compounding working for you right now — and where is it working against you?",
    tags: ["finance", "money", "saving", "investing", "budgeting", "economics", "business"],
  },
  {
    id: "how-memory-works",
    provider: "library",
    title: "How does memory work?",
    minutes: 5,
    hook: "Remembering isn't recording. It's rebuilding.",
    sections: [
      {
        heading: "Three stages",
        body: "Memory is usually described in three stages: encoding (taking information in), consolidation (stabilising it, much of which happens during sleep) and retrieval (pulling it back out). A memory can fail at any of the three.",
      },
      {
        heading: "Retrieval makes it stronger",
        body: "Every time you successfully recall something, it becomes easier to recall next time. This is why testing yourself — flashcards, explaining an idea from memory — beats re-reading. Re-reading feels productive because it's familiar, but familiarity isn't the same as being able to remember.",
      },
      {
        heading: "Space it out",
        body: "Reviewing the same material spread over days works better than cramming it into one session. This spacing effect is one of the most reliable findings in learning research. Short, repeated sessions with sleep in between are hard to beat.",
      },
    ],
    keyIdea: "To remember something, practise recalling it — and spread that practice over several days.",
    reflectionPrompt: "What's one thing you learned recently? Try explaining it from memory right now.",
    tags: ["learning", "psychology", "memory", "study", "languages", "science", "brain"],
  },
  {
    id: "how-habits-form",
    provider: "library",
    title: "How are habits formed?",
    minutes: 4,
    hook: "Repeat something in the same situation, and your brain automates it.",
    sections: [
      {
        heading: "Cue, routine, reward",
        body: "Habits form when a behaviour is repeated in response to a consistent cue — a time, a place, a previous action — and is followed by something rewarding. Over time the cue alone starts triggering the behaviour, with less conscious effort.",
      },
      {
        heading: "It takes longer than 21 days",
        body: "One well-known study followed people building new daily habits and found it took anywhere from 18 to 254 days for a behaviour to feel automatic, with a median of about 66 days. Missing a single day didn't meaningfully set people back.",
      },
      {
        heading: "Design the situation",
        body: "Tie the new behaviour to an existing routine ('after I make coffee, I stretch for two minutes'). Make it easy to start and hard to skip. Consistency in the same context matters more than intensity.",
      },
    ],
    keyIdea: "Same cue, same place, small action, repeated. Missing one day doesn't break a habit.",
    reflectionPrompt: "What existing routine could you attach one small new habit to?",
    tags: ["habits", "discipline", "productivity", "psychology", "fitness", "self", "development"],
  },
  {
    id: "how-muscles-get-stronger",
    provider: "library",
    title: "How do muscles get stronger?",
    minutes: 4,
    hook: "The workout is the signal. Recovery is where you grow.",
    sections: [
      {
        heading: "Your nervous system learns first",
        body: "In the first weeks of strength training, much of the improvement comes from your nervous system: it gets better at recruiting muscle fibres and coordinating them. That's why beginners often get stronger quickly before their muscles visibly grow.",
      },
      {
        heading: "Progressive overload",
        body: "Muscles adapt to the demands placed on them. To keep improving, the challenge has to increase gradually — a little more weight, a few more reps, or better control. Doing the same workout forever leads to a plateau.",
      },
      {
        heading: "Growth happens during recovery",
        body: "Training creates stress in muscle tissue; rebuilding it stronger happens afterwards. Sleep, enough protein and rest days are part of the programme, not a break from it.",
      },
    ],
    keyIdea: "Challenge the body a little more over time, and treat recovery as training.",
    reflectionPrompt: "Which part of your routine could you progress slightly this week?",
    tags: ["fitness", "strength", "training", "gym", "health", "running", "sport", "body"],
  },
  {
    id: "how-black-holes-form",
    provider: "library",
    title: "How do black holes form?",
    minutes: 4,
    hook: "When gravity finally wins.",
    sections: [
      {
        heading: "The death of a massive star",
        body: "Stars balance gravity pulling inward against pressure from nuclear fusion pushing outward. When a very massive star runs out of fuel, fusion stops, and its core can collapse. If enough mass is squeezed into a small enough space, not even light can escape.",
      },
      {
        heading: "The event horizon",
        body: "The boundary around a black hole beyond which nothing can return is the event horizon. It isn't a surface — it's a point of no return. Outside it, objects can still orbit safely, just as planets orbit the Sun.",
      },
      {
        heading: "Giants at the centre",
        body: "Besides black holes a few times the Sun's mass, most large galaxies have a supermassive black hole at their centre. The one at the heart of the Milky Way, Sagittarius A*, is about four million times the mass of the Sun. In 2022 astronomers released its first image.",
      },
    ],
    keyIdea: "A black hole forms when so much mass collapses into so small a space that escape becomes impossible.",
    reflectionPrompt: "What's one question about space you'd love to have answered?",
    tags: ["space", "science", "physics", "astronomy", "universe"],
  },
  {
    id: "how-neural-networks-learn",
    provider: "library",
    title: "How do neural networks learn?",
    minutes: 5,
    hook: "Lots of tiny adjustments, guided by mistakes.",
    sections: [
      {
        heading: "Layers of numbers",
        body: "A neural network passes input through layers of simple units. Each connection has a weight — a number that controls how strongly one unit influences the next. The network's 'knowledge' lives entirely in those weights.",
      },
      {
        heading: "Measuring the mistake",
        body: "During training, the network makes a prediction and a loss function measures how wrong it was. A lower loss means better predictions. Learning means finding weights that make the loss small across many examples.",
      },
      {
        heading: "Gradient descent",
        body: "Backpropagation calculates how much each weight contributed to the error. Gradient descent then nudges every weight slightly in the direction that reduces the error. Repeat this millions of times and useful patterns emerge — without anyone programming the rules directly.",
      },
    ],
    keyIdea: "Networks learn by measuring their error and adjusting weights, a little at a time, to reduce it.",
    reflectionPrompt: "Where in your own learning do you improve by making mistakes and adjusting?",
    tags: ["programming", "ai", "technology", "computers", "coding", "software", "science", "data"],
  },
  {
    id: "why-we-dream",
    provider: "library",
    title: "Why do humans dream?",
    minutes: 4,
    hook: "Science still debates it — here are the leading ideas.",
    sections: [
      {
        heading: "When dreams happen",
        body: "Vivid, story-like dreams are most common during REM (rapid eye movement) sleep, which comes in cycles through the night and gets longer towards morning. Brain activity during REM looks surprisingly similar to being awake.",
      },
      {
        heading: "Competing explanations",
        body: "One idea is that dreaming is linked to memory processing — sorting and strengthening what happened during the day. Another suggests dreams help process emotions. A third, the threat-simulation theory, proposes dreams let us rehearse responses to danger. The evidence doesn't yet settle it; several may be partly true.",
      },
      {
        heading: "Why it matters for you",
        body: "Whatever dreams are for, the sleep they happen in clearly matters: REM and deep sleep both support learning and emotional wellbeing. Cutting sleep short tends to cut the REM-rich final hours first.",
      },
    ],
    keyIdea: "Dreaming's purpose isn't settled, but the sleep it happens in supports memory and mood.",
    reflectionPrompt: "How has your sleep been lately, and how do you feel it's affecting your days?",
    tags: ["sleep", "psychology", "science", "brain", "mind", "health", "meditation"],
  },
  {
    id: "how-the-immune-system-works",
    provider: "library",
    title: "How does the immune system work?",
    minutes: 5,
    hook: "Two defence teams: fast responders and specialists with a memory.",
    sections: [
      {
        heading: "The innate system",
        body: "Your first line of defence acts within minutes to hours. Skin and mucus form barriers, and cells like neutrophils and macrophages attack anything that looks foreign. It's fast but general — it responds the same way to many threats.",
      },
      {
        heading: "The adaptive system",
        body: "Slower but precise, the adaptive system uses T cells and B cells that recognise specific invaders. B cells produce antibodies that latch onto a particular pathogen. This response can take days to build the first time.",
      },
      {
        heading: "Immune memory",
        body: "After an infection, some of those specialised cells remain as memory cells. If the same pathogen returns, the response is much faster and stronger. Vaccines work by training this memory safely, without the illness.",
      },
    ],
    keyIdea: "A fast general defence buys time while a specialised one learns — and remembers.",
    reflectionPrompt: "What small habit could support your health this week — sleep, movement or food?",
    tags: ["health", "science", "biology", "body", "medicine", "nursing"],
  },
  {
    id: "how-a-business-makes-money",
    provider: "library",
    title: "How does a business make money?",
    minutes: 5,
    hook: "Revenue is vanity. Margin is sanity.",
    sections: [
      {
        heading: "Revenue minus costs",
        body: "Profit is what's left after costs. Some costs rise with every sale (ingredients, shipping, payment fees); others stay fixed (rent, software, salaries). A business can have lots of sales and still lose money if each sale costs too much.",
      },
      {
        heading: "Gross margin",
        body: "Gross margin is the share of each sale left after the direct costs of making it. If a loaf sells for 5 and its ingredients and packaging cost 2, the gross margin is 60%. That remaining 3 has to cover everything else — and then some.",
      },
      {
        heading: "What a customer is worth",
        body: "Two numbers matter a lot: what it costs to win a customer, and how much margin that customer brings in over time. If winning a customer costs more than they'll ever be worth, growing faster only loses money faster.",
      },
    ],
    keyIdea: "Know the margin on each sale and the cost of each customer before chasing more sales.",
    reflectionPrompt: "If you ran a small business tomorrow, what would it sell — and what would one sale really cost?",
    tags: ["business", "entrepreneurship", "startup", "money", "finance", "bakery", "career", "marketing"],
  },
];
