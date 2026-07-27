// A small CBSE Class 10 Maths syllabus corpus so retrieval has something to
// ground on out of the box. Real deployments ingest full syllabus/textbook/
// question-bank material via POST /api/rag/ingest.

import type { Store } from '../db/store.ts'
import { credsFromEnv } from '../llm/index.ts'
import { ingest, type RawDoc } from './index.ts'

export const DEMO_CORPUS: RawDoc[] = [
  // ----- Maths -----
  // Real Numbers (Ch.1)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Real Numbers', source: 'NCERT Ch.1', content: 'The Fundamental Theorem of Arithmetic: every composite number can be expressed as a product of primes, and this factorisation is unique apart from the order of the factors.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Real Numbers', source: 'NCERT Ch.1', content: 'For any two positive integers, HCF times LCM equals the product of the numbers. Prime factorisation gives HCF as the product of the smallest powers of common primes and LCM as the product of the greatest powers of all primes involved.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Real Numbers', source: 'NCERT Ch.1', content: 'Numbers such as sqrt(2), sqrt(3) and sqrt(5) are irrational. This is proved by contradiction, assuming the number is rational and reaching a contradiction with the Fundamental Theorem of Arithmetic.' },

  // Polynomials (Ch.2)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Polynomials', source: 'NCERT Ch.2', content: 'For a quadratic polynomial ax^2 + bx + c, the sum of zeroes is -b/a and the product of zeroes is c/a. The zeroes are the x-coordinates of the points where the graph meets the x-axis.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Polynomials', source: 'NCERT Ch.2', content: 'A polynomial of degree n has at most n zeroes. A linear polynomial has at most one zero, a quadratic at most two, and a cubic at most three.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Polynomials', source: 'NCERT Ch.2', content: 'Division algorithm for polynomials: given polynomials p(x) and non-zero g(x), there exist q(x) and r(x) with p(x) = g(x) q(x) + r(x), where r(x) = 0 or degree of r(x) is less than degree of g(x).' },

  // Linear Equations (Ch.3)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Linear Equations', source: 'NCERT Ch.3', content: 'A pair of linear equations in two variables can be solved algebraically by substitution, elimination, or cross-multiplication. Graphically, the solution is the point where the two straight lines intersect.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Linear Equations', source: 'NCERT Ch.3', content: 'For equations a1x + b1y + c1 = 0 and a2x + b2y + c2 = 0: if a1/a2 is not equal to b1/b2 the lines intersect at one point (unique solution); if a1/a2 = b1/b2 = c1/c2 the lines coincide (infinitely many solutions); if a1/a2 = b1/b2 not equal to c1/c2 the lines are parallel (no solution).' },

  // Quadratics (Ch.4) — keep existing chapter name 'Quadratics'
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'NCERT Ch.4', content: 'A quadratic equation in x is of the form ax^2 + bx + c = 0, where a, b, c are real numbers and a is not 0. Its roots are the values of x that satisfy the equation.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'NCERT Ch.4', content: 'Solving quadratic equations by factorisation: split the middle term into two terms whose product is a times c and whose sum is b, then set each factor equal to zero.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'NCERT Ch.4', content: 'The quadratic formula gives the roots x = (-b +/- sqrt(b^2 - 4ac)) / (2a). The discriminant D = b^2 - 4ac decides the nature of roots: D>0 two distinct real roots, D=0 two equal real roots, D<0 no real roots.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'NCERT Ch.4', content: 'Word problems: translate a real situation (areas, speed-distance-time, ages, consecutive numbers) into a quadratic equation by choosing a variable, forming the equation, and solving it.' },

  // Arithmetic Progressions (Ch.5)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Arithmetic Progressions', source: 'NCERT Ch.5', content: 'An arithmetic progression (AP) is a list of numbers in which each term is obtained by adding a fixed number d, the common difference, to the preceding term. The nth term is a_n = a + (n - 1)d, where a is the first term.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Arithmetic Progressions', source: 'NCERT Ch.5', content: 'The sum of the first n terms of an AP is S_n = (n/2)(2a + (n - 1)d), which can also be written as S_n = (n/2)(a + l) where l is the last term.' },

  // Triangles (Ch.6)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Triangles', source: 'NCERT Ch.6', content: 'Two triangles are similar if their corresponding angles are equal and their corresponding sides are in the same ratio. Criteria for similarity include AAA (or AA), SSS, and SAS.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Triangles', source: 'NCERT Ch.6', content: 'Basic Proportionality Theorem (Thales): if a line is drawn parallel to one side of a triangle to intersect the other two sides, it divides those two sides in the same ratio.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Triangles', source: 'NCERT Ch.6', content: 'The ratio of the areas of two similar triangles equals the square of the ratio of their corresponding sides.' },

  // Coordinate Geometry (Ch.7)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Coordinate Geometry', source: 'NCERT Ch.7', content: 'The distance between two points (x1, y1) and (x2, y2) is sqrt((x2 - x1)^2 + (y2 - y1)^2). The distance of a point from the origin is sqrt(x^2 + y^2).' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Coordinate Geometry', source: 'NCERT Ch.7', content: 'Section formula: the point dividing the join of (x1, y1) and (x2, y2) internally in the ratio m:n is ((m x2 + n x1)/(m + n), (m y2 + n y1)/(m + n)). The midpoint is ((x1 + x2)/2, (y1 + y2)/2).' },

  // Trigonometry (Ch.8)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Trigonometry', source: 'NCERT Ch.8', content: 'For an acute angle in a right triangle, sin = opposite/hypotenuse, cos = adjacent/hypotenuse, and tan = opposite/adjacent. Also cosec, sec and cot are the reciprocals of sin, cos and tan respectively.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Trigonometry', source: 'NCERT Ch.8', content: 'Fundamental identities: sin^2 A + cos^2 A = 1, 1 + tan^2 A = sec^2 A, and 1 + cot^2 A = cosec^2 A.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Trigonometry', source: 'NCERT Ch.8', content: 'Standard values: sin 0 = 0, sin 30 = 1/2, sin 45 = 1/sqrt(2), sin 60 = sqrt(3)/2, sin 90 = 1; cos takes these values in reverse order. tan 45 = 1.' },

  // Applications of Trigonometry (Ch.9)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Applications of Trigonometry', source: 'NCERT Ch.9', content: 'Heights and distances are found using the angle of elevation (looking upward from the horizontal) and the angle of depression (looking downward from the horizontal), together with trigonometric ratios.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Applications of Trigonometry', source: 'NCERT Ch.9', content: 'A typical problem models the object and observer as a right triangle, uses tan of the angle of elevation or depression as height over horizontal distance, and solves for the unknown length.' },

  // Circles (Ch.10)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Circles', source: 'NCERT Ch.10', content: 'The tangent to a circle at any point is perpendicular to the radius drawn to that point of contact.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Circles', source: 'NCERT Ch.10', content: 'The lengths of the two tangents drawn from an external point to a circle are equal.' },

  // Areas Related to Circles (Ch.12)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Areas Related to Circles', source: 'NCERT Ch.12', content: 'For a circle of radius r, the circumference is 2 pi r and the area is pi r^2. The length of an arc of a sector of angle theta (in degrees) is (theta/360) times 2 pi r.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Areas Related to Circles', source: 'NCERT Ch.12', content: 'The area of a sector of angle theta is (theta/360) times pi r^2. The area of a segment is the area of the corresponding sector minus the area of the triangle formed by the two radii and the chord.' },

  // Surface Areas and Volumes (Ch.13)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Surface Areas and Volumes', source: 'NCERT Ch.13', content: 'Surface area and volume of a combination of solids (such as a cone on a cylinder or a hemisphere on a cuboid) are found by adding the surface areas or volumes of the individual solids, taking care of shared faces.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Surface Areas and Volumes', source: 'NCERT Ch.13', content: 'Key formulae: volume of a cylinder is pi r^2 h, of a cone is (1/3) pi r^2 h, and of a sphere is (4/3) pi r^3. The curved surface area of a cone is pi r l, where l is the slant height.' },

  // Statistics (Ch.14)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Statistics', source: 'NCERT Ch.14', content: 'For grouped data the mean can be found by the direct method, the assumed mean method, or the step-deviation method. The mean is the sum of f times x divided by the sum of f, where x is the class mark.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Statistics', source: 'NCERT Ch.14', content: 'The mode of grouped data is l + ((f1 - f0)/(2 f1 - f0 - f2)) times h, where l is the lower limit of the modal class and h the class size. The empirical relation is Mode = 3 Median - 2 Mean.' },

  // Probability (Ch.15)
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Probability', source: 'NCERT Ch.15', content: 'The theoretical probability of an event E is the number of outcomes favourable to E divided by the total number of equally likely outcomes. Its value always lies between 0 and 1.' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Probability', source: 'NCERT Ch.15', content: 'The probability of an event and its complement add up to 1, so P(not E) = 1 - P(E). The probability of an impossible event is 0 and of a sure event is 1.' },

  // ----- Science -----
  // Chemical Reactions (Ch.1)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Chemical Reactions', source: 'NCERT Ch.1', content: 'A chemical reaction is shown by changes such as evolution of a gas, change in colour, change in temperature, formation of a precipitate, or change in state. A balanced chemical equation has equal numbers of atoms of each element on both sides, following the law of conservation of mass.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Chemical Reactions', source: 'NCERT Ch.1', content: 'Types of reactions include combination, decomposition, displacement, and double displacement. Decomposition can be brought about by heat (thermal), light (photolytic), or electricity (electrolytic).' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Chemical Reactions', source: 'NCERT Ch.1', content: 'Oxidation is the gain of oxygen or loss of hydrogen, and reduction is the loss of oxygen or gain of hydrogen. Corrosion (such as rusting of iron) and rancidity of oils are everyday effects of oxidation.' },

  // Acids Bases and Salts (Ch.2)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Acids Bases and Salts', source: 'NCERT Ch.2', content: 'Acids release H+ (as H3O+) ions in water and bases release OH- ions. Acids turn blue litmus red, bases turn red litmus blue, and their reaction (neutralisation) produces salt and water.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Acids Bases and Salts', source: 'NCERT Ch.2', content: 'The pH scale runs from 0 to 14: values below 7 are acidic, 7 is neutral, and above 7 is basic. Lower pH means a more acidic solution.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Acids Bases and Salts', source: 'NCERT Ch.2', content: 'Important compounds: washing soda (Na2CO3.10H2O), baking soda (NaHCO3), bleaching powder (CaOCl2), and plaster of Paris (CaSO4.1/2 H2O), each with specific uses.' },

  // Metals and Non-metals (Ch.3)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Metals and Non-metals', source: 'NCERT Ch.3', content: 'Metals are generally malleable, ductile, lustrous, and good conductors of heat and electricity, whereas non-metals are mostly poor conductors and are neither malleable nor ductile.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Metals and Non-metals', source: 'NCERT Ch.3', content: 'The reactivity series ranks metals by reactivity; a more reactive metal displaces a less reactive one from its salt solution. Highly reactive metals are extracted by electrolysis of their molten compounds.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Metals and Non-metals', source: 'NCERT Ch.3', content: 'Ionic (electrovalent) compounds form when metals transfer electrons to non-metals; they have high melting points and conduct electricity in molten or aqueous state. Metals are extracted from ores by roasting or calcination followed by reduction.' },

  // Carbon Compounds (Ch.4)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Carbon Compounds', source: 'NCERT Ch.4', content: 'Carbon forms strong covalent bonds and shows catenation (self-linking) and tetravalency, giving rise to a very large number of compounds. Saturated compounds have single bonds (alkanes) and unsaturated ones have double or triple bonds (alkenes, alkynes).' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Carbon Compounds', source: 'NCERT Ch.4', content: 'Functional groups such as alcohol (-OH), aldehyde (-CHO), ketone, carboxylic acid (-COOH), and halogens give characteristic properties. A homologous series has members differing by CH2 with similar chemical properties.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Carbon Compounds', source: 'NCERT Ch.4', content: 'Ethanol and ethanoic acid are important carbon compounds. Ethanoic acid (acetic acid) in about 5 to 8 percent solution is called vinegar; esterification of an acid with an alcohol produces sweet-smelling esters. Soaps and detergents clean by forming micelles.' },

  // Life Processes (Ch.5)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Life Processes', source: 'NCERT Ch.5', content: 'Life processes include nutrition, respiration, transportation, and excretion. In autotrophic nutrition, plants make food by photosynthesis using carbon dioxide and water in the presence of chlorophyll and sunlight.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Life Processes', source: 'NCERT Ch.5', content: 'In humans, digestion breaks food into absorbable forms with the help of enzymes. Respiration releases energy from glucose; aerobic respiration uses oxygen and gives more energy than anaerobic respiration.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Life Processes', source: 'NCERT Ch.5', content: 'In humans, the heart pumps blood through a double circulation. Xylem transports water and minerals in plants while phloem transports food. Excretion in humans occurs mainly through the kidneys, which form urine.' },

  // Control and Coordination (Ch.6)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Control and Coordination', source: 'NCERT Ch.6', content: 'In animals, control and coordination are carried out by the nervous system and hormones. A reflex action is a quick, automatic response mediated by the spinal cord through a reflex arc.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Control and Coordination', source: 'NCERT Ch.6', content: 'The brain has three main parts: the forebrain (thinking and voluntary actions), the midbrain and hindbrain (including the cerebellum for balance and the medulla for involuntary actions like heartbeat).' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Control and Coordination', source: 'NCERT Ch.6', content: 'In plants, coordination is chemical through hormones such as auxins (growth and phototropism), gibberellins, cytokinins, and abscisic acid. Movements can be tropic (directional, like phototropism) or nastic.' },

  // Reproduction (Ch.7)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Reproduction', source: 'NCERT Ch.7', content: 'Reproduction may be asexual (single parent, offspring genetically identical) by methods such as fission, budding, fragmentation, regeneration, spore formation, and vegetative propagation, or sexual (two parents, involving gametes).' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Reproduction', source: 'NCERT Ch.7', content: 'In flowering plants, the stamen is the male part and the carpel (pistil) the female part; pollination is followed by fertilisation, and the fertilised ovule becomes a seed. Sexual reproduction increases variation.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Reproduction', source: 'NCERT Ch.7', content: 'The human reproductive system produces gametes; fertilisation forms a zygote that develops in the uterus, nourished through the placenta. Contraceptive methods and reproductive health are also studied.' },

  // Heredity (Ch.8)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Heredity', source: 'NCERT Ch.8', content: 'Heredity is the transmission of characters from parents to offspring through genes. Mendel proposed rules of inheritance using pea plants, introducing dominant and recessive traits.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Heredity', source: 'NCERT Ch.8', content: 'In a monohybrid cross of pure tall and pure short pea plants, the F1 generation is all tall, and the F2 generation shows a 3:1 ratio of tall to short, illustrating dominant and recessive alleles.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Heredity', source: 'NCERT Ch.8', content: 'Sex in humans is determined by chromosomes: females are XX and males are XY. A child inheriting X from the father becomes a girl and Y becomes a boy.' },

  // Light (Ch.10)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Light', source: 'NCERT Ch.10', content: 'Light reflection follows the laws of reflection: the angle of incidence equals the angle of reflection, and the incident ray, reflected ray, and normal lie in the same plane. Spherical mirrors are concave or convex.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Light', source: 'NCERT Ch.10', content: 'The mirror formula is 1/v + 1/u = 1/f and the lens formula is 1/v - 1/u = 1/f. Magnification for a mirror is m = -v/u, using the New Cartesian Sign Convention.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Light', source: 'NCERT Ch.10', content: 'Refraction is the bending of light when it passes from one medium to another due to change in speed. The refractive index relates the speed of light in the two media, and the power of a lens is P = 1/f (in dioptres, f in metres).' },

  // Human Eye (Ch.11)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Human Eye', source: 'NCERT Ch.11', content: 'The human eye forms images on the retina; the ciliary muscles change the curvature of the lens to focus objects at different distances, a property called accommodation.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Human Eye', source: 'NCERT Ch.11', content: 'Defects of vision include myopia (short-sightedness, corrected by a concave lens), hypermetropia (long-sightedness, corrected by a convex lens), and presbyopia. Dispersion of white light by a prism gives the spectrum, and scattering explains the blue sky and red sunrise or sunset.' },

  // Electricity (Ch.12)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Electricity', source: 'NCERT Ch.12', content: 'Electric current is the rate of flow of charge, I = Q/t, measured in amperes. Ohm law states that the current through a conductor is directly proportional to the potential difference across it at constant temperature, so V = I R.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Electricity', source: 'NCERT Ch.12', content: 'Resistance depends on length, area of cross-section, and material (resistivity). In series, resistances add up; in parallel, the reciprocal of the total equals the sum of the reciprocals of the individual resistances.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Electricity', source: 'NCERT Ch.12', content: 'Electric power is P = V I = I^2 R = V^2 / R, measured in watts. The heating effect of current is given by H = I^2 R t (Joule heating), used in appliances like heaters and bulbs.' },

  // Magnetic Effects of Current (Ch.13)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Magnetic Effects of Current', source: 'NCERT Ch.13', content: 'A current-carrying conductor produces a magnetic field around it. The direction of the field around a straight wire is given by the right-hand thumb rule.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Magnetic Effects of Current', source: 'NCERT Ch.13', content: 'A current-carrying conductor in a magnetic field experiences a force whose direction is given by Fleming left-hand rule; this principle is used in electric motors.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Magnetic Effects of Current', source: 'NCERT Ch.13', content: 'Electromagnetic induction produces a current in a coil when the magnetic field through it changes; its direction is given by Fleming right-hand rule. This is the basis of the electric generator.' },

  // Our Environment (Ch.15)
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Our Environment', source: 'NCERT Ch.15', content: 'In an ecosystem, organisms are grouped into trophic levels: producers, consumers, and decomposers. Energy flows in one direction, and only about 10 percent of energy is transferred from one trophic level to the next.' },
  { board: 'CBSE', klass: 10, subject: 'Science', chapter: 'Our Environment', source: 'NCERT Ch.15', content: 'Food chains and food webs show feeding relationships. Non-biodegradable substances and harmful chemicals can accumulate at higher trophic levels (biomagnification), and damage to the ozone layer by CFCs increases harmful ultraviolet radiation.' },
]

/** Seed the demo corpus once, if the corpus is empty. */
export async function seedCorpusIfEmpty(store: Store): Promise<void> {
  if ((await store.countChunks()) > 0) return
  try {
    const n = await ingest(store, DEMO_CORPUS, credsFromEnv())
    console.log(`[rag] seeded ${n} demo syllabus chunks`)
  } catch (err) {
    console.warn('[rag] corpus seed skipped:', err)
  }
}
