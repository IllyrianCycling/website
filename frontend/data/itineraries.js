/* ILLYRIAN CYCLING — SELF-GUIDED PERFORMANCE
 * Configurable itinerary data model.
 *
 * Where final route metrics are not yet confirmed, values use "—" (TBC).
 * Replace these placeholders with confirmed numbers as the architecture is finalised.
 */

window.ILLYRIAN = window.ILLYRIAN || {};

window.ILLYRIAN.itineraries = [
  {
    id: 'it-3day',
    name: '3 DAY',
    tagline: 'COAST TO MOUNTAIN',
    summary:
      'A compact introduction to Montenegro\u2019s coast-to-mountain terrain. Three consecutive riding days with no scheduled recovery.',
    metrics: {
      duration: '3 days',
      ridingDays: '3',
      recoveryDays: '0',
      distance: '\u2014',
      elevation: '\u2014',
      maxElevation: '1,670m',
      terrain: 'Coast \u00B7 Serpentine \u00B7 Climb',
      riderProfile: 'Experienced \u00B7 Comfortable on climbs',
      difficulty: 'MODERATE',
      start: 'Tivat',
      finish: 'Kotor',
      accommodation: 'Premium \u00B7 Hand-selected',
      price: null
    },
    loadModel: ['LOAD', 'LOAD', 'PEAK'],
    days: [
      {
        day: '01',
        name: 'COASTAL OPENING',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'MODERATE',
        purpose: 'Introduce the terrain and establish a baseline load.'
      },
      {
        day: '02',
        name: 'MOUNTAIN LOAD',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'HIGH',
        purpose: 'First climbing stimulus out of the coast.'
      },
      {
        day: '03',
        name: 'ADRIATIC EDGE',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'HIGH',
        purpose: 'Close the block with the primary performance day.'
      }
    ]
  },
  {
    id: 'it-5day',
    name: '5 DAY',
    tagline: 'THE PERFORMANCE BLOCK',
    summary:
      'The core Illyrian self-guided block. A complete progression engineered around accumulated load, recovery and a defined peak.',
    metrics: {
      duration: '5 days',
      ridingDays: '4',
      recoveryDays: '1',
      distance: '\u2014',
      elevation: '\u2014',
      maxElevation: '1,970m',
      terrain: 'Coast \u00B7 Alpine \u00B7 Canyon',
      riderProfile: 'Experienced \u00B7 Sustained climbing',
      difficulty: 'HIGH',
      start: 'Tivat',
      finish: 'Tivat',
      accommodation: 'Premium \u00B7 Hand-selected',
      price: null
    },
    loadModel: ['LOAD', 'LOAD', 'RECOVER', 'LOAD', 'PEAK'],
    days: [
      {
        day: '01',
        name: 'COASTAL OPENING',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'MODERATE',
        purpose: 'Introduce the terrain and establish a baseline load.'
      },
      {
        day: '02',
        name: 'MOUNTAIN LOAD',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'HIGH',
        purpose: 'Major climbing stimulus in the Dinaric Alps.'
      },
      {
        day: '03',
        name: 'RECOVERY',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'LOW',
        purpose: 'Absorb accumulated load before the next block.'
      },
      {
        day: '04',
        name: 'HIGH TERRAIN',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'HIGH',
        purpose: 'Primary performance day on high terrain.'
      },
      {
        day: '05',
        name: 'ADRIATIC EDGE',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'MODERATE / HIGH',
        purpose: 'Final objective and completion of the block.'
      }
    ]
  },
  {
    id: 'it-7day',
    name: '7 DAY',
    tagline: 'DEEP PROGRESSION',
    summary:
      'A deeper performance progression with additional recovery and terrain variation. Designed for a longer accumulation of load.',
    metrics: {
      duration: '7 days',
      ridingDays: '5',
      recoveryDays: '2',
      distance: '\u2014',
      elevation: '\u2014',
      maxElevation: '2,400m',
      terrain: 'Coast \u00B7 Alpine \u00B7 Canyon \u00B7 Plateau',
      riderProfile: 'Experienced \u00B7 Multi-day load',
      difficulty: 'HIGH',
      start: 'Tivat',
      finish: 'Kotor',
      accommodation: 'Premium \u00B7 Hand-selected',
      price: null
    },
    loadModel: ['LOAD', 'LOAD', 'RECOVER', 'LOAD', 'LOAD', 'RECOVER', 'PEAK'],
    days: [
      {
        day: '01',
        name: 'COASTAL OPENING',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'MODERATE',
        purpose: 'Introduce the terrain and establish a baseline load.'
      },
      {
        day: '02',
        name: 'MOUNTAIN LOAD',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'HIGH',
        purpose: 'First major climbing stimulus.'
      },
      {
        day: '03',
        name: 'RECOVERY',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'LOW',
        purpose: 'Absorb load and reset before the second block.'
      },
      {
        day: '04',
        name: 'HIGH TERRAIN',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'HIGH',
        purpose: 'Primary performance day on high terrain.'
      },
      {
        day: '05',
        name: 'DURMITOR LOAD',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'HIGH',
        purpose: 'Second major objective in the Dinaric Alps.'
      },
      {
        day: '06',
        name: 'RECOVERY',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'LOW',
        purpose: 'Absorb accumulated load before the final day.'
      },
      {
        day: '07',
        name: 'ADRIATIC EDGE',
        distance: '\u2014',
        elevation: '\u2014',
        load: 'PEAK',
        purpose: 'Final objective and completion of the block.'
      }
    ]
  }
];

/* Which itinerary is shown as the worked example in the PROGRESSION section. */
window.ILLYRIAN.featuredItinerary = 'it-5day';

/* Comparison between the flagship camp and self-guided performance. */
window.ILLYRIAN.comparison = [
  { row: 'Coaching', camp: 'Included', selfGuided: 'Independent' },
  { row: 'Route design', camp: 'Included', selfGuided: 'Included' },
  { row: 'Performance architecture', camp: 'Included', selfGuided: 'Included' },
  { row: 'Group riding', camp: 'Yes', selfGuided: 'Optional / independent' },
  { row: 'Support', camp: 'High-touch', selfGuided: 'Defined support' },
  { row: 'Rider autonomy', camp: 'Lower', selfGuided: 'High' },
  { row: 'Founder involvement', camp: 'High', selfGuided: 'Lower' },
  { row: 'Experience', camp: 'Fully coached', selfGuided: 'Self-directed' }
];
