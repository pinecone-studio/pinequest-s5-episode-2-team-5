import type { ChemClass, ClassId, Lesson } from '@/types';

/**
 * The three starting classes and their lessons.
 * Lesson order inside a class is the unlock order.
 */
export const CLASSES: ChemClass[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    title: 'Lab Rookie',
    description: 'Stay safe in the lab, meet atoms and find your way around the periodic table.',
    icon: 'test-tube',
    color: { main: '#4ADE80', dark: '#15A34A', light: '#DCFCE7', ink: '#063B1C' },
    lessons: [
      {
        id: 'b1-lab-safety',
        classId: 'beginner',
        title: 'Lab Safety First',
        summary: 'Gear up and learn to read hazard symbols before your first experiment.',
        icon: 'shield-check',
        minutes: 5,
        xp: 100,
        steps: [
          {
            type: 'info',
            icon: 'safety-goggles',
            title: 'Gear up',
            body: 'Before any experiment, put on safety goggles and a lab coat, and tie back long hair. Goggles protect your eyes from splashes, the most common lab injury.',
          },
          {
            type: 'info',
            icon: 'alert-octagon-outline',
            title: 'Read the symbols',
            body: 'Hazard pictograms are red-bordered diamonds. A flame means flammable, a skull means toxic, and a hand being eaten away means corrosive. Never taste chemicals, and only smell them by wafting the air toward your nose.',
          },
          {
            type: 'quiz',
            question: 'What should you always wear to protect your eyes in the lab?',
            options: ['Sunglasses', 'Safety goggles', 'A face mask', "Nothing if you're careful"],
            answer: 1,
            explanation: "Safety goggles seal around your eyes and stop splashes. Sunglasses don't.",
          },
          {
            type: 'quiz',
            question: 'How should you safely smell a chemical?',
            options: [
              'Sniff it straight from the container',
              'Waft the air toward your nose',
              'Taste a tiny amount instead',
              'Heat it first',
            ],
            answer: 1,
            explanation: 'Wafting lets you notice an odor while breathing in only a little diluted vapor.',
          },
        ],
      },
      {
        id: 'b2-states-of-matter',
        classId: 'beginner',
        title: 'States of Matter',
        summary: 'Solids, liquids and gases, and what happens when you heat or cool them.',
        icon: 'water',
        minutes: 6,
        xp: 100,
        steps: [
          {
            type: 'info',
            icon: 'cube-outline',
            title: 'Solid, liquid, gas',
            body: 'Everything is made of tiny particles. In a solid they are packed tightly and vibrate in place. In a liquid they slide past each other. In a gas they move fast and spread out to fill any container.',
          },
          {
            type: 'info',
            icon: 'thermometer',
            title: 'Changing state',
            body: 'Heating gives particles energy. Ice melts into water at 0 °C, and water boils into steam at 100 °C at sea level. Cooling reverses it: steam condenses and water freezes.',
          },
          {
            type: 'quiz',
            question: 'In which state do particles spread out to fill their whole container?',
            options: ['Solid', 'Liquid', 'Gas'],
            answer: 2,
            explanation: 'Gas particles move quickly and independently, so a gas fills any container.',
          },
          {
            type: 'quiz',
            question: 'What is it called when a liquid turns into a solid?',
            options: ['Melting', 'Freezing', 'Condensation', 'Evaporation'],
            answer: 1,
            explanation: 'Freezing is liquid to solid. Condensation is gas to liquid.',
          },
        ],
      },
      {
        id: 'b3-atoms',
        classId: 'beginner',
        title: 'Atoms & Elements',
        summary: 'Protons, neutrons, electrons, and what makes carbon different from oxygen.',
        icon: 'atom',
        minutes: 6,
        xp: 100,
        steps: [
          {
            type: 'info',
            icon: 'atom',
            title: 'Inside an atom',
            body: 'An atom has a tiny nucleus made of protons (positive) and neutrons (no charge). Electrons (negative) move around the nucleus in shells.',
          },
          {
            type: 'info',
            icon: 'numeric-6-box-outline',
            title: 'What makes an element',
            body: 'An element is made of only one kind of atom. The number of protons decides which element it is: every atom with 6 protons is carbon, and every atom with 8 protons is oxygen.',
          },
          {
            type: 'quiz',
            question: 'Which particle has a negative charge?',
            options: ['Proton', 'Neutron', 'Electron'],
            answer: 2,
            explanation: 'Electrons are negative, protons are positive and neutrons are neutral.',
          },
          {
            type: 'quiz',
            question: 'What decides which element an atom is?',
            options: ['Its number of neutrons', 'Its number of protons', 'Its size', 'Its temperature'],
            answer: 1,
            explanation: 'The proton count, called the atomic number, defines the element.',
          },
        ],
      },
      {
        id: 'b4-periodic-table',
        classId: 'beginner',
        title: 'The Periodic Table',
        summary: 'Groups, periods, metals, non-metals and the very lazy noble gases.',
        icon: 'periodic-table',
        minutes: 7,
        xp: 100,
        steps: [
          {
            type: 'info',
            icon: 'table-large',
            title: 'Rows and columns',
            body: 'The periodic table lists every element in order of atomic number. Rows are called periods and columns are called groups. Elements in the same group behave in similar ways.',
          },
          {
            type: 'info',
            icon: 'lightning-bolt',
            title: 'Metals and non-metals',
            body: 'Metals sit on the left and in the middle. They are shiny and conduct electricity. Non-metals are on the right. Group 18, the noble gases such as helium and neon, barely react at all.',
          },
          {
            type: 'quiz',
            question: 'What are the vertical columns of the periodic table called?',
            options: ['Periods', 'Groups', 'Shells', 'Blocks'],
            answer: 1,
            explanation: 'Columns are groups. Rows are periods.',
          },
          {
            type: 'quiz',
            question: 'Which of these is a noble gas?',
            options: ['Oxygen', 'Sodium', 'Neon', 'Iron'],
            answer: 2,
            explanation: 'Neon is in group 18 with the other noble gases.',
          },
        ],
      },
      {
        id: 'b5-mixtures',
        classId: 'beginner',
        title: 'Mixtures & Separation',
        summary: 'Filter, evaporate and distill your way to pure substances.',
        icon: 'filter-outline',
        minutes: 7,
        xp: 100,
        steps: [
          {
            type: 'info',
            icon: 'shaker-outline',
            title: 'Mixtures vs compounds',
            body: 'In a mixture, substances are mixed but not chemically joined, like sand in water. In a compound, elements are chemically bonded, like water (H₂O). Mixtures can be separated by physical methods.',
          },
          {
            type: 'info',
            icon: 'filter-outline',
            title: 'Separation tools',
            body: 'Filtration removes an insoluble solid from a liquid. Evaporation recovers a dissolved solid, like salt from salt water. Distillation separates liquids that have different boiling points.',
          },
          {
            type: 'quiz',
            question: 'How would you separate sand from water?',
            options: ['Filtration', 'Distillation', 'Using a magnet', 'Freezing'],
            answer: 0,
            explanation: "Sand doesn't dissolve, so filter paper traps it while the water passes through.",
          },
          {
            type: 'quiz',
            question: 'Which of these is a mixture, not a compound?',
            options: ['Water (H₂O)', 'Salt water', 'Carbon dioxide (CO₂)', 'Table salt (NaCl)'],
            answer: 1,
            explanation: 'Salt water is salt dissolved in water. No new bonds form, so it is a mixture.',
          },
        ],
      },
    ],
  },
  {
    id: 'medium',
    name: 'Medium',
    title: 'Lab Apprentice',
    description: 'Bonds, balanced equations, acids and the mole: the core of real chemistry.',
    icon: 'flask',
    color: { main: '#FFB938', dark: '#D97706', light: '#FEF3C7', ink: '#4A2800' },
    lessons: [
      {
        id: 'm1-bonding',
        classId: 'medium',
        title: 'Chemical Bonding',
        summary: 'Why atoms give, take or share electrons.',
        icon: 'molecule',
        minutes: 7,
        xp: 150,
        steps: [
          {
            type: 'info',
            icon: 'plus-minus-variant',
            title: 'Ionic bonds',
            body: 'When a metal meets a non-metal, the metal gives electrons away. Sodium loses one electron to become Na⁺ and chlorine gains it to become Cl⁻. The opposite charges attract: that is an ionic bond.',
          },
          {
            type: 'info',
            icon: 'molecule',
            title: 'Covalent bonds',
            body: 'Non-metals share electrons instead. In a water molecule, oxygen shares a pair of electrons with each hydrogen atom. The shared pairs hold the atoms together.',
          },
          {
            type: 'quiz',
            question: 'What happens to electrons in a covalent bond?',
            options: ['They are transferred', 'They are shared', 'They are destroyed', 'They turn into protons'],
            answer: 1,
            explanation: 'Covalent means shared electrons. Ionic means transferred electrons.',
          },
          {
            type: 'quiz',
            question: 'Which compound is held together by ionic bonds?',
            options: ['H₂O', 'CO₂', 'NaCl', 'CH₄'],
            answer: 2,
            explanation: 'NaCl forms from a metal (Na) and a non-metal (Cl), so it is ionic.',
          },
        ],
      },
      {
        id: 'm2-balancing',
        classId: 'medium',
        title: 'Balancing Equations',
        summary: 'Atoms are never lost. Make both sides of the equation agree.',
        icon: 'scale-balance',
        minutes: 8,
        xp: 150,
        steps: [
          {
            type: 'info',
            icon: 'scale-balance',
            title: 'Atoms are conserved',
            body: 'In a chemical reaction atoms are rearranged, never created or destroyed. Both sides of an equation must have the same number of each kind of atom.',
          },
          {
            type: 'info',
            icon: 'numeric-2-circle-outline',
            title: 'Use coefficients',
            body: 'Balance by changing the big numbers in front of formulas, never the small ones inside them. H₂ + O₂ → H₂O is unbalanced. 2H₂ + O₂ → 2H₂O has 4 H and 2 O on each side.',
          },
          {
            type: 'quiz',
            question: 'Balance it: N₂ + ? H₂ → 2NH₃',
            options: ['1', '2', '3', '6'],
            answer: 2,
            explanation: '2NH₃ contains 6 hydrogen atoms, so you need 3H₂.',
          },
          {
            type: 'quiz',
            question: 'Why must chemical equations be balanced?',
            options: [
              'To make them look neat',
              'Because mass is conserved',
              'Because atoms can disappear',
              'To speed up the reaction',
            ],
            answer: 1,
            explanation: 'The law of conservation of mass: atoms are rearranged, not lost.',
          },
        ],
      },
      {
        id: 'm3-acids-bases',
        classId: 'medium',
        title: 'Acids & Bases',
        summary: 'The pH scale, indicators and neutralization.',
        icon: 'ph',
        minutes: 7,
        xp: 150,
        steps: [
          {
            type: 'info',
            icon: 'ph',
            title: 'The pH scale',
            body: 'pH runs from 0 to 14. Below 7 is acidic (lemon juice is about 2), 7 is neutral (pure water), and above 7 is basic, also called alkaline (soap is about 10).',
          },
          {
            type: 'info',
            icon: 'beaker-outline',
            title: 'Neutralization',
            body: 'An acid and a base react to form a salt and water: HCl + NaOH → NaCl + H₂O. Indicators such as litmus change color to show whether a solution is acidic or basic.',
          },
          {
            type: 'quiz',
            question: 'A solution has a pH of 3. It is…',
            options: ['Acidic', 'Neutral', 'Basic'],
            answer: 0,
            explanation: 'Anything below pH 7 is acidic.',
          },
          {
            type: 'quiz',
            question: 'An acid reacting with a base produces…',
            options: ['A salt and water', 'Only a gas', 'A stronger acid', 'Pure oxygen'],
            answer: 0,
            explanation: 'Neutralization makes a salt and water.',
          },
        ],
      },
      {
        id: 'm4-mole',
        classId: 'medium',
        title: 'The Mole',
        summary: "Counting atoms by weighing them, with Avogadro's number.",
        icon: 'calculator-variant',
        minutes: 8,
        xp: 150,
        steps: [
          {
            type: 'info',
            icon: 'dots-hexagon',
            title: 'Counting particles',
            body: "Atoms are far too small to count one by one, so chemists count them in moles. One mole is 6.02 × 10²³ particles. That is Avogadro's number.",
          },
          {
            type: 'info',
            icon: 'weight-gram',
            title: 'Molar mass',
            body: 'The mass of one mole of a substance in grams equals its relative formula mass. Carbon is 12 g/mol, and water (H₂O) is 2 × 1 + 16 = 18 g/mol.',
          },
          {
            type: 'quiz',
            question: 'How many particles are in one mole?',
            options: ['12', '6.02 × 10²³', '1,000,000', '100'],
            answer: 1,
            explanation: "That's Avogadro's number.",
          },
          {
            type: 'quiz',
            question: 'What is the molar mass of CO₂? (C = 12, O = 16)',
            options: ['28 g/mol', '32 g/mol', '44 g/mol', '56 g/mol'],
            answer: 2,
            explanation: '12 + 2 × 16 = 44 g/mol.',
          },
        ],
      },
      {
        id: 'm5-reaction-types',
        classId: 'medium',
        title: 'Types of Reactions',
        summary: 'Synthesis, decomposition, displacement and combustion.',
        icon: 'fire',
        minutes: 7,
        xp: 150,
        steps: [
          {
            type: 'info',
            icon: 'merge',
            title: 'Building up, breaking down',
            body: 'In synthesis, simple substances combine: 2Mg + O₂ → 2MgO. In decomposition, one compound breaks apart: 2H₂O₂ → 2H₂O + O₂.',
          },
          {
            type: 'info',
            icon: 'fire',
            title: 'Swaps and combustion',
            body: "In displacement, a more reactive element takes another's place: Zn + CuSO₄ → ZnSO₄ + Cu. Combustion is burning in oxygen. Methane burns to make carbon dioxide and water.",
          },
          {
            type: 'quiz',
            question: '2H₂O₂ → 2H₂O + O₂ is an example of…',
            options: ['Synthesis', 'Decomposition', 'Combustion', 'Displacement'],
            answer: 1,
            explanation: 'One compound breaks down into simpler substances.',
          },
          {
            type: 'quiz',
            question: 'What does the complete combustion of methane (CH₄) produce?',
            options: ['CO₂ and H₂O', 'H₂ and O₂', 'Only CO', 'Methane and oxygen'],
            answer: 0,
            explanation: 'CH₄ + 2O₂ → CO₂ + 2H₂O.',
          },
        ],
      },
    ],
  },
  {
    id: 'hard',
    name: 'Hard',
    title: 'Master Chemist',
    description: 'Calculate, predict and control reactions like a professional chemist.',
    icon: 'atom-variant',
    color: { main: '#FF5C7A', dark: '#D61F45', light: '#FFE4E9', ink: '#4C0519' },
    lessons: [
      {
        id: 'h1-stoichiometry',
        classId: 'hard',
        title: 'Stoichiometry',
        summary: 'Mole ratios and finding the limiting reagent.',
        icon: 'sigma',
        minutes: 9,
        xp: 200,
        steps: [
          {
            type: 'info',
            icon: 'division',
            title: 'Mole ratios',
            body: 'The coefficients of a balanced equation give mole ratios. In 2H₂ + O₂ → 2H₂O, 2 mol of H₂ react with 1 mol of O₂ to give 2 mol of H₂O.',
          },
          {
            type: 'info',
            icon: 'gauge-low',
            title: 'Limiting reagent',
            body: 'The reactant that runs out first limits how much product can form. Convert each reactant to moles and compare with the ratio. The one that makes the least product is limiting.',
          },
          {
            type: 'quiz',
            question: 'With excess O₂, how many moles of H₂O form from 4 mol of H₂?  2H₂ + O₂ → 2H₂O',
            options: ['1 mol', '2 mol', '4 mol', '8 mol'],
            answer: 2,
            explanation: 'H₂ : H₂O is 2 : 2, which is 1 : 1, so 4 mol of H₂ gives 4 mol of H₂O.',
          },
          {
            type: 'quiz',
            question: 'You mix 3 mol of H₂ with 1 mol of O₂. Which is the limiting reagent?',
            options: ['H₂', 'O₂', 'Neither'],
            answer: 1,
            explanation: '1 mol of O₂ needs only 2 mol of H₂, so O₂ runs out first and 1 mol of H₂ is left over.',
          },
        ],
      },
      {
        id: 'h2-thermochemistry',
        classId: 'hard',
        title: 'Thermochemistry',
        summary: 'Exothermic, endothermic and the energy stored in bonds.',
        icon: 'thermometer',
        minutes: 8,
        xp: 200,
        steps: [
          {
            type: 'info',
            icon: 'fire',
            title: 'Exo vs endo',
            body: 'Exothermic reactions release heat to the surroundings (ΔH < 0), like combustion. Endothermic reactions absorb heat (ΔH > 0). That is why an instant cold pack feels cold.',
          },
          {
            type: 'info',
            icon: 'link-variant-off',
            title: 'Bond energy',
            body: 'Breaking bonds takes energy and making bonds releases it. If forming the new bonds releases more energy than breaking the old ones took, the reaction is exothermic overall.',
          },
          {
            type: 'quiz',
            question: 'A reaction has ΔH = −890 kJ/mol. It is…',
            options: ['Exothermic', 'Endothermic', 'Neither'],
            answer: 0,
            explanation: 'A negative ΔH means heat is released.',
          },
          {
            type: 'quiz',
            question: 'Breaking chemical bonds…',
            options: ['Releases energy', 'Absorbs energy', 'Has no energy change'],
            answer: 1,
            explanation: 'Energy is always needed to pull bonded atoms apart.',
          },
        ],
      },
      {
        id: 'h3-rates',
        classId: 'hard',
        title: 'Reaction Rates',
        summary: 'Collision theory and how to speed reactions up.',
        icon: 'timer-outline',
        minutes: 8,
        xp: 200,
        steps: [
          {
            type: 'info',
            icon: 'vector-combine',
            title: 'Collision theory',
            body: 'Particles react only when they collide with enough energy, called the activation energy, and in the right orientation. More successful collisions per second means a faster reaction.',
          },
          {
            type: 'info',
            icon: 'speedometer',
            title: 'Speeding things up',
            body: 'Higher temperature, higher concentration, more surface area (powder instead of lumps) and catalysts all increase the rate. A catalyst lowers the activation energy and is not used up.',
          },
          {
            type: 'quiz',
            question: 'How does a catalyst speed up a reaction?',
            options: [
              'It raises the temperature',
              'It lowers the activation energy',
              'It is burned as fuel',
              'It adds more reactant',
            ],
            answer: 1,
            explanation: 'A catalyst provides another pathway with a lower activation energy.',
          },
          {
            type: 'quiz',
            question: 'Which reacts fastest with acid?',
            options: ['One large marble chip', 'Several small chips', 'Marble powder'],
            answer: 2,
            explanation: 'Powder has the most surface area, so the most collisions happen at once.',
          },
        ],
      },
      {
        id: 'h4-equilibrium',
        classId: 'hard',
        title: 'Chemical Equilibrium',
        summary: "Reversible reactions and Le Chatelier's principle.",
        icon: 'swap-horizontal',
        minutes: 9,
        xp: 200,
        steps: [
          {
            type: 'info',
            icon: 'swap-horizontal',
            title: 'Dynamic equilibrium',
            body: 'In a reversible reaction in a closed system, the forward and reverse reactions end up running at the same rate. The amounts stop changing, even though both reactions keep going.',
          },
          {
            type: 'info',
            icon: 'arrow-left-right',
            title: "Le Chatelier's principle",
            body: 'Change the conditions and the equilibrium shifts to oppose the change. Add reactant and it shifts toward products. Raise the pressure and it shifts toward the side with fewer gas molecules.',
          },
          {
            type: 'quiz',
            question: 'At dynamic equilibrium…',
            options: [
              'All reactions have stopped',
              'Forward and reverse rates are equal',
              'Only products remain',
              'The temperature drops to zero',
            ],
            answer: 1,
            explanation: 'Both reactions continue at equal rates, so the concentrations stay constant.',
          },
          {
            type: 'quiz',
            question: 'N₂ + 3H₂ ⇌ 2NH₃. Raising the pressure shifts the equilibrium…',
            options: ['To the left', 'To the right', 'Nowhere'],
            answer: 1,
            explanation: 'The right side has 2 gas molecules and the left has 4, so higher pressure favors NH₃.',
          },
        ],
      },
      {
        id: 'h5-redox',
        classId: 'hard',
        title: 'Redox & Batteries',
        summary: 'Oxidation, reduction and how a battery makes current.',
        icon: 'battery-charging',
        minutes: 9,
        xp: 200,
        steps: [
          {
            type: 'info',
            icon: 'swap-vertical',
            title: 'OIL RIG',
            body: 'Oxidation Is Loss of electrons, Reduction Is Gain. They always happen together: in Zn + Cu²⁺ → Zn²⁺ + Cu, zinc is oxidized and the copper ions are reduced.',
          },
          {
            type: 'info',
            icon: 'battery-charging',
            title: 'Batteries',
            body: 'A galvanic cell keeps the two halves of a redox reaction apart, so the electrons must travel through a wire as electric current. Oxidation happens at the anode and reduction at the cathode.',
          },
          {
            type: 'quiz',
            question: 'Oxidation is…',
            options: ['Gain of electrons', 'Loss of electrons', 'Gain of protons', 'Loss of neutrons'],
            answer: 1,
            explanation: 'OIL RIG: Oxidation Is Loss.',
          },
          {
            type: 'quiz',
            question: 'In a galvanic cell, where does reduction happen?',
            options: ['Anode', 'Cathode', 'Salt bridge', 'Wire'],
            answer: 1,
            explanation: 'Reduction happens at the cathode and oxidation at the anode.',
          },
        ],
      },
    ],
  },
];

export const CLASS_ORDER: ClassId[] = CLASSES.map((c) => c.id);

/** Mongolian names of the classes, shown on the sign-up screen. */
export const CLASS_TEXT_MN: Record<ClassId, { name: string; title: string; description: string }> = {
  beginner: {
    name: 'Анхан шат',
    title: 'Шинэхэн лаборант',
    description: 'Лабораторид аюулгүй ажиллаж сурч, атомтай танилцаж, үелэх системд чөлөөтэй чиглэнэ.',
  },
  medium: {
    name: 'Дунд шат',
    title: 'Лаборант шавь',
    description: 'Химийн холбоо, тэгшитгэл тэнцүүлэх, хүчил ба моль — жинхэнэ химийн цөм.',
  },
  hard: {
    name: 'Ахисан шат',
    title: 'Мастер химич',
    description: 'Урвалыг мэргэжлийн химич шиг тооцоолж, урьдчилан таамаглаж, удирдана.',
  },
};

export function getClass(id: ClassId): ChemClass {
  const found = CLASSES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown class: ${id}`);
  return found;
}

export function findLesson(lessonId: string): Lesson | undefined {
  for (const chemClass of CLASSES) {
    const lesson = chemClass.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}
