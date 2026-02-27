# Tool Runtime Audit

| Tool | Lifecycle compliance | Root safety | Contract safety | Idempotency score | Findings |
|---|---|---|---|---:|---|
| `json-formatter` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `json-validator` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `json-to-xml` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `xml-to-json` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `xml-formatter` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `csv-to-json` | FULL | PASS | PASS | 100 | no high-risk lifecycle anti-patterns detected |
| `json-to-csv` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `csv-viewer` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `base64-encode` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `base64-decode` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `url-encode` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `url-decode` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `html-formatter` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `markdown-to-html` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `html-to-markdown` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `css-minifier` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `js-minifier` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `sql-formatter` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `regex-tester` | FULL | PASS | PASS | 100 | no high-risk lifecycle anti-patterns detected |
| `text-diff` | FULL | PASS | PASS | 100 | no high-risk lifecycle anti-patterns detected |
| `uuid-generator` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `case-converter` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `html-entities` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `yaml-to-json` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `json-to-yaml` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `json-toolkit-pro` | FULL | PARTIAL | PASS | 75 | global querySelector usage |
| `text-intelligence-analyzer` | FULL | PARTIAL | PASS | 75 | global querySelector usage |

## Notes
- Scope audited: `src/ToolNexus.Web/wwwroot/js/tools/*.js`.
- This report focuses on top-level tool runtime entry files for lifecycle/root-contract safety baseline.