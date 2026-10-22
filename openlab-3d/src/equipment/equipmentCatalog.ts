/**
 * Catalog of every piece of equipment: display name, category, description and safety
 * note, plus the physical footprint used for pickable colliders and placement.
 */
export type EquipmentKind =
  | 'millikan'
  | 'microscope'
  | 'beaker'
  | 'erlenmeyer'
  | 'testTube'
  | 'testTubeRack'
  | 'graduatedCylinder'
  | 'atomizer'
  | 'reagentBottle'
  | 'creamBottle'
  | 'bunsenBurner'
  | 'petriDish'
  | 'pipette'
  | 'laptop'
  | 'multimeter'
  | 'powerSupply'
  | 'scale'
  | 'thermometer'
  | 'goggles'
  | 'specimenJar'
  | 'slideBox'
  | 'fireExtinguisher';

export type EquipmentCategory = 'Apparatus' | 'Optics' | 'Glassware' | 'Electronics' | 'Heating' | 'Measurement' | 'Biology' | 'Safety';

export type ColliderShape =
  | { shape: 'cuboid'; size: [number, number, number] }
  | { shape: 'cylinder'; radius: number; height: number };

export interface CatalogEntry {
  kind: EquipmentKind;
  name: string;
  category: EquipmentCategory;
  description: string;
  safety: string;
  /** Approximate bounding size in meters [width, height, depth]. */
  size: [number, number, number];
  collider: ColliderShape;
  /** Can be picked up, carried and placed. */
  pickable: boolean;
  /** Appears in the Tools drawer and can be spawned onto a bench. */
  spawnable: boolean;
  massKg: number;
}

const cyl = (radius: number, height: number): ColliderShape => ({ shape: 'cylinder', radius, height });
const box = (w: number, h: number, d: number): ColliderShape => ({ shape: 'cuboid', size: [w, h, d] });

export const CATALOG: Record<EquipmentKind, CatalogEntry> = {
  millikan: {
    kind: 'millikan',
    name: 'Millikan Oil Drop Apparatus',
    category: 'Apparatus',
    description:
      'Two horizontal capacitor plates 6 mm apart inside a clear chamber. Charged oil droplets are suspended between them and observed through a measuring microscope to determine the elementary charge e.',
    safety: 'The plates carry up to 600 V. Keep the polarity switch at 0 while handling the chamber and never touch the plate contacts.',
    size: [0.45, 0.4, 0.3],
    collider: box(0.45, 0.4, 0.3),
    pickable: false,
    spawnable: false,
    massKg: 6,
  },
  microscope: {
    kind: 'microscope',
    name: 'Compound Microscope',
    category: 'Optics',
    description: 'A monocular light microscope with a revolving nosepiece holding 4×, 10× and 40× objectives, a mechanical stage and coarse/fine focus.',
    safety: 'Carry with one hand under the base and one on the arm. Always start focusing with the lowest-power objective.',
    size: [0.18, 0.36, 0.24],
    collider: box(0.18, 0.36, 0.24),
    pickable: false,
    spawnable: false,
    massKg: 4,
  },
  beaker: {
    kind: 'beaker',
    name: 'Beaker (250 mL)',
    category: 'Glassware',
    description: 'Borosilicate glass beaker with a pouring spout and printed graduations. Used for mixing, heating and holding liquids.',
    safety: 'Graduations are approximate — use a graduated cylinder for accurate volumes. Hot glass looks exactly like cold glass.',
    size: [0.075, 0.095, 0.075],
    collider: cyl(0.036, 0.095),
    pickable: true,
    spawnable: true,
    massKg: 0.12,
  },
  erlenmeyer: {
    kind: 'erlenmeyer',
    name: 'Erlenmeyer Flask (250 mL)',
    category: 'Glassware',
    description: 'A conical flask whose narrow neck reduces splashing and evaporation. Ideal for swirling and titrations.',
    safety: 'Never heat a sealed flask. Swirl gently and point the opening away from people.',
    size: [0.085, 0.14, 0.085],
    collider: cyl(0.042, 0.14),
    pickable: true,
    spawnable: true,
    massKg: 0.14,
  },
  testTube: {
    kind: 'testTube',
    name: 'Test Tube',
    category: 'Glassware',
    description: '16 × 150 mm borosilicate test tube for small-scale reactions and samples.',
    safety: 'When heating, hold it at an angle with a tube holder and never point the mouth at anyone.',
    size: [0.018, 0.018, 0.15],
    collider: box(0.018, 0.018, 0.15),
    pickable: true,
    spawnable: true,
    massKg: 0.02,
  },
  testTubeRack: {
    kind: 'testTubeRack',
    name: 'Test Tube Rack',
    category: 'Glassware',
    description: 'A two-tier polypropylene rack that holds six test tubes upright.',
    safety: 'Keep the rack away from the edge of the bench so tubes cannot tip over.',
    size: [0.2, 0.09, 0.07],
    collider: box(0.2, 0.09, 0.07),
    pickable: true,
    spawnable: true,
    massKg: 0.25,
  },
  graduatedCylinder: {
    kind: 'graduatedCylinder',
    name: 'Graduated Cylinder (100 mL)',
    category: 'Measurement',
    description: 'A tall, narrow cylinder with fine graduations for measuring liquid volumes to ±1 mL. Read the bottom of the meniscus at eye level.',
    safety: 'Tall cylinders tip easily — keep them upright and away from the bench edge.',
    size: [0.06, 0.25, 0.06],
    collider: cyl(0.03, 0.25),
    pickable: true,
    spawnable: true,
    massKg: 0.2,
  },
  atomizer: {
    kind: 'atomizer',
    name: 'Oil Atomizer',
    category: 'Apparatus',
    description: 'A frosted bottle of low-vapour-pressure oil with a rubber squeeze bulb. Each squeeze sprays a fine mist of microscopic droplets into the chamber.',
    safety: 'Spray only into the chamber opening. Clean up spilled oil immediately — it makes the floor slippery.',
    size: [0.14, 0.12, 0.07],
    collider: box(0.14, 0.12, 0.07),
    pickable: false,
    spawnable: false,
    massKg: 0.15,
  },
  reagentBottle: {
    kind: 'reagentBottle',
    name: 'Reagent Bottle',
    category: 'Glassware',
    description: 'An amber glass bottle with a screw cap, used for storing light-sensitive solutions.',
    safety: 'Always read the label twice before using a reagent and replace the cap immediately.',
    size: [0.065, 0.14, 0.065],
    collider: cyl(0.032, 0.14),
    pickable: true,
    spawnable: true,
    massKg: 0.3,
  },
  creamBottle: {
    kind: 'creamBottle',
    name: 'Oil Reservoir Bottle',
    category: 'Apparatus',
    description: 'A small cream-coloured plastic bottle holding refill oil for the atomizer.',
    safety: 'Keep capped when not refilling the atomizer.',
    size: [0.045, 0.085, 0.045],
    collider: cyl(0.022, 0.085),
    pickable: true,
    spawnable: true,
    massKg: 0.08,
  },
  bunsenBurner: {
    kind: 'bunsenBurner',
    name: 'Bunsen Burner',
    category: 'Heating',
    description: 'A gas burner with an adjustable air collar. A blue cone flame is the hottest and cleanest.',
    safety: 'Tie back long hair, wear goggles, and never leave a lit burner unattended.',
    size: [0.1, 0.17, 0.1],
    collider: cyl(0.045, 0.17),
    pickable: false,
    spawnable: false,
    massKg: 0.6,
  },
  petriDish: {
    kind: 'petriDish',
    name: 'Petri Dish',
    category: 'Biology',
    description: 'A shallow lidded dish holding nutrient agar for growing microbial cultures.',
    safety: 'Keep cultured dishes closed and taped. Dispose of them in the biohazard bin.',
    size: [0.09, 0.016, 0.09],
    collider: cyl(0.045, 0.016),
    pickable: true,
    spawnable: true,
    massKg: 0.03,
  },
  pipette: {
    kind: 'pipette',
    name: 'Pasteur Pipette',
    category: 'Glassware',
    description: 'A glass dropper with a rubber bulb for transferring small volumes drop by drop.',
    safety: 'Never pipette by mouth. The thin tip breaks easily.',
    size: [0.022, 0.022, 0.2],
    collider: box(0.022, 0.022, 0.2),
    pickable: true,
    spawnable: true,
    massKg: 0.01,
  },
  laptop: {
    kind: 'laptop',
    name: 'Lab Laptop',
    category: 'Electronics',
    description: 'Runs the OpenLab data logger: it records your droplet timings and computes each droplet’s charge.',
    safety: 'Keep liquids away from the keyboard.',
    size: [0.32, 0.22, 0.24],
    collider: box(0.32, 0.22, 0.24),
    pickable: false,
    spawnable: false,
    massKg: 1.6,
  },
  multimeter: {
    kind: 'multimeter',
    name: 'Digital Multimeter',
    category: 'Electronics',
    description: 'Measures voltage, current and resistance. Turn the rotary dial to choose the range.',
    safety: 'Choose the range before connecting probes, and never measure resistance on a live circuit.',
    size: [0.09, 0.04, 0.18],
    collider: box(0.09, 0.04, 0.18),
    pickable: true,
    spawnable: true,
    massKg: 0.35,
  },
  powerSupply: {
    kind: 'powerSupply',
    name: 'DC Power Supply',
    category: 'Electronics',
    description: 'A bench supply providing 0–30 V DC with an adjustable current limit and a digital display.',
    safety: 'Set the voltage to zero before connecting a circuit, then raise it slowly.',
    size: [0.24, 0.13, 0.26],
    collider: box(0.24, 0.13, 0.26),
    pickable: false,
    spawnable: false,
    massKg: 3,
  },
  scale: {
    kind: 'scale',
    name: 'Analytical Balance',
    category: 'Measurement',
    description: 'Weighs samples to 0.001 g. The glass draft shield keeps air currents from disturbing the reading.',
    safety: 'Never weigh chemicals directly on the pan — use weighing paper or a boat, and tare first.',
    size: [0.22, 0.3, 0.32],
    collider: box(0.22, 0.3, 0.32),
    pickable: false,
    spawnable: false,
    massKg: 5,
  },
  thermometer: {
    kind: 'thermometer',
    name: 'Laboratory Thermometer',
    category: 'Measurement',
    description: 'A spirit-filled glass thermometer reading −10 °C to 110 °C.',
    safety: 'Don’t use it as a stirring rod. Report breakages to the instructor.',
    size: [0.016, 0.016, 0.3],
    collider: box(0.016, 0.016, 0.3),
    pickable: true,
    spawnable: true,
    massKg: 0.02,
  },
  goggles: {
    kind: 'goggles',
    name: 'Safety Goggles',
    category: 'Safety',
    description: 'Indirect-vent splash goggles that seal around the eyes. They are required whenever chemicals or glassware are in use.',
    safety: 'Wear them over prescription glasses. Clean and disinfect after use.',
    size: [0.17, 0.07, 0.1],
    collider: box(0.17, 0.07, 0.1),
    pickable: true,
    spawnable: true,
    massKg: 0.08,
  },
  specimenJar: {
    kind: 'specimenJar',
    name: 'Specimen Jar',
    category: 'Biology',
    description: 'A preserved biological specimen stored in fixative inside a sealed glass jar.',
    safety: 'Do not open — the fixative fumes are irritating. Handle with both hands.',
    size: [0.1, 0.16, 0.1],
    collider: cyl(0.05, 0.16),
    pickable: true,
    spawnable: true,
    massKg: 0.6,
  },
  slideBox: {
    kind: 'slideBox',
    name: 'Prepared Slide Box',
    category: 'Biology',
    description: 'A box of prepared microscope slides: onion epidermis, blood smear, pond water and leaf section.',
    safety: 'Hold slides by the edges. Cover slips are thin and sharp when broken.',
    size: [0.1, 0.03, 0.08],
    collider: box(0.1, 0.03, 0.08),
    pickable: true,
    spawnable: true,
    massKg: 0.15,
  },
  fireExtinguisher: {
    kind: 'fireExtinguisher',
    name: 'CO₂ Fire Extinguisher',
    category: 'Safety',
    description: 'A 5 kg carbon-dioxide extinguisher suitable for electrical and flammable-liquid fires.',
    safety: 'Remember P.A.S.S.: Pull the pin, Aim at the base, Squeeze the handle, Sweep side to side.',
    size: [0.2, 0.62, 0.2],
    collider: cyl(0.08, 0.62),
    pickable: false,
    spawnable: false,
    massKg: 9,
  },
};

export const SPAWNABLE_KINDS: EquipmentKind[] = (Object.keys(CATALOG) as EquipmentKind[]).filter((k) => CATALOG[k].spawnable);
