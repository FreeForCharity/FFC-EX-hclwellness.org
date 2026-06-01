/**
 * Charity-supplied PDF documents, grouped by topic.
 *
 * These are the documents Healthy Community Lifespaces provides for the public
 * to read and download (originally tracked in issue #59). Every file is already
 * mirrored locally under `public/wp-content/uploads/...` by the WordPress
 * migration (see `migration/`), so the paths below point at committed assets —
 * there is no external dependency.
 *
 * Each document has its own content page at `/documents/<slug>/` that renders
 * the document's text and images as real, reflowing HTML — readable on any
 * device (no PDF plugin) and indexable — plus a download link to the original
 * PDF. The page content is extracted by `scripts/extract-pdf-content.mjs` into
 * `src/data/document-content/<slug>.json`. Each document also links back to the
 * WordPress page it was originally published on (`sourceRoute`).
 */
export type PdfDoc = {
  /** URL slug — the document's content page lives at /documents/<slug>/. */
  slug: string
  /** Human-readable document title. */
  title: string
  /** Root-relative path to the mirrored PDF under /wp-content/uploads/... */
  file: string
  /** One-line description of what the document is. */
  description?: string
  /** Route of the page where this document is published in context. */
  sourceRoute?: string
  /** Label for the "view in context" link. */
  sourceLabel?: string
}

export type DocumentGroup = {
  title: string
  description?: string
  docs: PdfDoc[]
}

export const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    title: 'Healthy Schools & Community',
    description:
      'Student and community voices on healthy habits, healthy classrooms, and getting back to school well.',
    docs: [
      {
        slug: 'my-healthy-teacher',
        title: 'My Healthy Teacher',
        file: '/wp-content/uploads/2026/03/My-Healthy-Teacher-2023.pdf',
        description: 'Recognizing teachers who model healthy habits in the classroom.',
        sourceRoute: '/post-healthy-ideas',
        sourceLabel: 'Post Healthy Ideas',
      },
      {
        slug: 'emmas-letter',
        title: "Emma's Letter",
        file: '/wp-content/uploads/2026/03/emmas-letter.pdf',
        description: 'A student letter advocating for health and safety.',
        sourceRoute: '/post-healthy-ideas',
        sourceLabel: 'Post Healthy Ideas',
      },
      {
        slug: 'back-to-school-saying',
        title: 'Back to School Saying',
        file: '/wp-content/uploads/2024/09/back-to-school-saying.pdf',
        description: 'A back-to-school message for students and families.',
        sourceRoute: '/post-healthy-ideas',
        sourceLabel: 'Post Healthy Ideas',
      },
    ],
  },
  {
    title: 'Student Contests',
    description: 'Materials for the student contests that engage young people in health promotion.',
    docs: [
      {
        slug: 'vegetable-contest-2026-27',
        title: 'Vegetable Contest 2026–27',
        file: '/wp-content/uploads/2026/03/vegetable-contest-2026-27.pdf',
        description: 'Details and entry information for the 2026–27 state vegetable contest.',
        sourceRoute: '/contest',
        sourceLabel: 'Contest',
      },
    ],
  },
  {
    title: 'Organizational Planning',
    description: 'Annual summary of accomplishments and the plan for the year ahead.',
    docs: [
      {
        slug: 'summary-2024-25-plan-2025-2026',
        title: 'Summary 2024–25 & Plan 2025–2026',
        file: '/wp-content/uploads/2025/06/summary-2024-25-Plan-2025-2026-2.pdf',
        description: 'Year-in-review summary paired with the strategic plan for 2025–2026.',
        sourceRoute: '/summary-24-25-plan-2025-26',
        sourceLabel: 'Summary 24-25 Plan 2025-26',
      },
    ],
  },
  {
    title: 'Micromobility & Road Safety',
    description:
      'Resources on safe routes to school, e-bikes and e-scooters, helmet fit, and model school-district policy.',
    docs: [
      {
        slug: 'low-speed-vehicle-fact-sheet',
        title: 'Low-Speed Vehicle Fact Sheet (2021)',
        file: '/wp-content/uploads/2026/04/low_speed_fact_sheet_2021_final.pdf',
        description: 'Fact sheet on low-speed vehicles and pedestrian safety.',
        sourceRoute: '/micromobility-information-and-resources',
        sourceLabel: 'Micromobility Information and Resources',
      },
      {
        slug: 'draft-model-k12-micromobility-policy',
        title: 'Draft Model K-12 Micromobility Policy',
        file: '/wp-content/uploads/2026/05/MIcromobility-School-district-draft-policy.pdf',
        description:
          'Draft school-district micromobility policy modeled on the Villanova University policy.',
        sourceRoute: '/micromobility-information-and-resources',
        sourceLabel: 'Micromobility Information and Resources',
      },
      {
        slug: 'safe-kids-helmet-fit-test',
        title: 'Safe Kids — Helmet Fit Test (English / Spanish)',
        file: '/wp-content/uploads/2026/04/Safe-Kids-Helmet-Fit-Test-English_Spanish-2024-2.pdf',
        description: 'Bilingual helmet fit-test guide for parents and students (Safe Kids, 2024).',
        sourceRoute: '/micromobility-information-and-resources',
        sourceLabel: 'Micromobility Information and Resources',
      },
      {
        slug: 'ride-smart-stay-safe',
        title: 'Ride Smart, Stay Safe — Your Choices Matter',
        file: '/wp-content/uploads/2026/04/Ride-Smart-Stay-Safe-Your-Choices-Matter.pdf',
        description: 'Educational flyer on safe riding choices for students.',
        sourceRoute: '/micromobility-information-and-resources',
        sourceLabel: 'Micromobility Information and Resources',
      },
      {
        slug: 'powered-personal-transportation-devices',
        title: 'Powered Personal Transportation Devices (June 2024)',
        file: '/wp-content/uploads/2026/04/Powered-Personal-Transportation-Devices-as-of-June-2024-2.pdf',
        description:
          'Overview of powered personal transportation devices, current as of June 2024.',
        sourceRoute: '/micromobility-information-and-resources',
        sourceLabel: 'Micromobility Information and Resources',
      },
    ],
  },
]

/** Flat list of every document across all groups. */
export const ALL_DOCUMENTS: PdfDoc[] = DOCUMENT_GROUPS.flatMap((g) => g.docs)

/** Look up a single document by its slug. */
export function getDocBySlug(slug: string): PdfDoc | undefined {
  return ALL_DOCUMENTS.find((d) => d.slug === slug)
}
