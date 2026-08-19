# MIG FARM V28 Enterprise Knowledge Plane

V28 keeps the validated 400 MB V27 corpus as a local, GitHub-safe fallback. Large or continuously changing documents are synchronized to an external vector store with `npm run enterprise:sync` and fused at retrieval time.

- Local fallback never needs external credentials.
- External retrieval is enabled only with `MIG_ENTERPRISE_RETRIEVAL_ENABLED=true`.
- Live prices and stock still require live catalog evidence.
- Pesticide dosage still requires a verified product label.
- `enterprise_manifest.json` is rebuilt with `npm run enterprise:manifest`.
