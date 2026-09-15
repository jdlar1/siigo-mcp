# Working agreements

- Make the smallest change that fully addresses the task. Reuse existing patterns
  before introducing abstractions or tooling.
- Preserve public contracts unless the requested task authorizes a breaking change.
  Document intentional migrations and their compatibility path.
- Design MCP tools around user tasks. An API endpoint does not automatically need
  a public tool; preserve API coverage through the client and discoverable operations.
- Keep reads, writes, and destructive actions distinguishable. Never resolve an
  ambiguous accounting reference by silently choosing a match.
- Preserve upstream error context, cancellation, and idempotency when composing
  operations. Do not silently swallow failures or retry non-idempotent writes.
- Verify observable behavior with mocked upstream calls. Do not use live accounting
  data or create real documents to run tests.
- Read the current package scripts, configuration, and implementation before making
  assumptions about commands, versions, file locations, or architecture.
- Run checks appropriate to the change and report any unverified behavior.
- Keep this file limited to working agreements. Versions, commands, formatting,
  file inventories, and implementation details belong in their existing sources
  of truth, not in a second copy here.
