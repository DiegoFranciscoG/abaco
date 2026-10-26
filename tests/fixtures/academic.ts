/**
 * Fictitious API answers that follow the real response shapes observed on 2026-10-14 (docs/apis.md).
 * Names and titles are invented: no real personal data in the repository.
 */
export const crossrefFixture = {
  status: 'ok',
  message: {
    'total-results': 2,
    items: [
      {
        DOI: '10.1234/ABACO.2024.001',
        title: ['Costos <i>indirectos</i> de fabricación en pymes'],
        author: [
          { given: 'Ana María', family: 'Quito Pérez' },
          { given: 'Luis', family: 'Andrade' },
        ],
        issued: { 'date-parts': [[2024, 3, 1]] },
        'container-title': ['Revista de Contabilidad Aplicada'],
        volume: '12',
        issue: '2',
        page: '45-60',
        type: 'journal-article',
        URL: 'https://doi.org/10.1234/abaco.2024.001',
        abstract: '<jats:p>Estudio de &amp; costos.</jats:p>',
      },
      { DOI: 'sin-doi-valido', title: ['Se descarta'] },
    ],
  },
};

export const openAlexFixture = {
  meta: { count: 3 },
  results: [
    {
      id: 'https://openalex.org/W1',
      doi: 'https://doi.org/10.1234/abaco.2024.001',
      title: 'Costos indirectos de fabricación en pymes',
      publication_year: 2024,
      language: 'es',
      type: 'article',
      authorships: [{ author: { display_name: 'Ana María Quito Pérez' } }],
      primary_location: { landing_page_url: 'https://example.org/a', source: { display_name: 'Revista de Contabilidad Aplicada' } },
      open_access: { is_oa: true },
      abstract_inverted_index: { costos: [1], Estudio: [0], de: [2], pymes: [3] },
      biblio: { volume: '12', issue: '2', first_page: '45', last_page: '60' },
    },
    {
      id: 'https://openalex.org/W2',
      doi: null,
      title: 'Valor actual neto en proyectos rurales',
      publication_year: 2021,
      language: 'es',
      authorships: [],
      primary_location: { landing_page_url: 'javascript:alert(1)', source: null },
      open_access: { is_oa: false },
      abstract_inverted_index: null,
    },
    { id: 'https://openalex.org/W3', title: null },
  ],
};

export const doajFixture = {
  total: 1,
  results: [
    {
      id: 'abc123',
      bibjson: {
        title: 'Indicadores de liquidez en cooperativas',
        year: '2019',
        abstract: 'Resumen breve.',
        author: [{ name: 'Carla Torres Mena' }],
        identifier: [{ id: '1794-0000', type: 'pissn' }],
        journal: { title: 'Revista de Finanzas', volume: '3', number: '1', language: ['ES'] },
        link: [{ url: 'https://revista.example.org/articulo/1', type: 'fulltext' }],
        start_page: '10',
        end_page: '22',
      },
    },
  ],
};

export const laReferenciaFixture = {
  resultCount: 1,
  status: 'OK',
  records: [
    {
      id: 'EC_00001',
      title: 'Aplicación de la NIIF para las PYMES en comercios de Cuenca',
      primaryAuthors: ['Ríos Vega, Daniela'],
      publicationDates: ['2022'],
      urls: [{ url: 'https://repositorio.example.edu.ec/handle/123/456' }],
      formats: ['bachelorThesis'],
      summary: ['Tesis de grado.'],
      languages: ['spa'],
    },
  ],
};

/** Open Library search answer: one valid book, one with an unexpected key and one without title. */
export const openLibraryFixture = {
  numFound: 3,
  docs: [
    {
      key: '/works/OL123W',
      title: 'Contabilidad de costos para pymes',
      author_name: ['Ana María Quito Pérez'],
      first_publish_year: 2019,
      publisher: ['Editorial Ejemplo'],
      language: ['spa'],
    },
    { key: 'javascript:alert(1)', title: 'Clave no válida' },
    { key: '/works/OL999W' },
  ],
};
