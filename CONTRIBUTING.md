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

- `src/index.ts` starts the MCP server and registers tool groups.
- `src/tools/*.ts` contains MCP tool registration by Siigo API resource.
- `src/siigo-client.ts` owns HTTP calls, authentication, pagination helpers, and API error translation.
- `src/types.ts` contains shared Siigo request and response contracts.
- `test/*.test.js` tests the compiled output from `dist/`.

## Adding Or Updating Tools

- Keep public MCP tool names stable unless a breaking change is intentional.
- Add endpoint HTTP logic to `SiigoClient`; keep MCP handlers thin.
- Put new tool registrations in the matching `src/tools/<resource>.ts` file.
- Use lowercase snake_case tool names prefixed with `siigo_`.
- Set `readOnlyHint` and `destructiveHint` accurately.
- Prefer flexible `z.record(z.string(), z.unknown())` payload schemas for large Siigo documents when the upstream API shape changes often.
- Update `README.md` and `CHANGELOG.md` when supported tools or behavior changes.

## Verification

Run these before opening a PR:

```bash
pnpm lint
pnpm test
```

`pnpm test` runs `pnpm build` first because tests import from `dist/`.
