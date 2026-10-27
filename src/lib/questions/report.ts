import { mc } from './helpers';

export const REPORT = [
  mc('rep01', 'report', 1, 'Which library is commonly used to generate Excel files from Java, including a streaming mode for large files?',
    ['Apache POI (SXSSFWorkbook streams rows)', 'Jackson', 'Hibernate', 'Mockito'], 0,
    'XSSFWorkbook keeps the entire workbook in memory.'),
  mc('rep02', 'report', 2, 'A web request exports 1M rows to Excel using XSSFWorkbook and the pod gets OOM-killed. What is the best remedy?',
    ['Raise the heap only', 'Stream with SXSSFWorkbook or CSV, and run it as an asynchronous job writing to object storage', 'Use a bigger machine', 'Split into 1M requests'], 1,
    'Also page the DB read (cursor/fetch size) so rows are never all in memory.'),
  mc('rep03', 'report', 2, 'What is the usual JasperReports flow?',
    ['Write a .jrxml design -> compile to .jasper -> fill with parameters + data source -> export to PDF/XLSX/HTML', 'Write HTML only', 'Map entities in hibernate.cfg', 'Use JDBC without a template'], 0,
    'Compile once and cache the compiled report.'),
  mc('rep04', 'report', 2, 'How should a large report be delivered by an API?',
    ['Hold the HTTP request open until done', 'Generate asynchronously, store the file, notify and return a (signed, expiring) download link; stream where possible', 'Return the data as one giant JSON', 'Email it unencrypted'], 1,
    'Return 202 Accepted + status endpoint.'),
  mc('rep05', 'report', 2, 'What keeps report templates maintainable?',
    ['Hard-code layout in Java strings', 'Externalise and version templates (Thymeleaf/FreeMarker/Jasper), separate query from presentation, support i18n and add golden-file tests', 'Build documents by string concatenation', 'Manual QA only'], 1,
    'HTML templates + an HTML-to-PDF renderer are often easier to evolve than binary formats.'),
  mc('rep06', 'report', 3, 'Which technique streams a huge database result to the HTTP response without loading all rows?',
    ['findAll() into a List then write', 'Server-side cursor / fetchSize with Stream or ScrollableResults, written through StreamingResponseBody', 'parallelStream()', 'Cache everything first'], 1,
    'Keep the transaction/connection time in mind.'),
];
