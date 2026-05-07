/**
 * Static slices copied from a live GAF → Coveo `POST /rest/search/v2` body (2026-05 capture).
 * If the site changes Headless/facets, re-copy from DevTools and update this file.
 */

/** `fieldsToInclude` array from the browser request (order preserved). */
export const GAF_COVEO_FIELDS_TO_INCLUDE_CAPTURED = [
  "author",
  "language",
  "urihash",
  "objecttype",
  "collection",
  "source",
  "permanentid",
  "gaf_featured_image_src",
  "gaf_featured_image_alt",
  "gaf_contractor_id",
  "gaf_contractor_type",
  "gaf_contractor_dba",
  "gaf_navigation_title",
  "gaf_rating",
  "gaf_number_of_reviews",
  "gaf_f_city",
  "gaf_f_state_code",
  "gaf_f_contractor_designations_residential",
  "gaf_f_contractor_designations_commercial",
  "gaf_f_contractor_certifications_and_awards_residential",
  "gaf_f_contractor_certifications_and_awards_commercial",
  "gaf_f_contractor_raq_specialties_residential",
  "gaf_f_contractor_raq_specialties_commercial",
  "gaf_phone",
  "uri",
  "gaf_f_contractor_technologies_residential",
  "gaf_f_contractor_technologies_commercial",
  "gaf_latitude",
  "gaf_longitude",
  "distance",
  "distanceinmiles",
  "gaf_postal_code",
  "gaf_f_country_code",
  "gaf_enrolled_in_gaf_leads",
  "UniqueId",
  "Uri",
] as const satisfies readonly string[];

/** Facet definitions from the same request. */
export const GAF_COVEO_FACETS_CAPTURED = [
  {
    filterFacetCount: true,
    injectionDepth: 1000,
    numberOfValues: 999,
    sortCriteria: "automatic",
    type: "specific",
    currentValues: [],
    freezeCurrentValues: false,
    isFieldExpanded: false,
    preventAutoSelect: false,
    field: "gaf_f_contractor_specialties_residential",
    resultsMustMatch: "allValues",
    facetId: "gaf_f_contractor_specialties_residential",
  },
  {
    filterFacetCount: true,
    injectionDepth: 1000,
    numberOfValues: 999,
    sortCriteria: "automatic",
    type: "specific",
    currentValues: [],
    freezeCurrentValues: false,
    isFieldExpanded: false,
    preventAutoSelect: false,
    field: "gaf_f_contractor_specialties_residential",
    facetId: "gaf_f_contractor_specialties_residential_1",
  },
  {
    filterFacetCount: true,
    injectionDepth: 1000,
    numberOfValues: 999,
    sortCriteria: "automatic",
    type: "specific",
    currentValues: [],
    freezeCurrentValues: false,
    isFieldExpanded: false,
    preventAutoSelect: false,
    field: "gaf_f_contractor_specialties_residential",
    facetId: "gaf_f_contractor_specialties_residential_2",
  },
  {
    filterFacetCount: true,
    injectionDepth: 1000,
    numberOfValues: 4,
    sortCriteria: "descending",
    rangeAlgorithm: "even",
    currentValues: [
      { endInclusive: true, state: "idle", start: 1, end: 5 },
      { endInclusive: true, state: "idle", start: 2, end: 5 },
      { endInclusive: true, state: "idle", start: 3, end: 5 },
      { endInclusive: true, state: "idle", start: 4, end: 5 },
    ],
    preventAutoSelect: false,
    type: "numericalRange",
    field: "gaf_rating",
    generateAutomaticRanges: false,
    facetId: "gaf_rating",
  },
  {
    filterFacetCount: true,
    injectionDepth: 1000,
    numberOfValues: 0,
    sortCriteria: "ascending",
    rangeAlgorithm: "even",
    currentValues: [],
    preventAutoSelect: false,
    type: "dateRange",
    field: "date",
    generateAutomaticRanges: false,
    facetId: "date",
  },
] as const;

/** Coveo meters→miles scale from the live `queryFunctions` capture. */
const GAF_COVEO_DIST_METERS_TO_MILES = 0.000621371;

/**
 * Builds `queryFunctions` that populate `@distanceinmiles` from a search origin (ZIP geocode).
 * Matches live pattern: `dist(@gaf_latitude, @gaf_longitude, lat, lng) * 0.000621371`.
 */
export function buildGafCoveoQueryFunctionsForOrigin(latitude: number, longitude: number): unknown[] {
  return [
    {
      fieldName: "@distanceinmiles",
      function: `dist(@gaf_latitude, @gaf_longitude, ${latitude}, ${longitude})*${GAF_COVEO_DIST_METERS_TO_MILES}`,
    },
  ];
}

/** `analytics.customData` from the captured request (static marketing/version hints). */
export const GAF_COVEO_ANALYTICS_CUSTOM_DATA_CAPTURED = {
  context_sortingStrategy: "gafrecommended-initial",
  coveoHeadlessVersion: "2.19.0",
  interfaceChangeTo: "default",
} as const;
