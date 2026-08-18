# V22.1 Visual Context Contract

- Up to 4 images per turn.
- UI accepts JPEG/PNG/WebP, converts locally to JPEG and adaptively compresses each image to keep the request bounded while preserving label readability.
- Active image pixels are kept in browser memory only for a bounded follow-up window; they are not persisted to localStorage.
- Backend stores only compact active visual context (mode, candidate identities, confidence, turn TTL); no image bytes are persisted in conversation_state.
- A visual follow-up has priority over generic casual routing.
- Product identity requires readable catalog text/SKU/barcode or strong catalog-text evidence.
- Price and stock require live Odoo verification.
- Pesticide dosage from an image requires clear high-confidence verbatim label evidence or separately verified product data.
- Generated catalog completion descriptions are not technical-spec evidence.
