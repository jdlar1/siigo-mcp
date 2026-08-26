# Contributing

Thanks for helping improve `@jdlar/siigo-mcp`.

## Local Setup

```bash
pnpm install
pnpm build
pnpm test
```

This project is ESM-first and uses TypeScript with explicit `.js` extensions in local source imports.

## Project Structure

- `src/cli.ts` validates runtime configuration and starts the selected MCP transport.
- `src/index.ts` is the side-effect-free public library entrypoint.
- `src/mcp-server.ts` creates the MCP server and registers each resource group.
- `src/tools/*.ts` contains MCP tool registration by Siigo API resource.
- `src/schemas/*.ts` contains strict Zod request contracts and concrete response schemas.
- `src/contracts.ts` exposes request and query types inferred from the Zod schemas.
- `src/siigo-client.ts` owns HTTP calls, authentication, pagination helpers, and API error translation.
- `src/types.ts` contains shared configuration and response contracts.
- `test/*.test.js` tests the compiled output from `dist/`.

## Adding Or Updating Tools

- Keep public MCP tool names stable unless a breaking change is intentional.
- Add endpoint HTTP logic to `SiigoClient`; keep MCP handlers thin.
- Put new tool registrations in the matching `src/tools/<resource>.ts` file.
- Use lowercase snake_case tool names prefixed with `siigo_`.
- Set `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` accurately.
- Define endpoint-specific strict input schemas, including documented conditional and cross-field validation. Do not hide known fields behind permissive records.
- Define a concrete output schema whenever a tool is added or changed.
- Reconcile conflicting Siigo sources using [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md); old code and inferred endpoint symmetry are not contract evidence.
- Update `README.md` and `CHANGELOG.md` when supported tools or behavior changes.

## Verification

Run these before opening a PR:

```bash
pnpm lint
pnpm test
```

`pnpm test` runs `pnpm build` first because tests import from `dist/`.
