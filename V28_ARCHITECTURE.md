# V28 Architecture

```mermaid
flowchart TD
    U[Odoo Chat] --> A[Chat API]
    A --> S[Enterprise Supervisor]
    S --> X[Specialized Engines]
    X --> K[Hybrid Knowledge Plane]
    X --> O[Safe Odoo Gateway]
    S --> Q[Quality Critic]
    Q --> U
    A --> T[Privacy-safe Telemetry]
    T --> D[Protected Admin Dashboard]
```

The supervisor decomposes the current message, quarantines stale context when necessary, selects specialized engines, and checks task coverage, live-data provenance, agricultural safety, question budget, and natural formatting before the response is returned.

The knowledge plane uses the 400 MB V27 corpus as a resilient local fallback. When configured, external file search supplies a scalable document layer without putting multi-gigabyte content in the Vercel function bundle or Git repository.
