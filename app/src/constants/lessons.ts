import { Lesson, Rival } from '../types';

export const LESSONS: Lesson[] = [
  {
    id: 'b1',
    tier: 'Beginner',
    title: 'Atoms',
    questions: [
      { q: 'What is the smallest unit of an element?', options: ['Atom', 'Cell', 'Crystal'], answer: 0 },
      { q: 'Which particle has a negative charge?', options: ['Proton', 'Electron', 'Neutron'], answer: 1 },
    ],
  },
  {
    id: 'b2',
    tier: 'Beginner',
    title: 'States of Matter',
    questions: [
      { q: 'Which state has a fixed volume but no fixed shape?', options: ['Solid', 'Liquid', 'Gas'], answer: 1 },
      { q: 'Liquid turning into gas is called?', options: ['Melting', 'Freezing', 'Evaporation'], answer: 2 },
    ],
  },
  {
    id: 'b3',
    tier: 'Beginner',
    title: 'Lab Basics',
    questions: [
      { q: 'What protects your eyes in the lab?', options: ['Goggles', 'Gloves only', 'A hat'], answer: 0 },
      { q: 'A beaker is mainly used to?', options: ['Hold liquids', 'Cut things', 'Weigh air'], answer: 0 },
    ],
  },
  {
    id: 'i1',
    tier: 'Intermediate',
    title: 'Periodic Table',
    questions: [
      { q: 'A column of the periodic table is called a?', options: ['Period', 'Group', 'Block'], answer: 1 },
      { q: 'What is the symbol for sodium?', options: ['So', 'Sd', 'Na'], answer: 2 },
    ],
  },
  {
    id: 'i2',
    tier: 'Intermediate',
    title: 'Chemical Bonds',
    questions: [
      { q: 'Which bond shares electrons?', options: ['Covalent', 'Ionic', 'Magnetic'], answer: 0 },
      { q: 'Table salt (NaCl) has which bond?', options: ['Covalent', 'Ionic', 'Metallic'], answer: 1 },
    ],
  },
  {
    id: 'i3',
    tier: 'Intermediate',
    title: 'pH Scale',
    questions: [
      { q: 'What is the pH of pure water?', options: ['1', '7', '14'], answer: 1 },
      { q: 'A pH below 7 is?', options: ['Acidic', 'Neutral', 'Basic'], answer: 0 },
    ],
  },
  {
    id: 'a1',
    tier: 'Advanced',
    title: 'Balancing',
    questions: [
      { q: '_H2 + O2 -> 2H2O. What goes in the blank?', options: ['1', '2', '3'], answer: 1 },
      { q: 'Balancing equations follows the law of?', options: ['Gravity', 'Conservation of mass', 'Motion'], answer: 1 },
    ],
  },
  {
    id: 'a2',
    tier: 'Advanced',
    title: 'The Mole',
    questions: [
      { q: "Avogadro's number is about?", options: ['6.02 x 10^23', '3.14 x 10^8', '9.8 x 10^2'], answer: 0 },
      { q: 'Molar mass of water is about?', options: ['2 g/mol', '18 g/mol', '44 g/mol'], answer: 1 },
    ],
  },
  {
    id: 'a3',
    tier: 'Advanced',
    title: 'Reaction Types',
    questions: [
      { q: 'A + B -> AB is a ... reaction?', options: ['Synthesis', 'Decomposition', 'Displacement'], answer: 0 },
      { q: 'AB -> A + B is a ... reaction?', options: ['Synthesis', 'Decomposition', 'Combustion'], answer: 1 },
    ],
  },
];

export const RIVALS: Rival[] = [
  { nickname: 'NovaFizz', xp: 2450, tier: 'Advanced', color: '#60a5fa' },
  { nickname: 'AtomAnt', xp: 1980, tier: 'Advanced', color: '#f472b6' },
  { nickname: 'BondJames', xp: 1500, tier: 'Intermediate', color: '#fbbf24' },
  { nickname: 'MoleMaster', xp: 1210, tier: 'Intermediate', color: '#a78bfa' },
  { nickname: 'QuarkQueen', xp: 860, tier: 'Intermediate', color: '#34d399' },
  { nickname: 'BeakerBob', xp: 430, tier: 'Beginner', color: '#fb923c' },
  { nickname: 'Gasbag', xp: 190, tier: 'Beginner', color: '#f87171' },
];
