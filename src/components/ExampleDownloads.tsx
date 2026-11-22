import { EXAMPLES } from '../lib/examples';
import { downloadFile, safeFileName, toJsonText, toXlsxBytes, XLSX_MIME } from '../lib/exportSop';

/** First-page list of example files, each downloadable as Excel or JSON. Downloading doesn't import. */
export function ExampleDownloads() {
  return (
    <section className="examples" aria-label="Example files">
      <p>Not sure how to set up a file? Download an example:</p>
      <ul>
        {EXAMPLES.map(({ label, sop }) => {
          const name = safeFileName(sop.title);
          return (
            <li key={label}>
              <span>{label}</span>
              <span className="example-buttons">
                <button
                  className="btn"
                  aria-label={`Download ${sop.title} as Excel`}
                  onClick={() => downloadFile(toXlsxBytes(sop), `${name}.xlsx`, XLSX_MIME)}
                >
                  Excel
                </button>
                <button
                  className="btn"
                  aria-label={`Download ${sop.title} as JSON`}
                  onClick={() => downloadFile(toJsonText(sop), `${name}.json`, 'application/json')}
                >
                  JSON
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
