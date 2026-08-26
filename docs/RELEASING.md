# Publishing a release to npm

The package is public and scoped as `@jdlar/siigo-mcp`. Publishing requires an npm account with permission to the `@jdlar` scope and any required two-factor authentication.

## Local publication

From a clean checkout of the release tag:

```bash
npm login
npm whoami
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm pack --dry-run
pnpm publish --access public
```

The `prepublishOnly` lifecycle repeats lint and tests, and `prepack` rebuilds `dist`, so npm will refuse a release that fails the local gate.

Verify the registry after publication:

```bash
npm view @jdlar/siigo-mcp@4.0.0 version dist-tags --json
npx --yes @jdlar/siigo-mcp@4.0.0
```

The second command requires the three Siigo environment variables when it starts normally. It is enough to confirm that npm resolves and launches the executable; stop it after the startup check.

## Git publication

Push the release commit and its annotated tag:

```bash
git push origin master
git push origin v4.0.0
```

If npm provenance is required, publish through a trusted CI workflow with npm OIDC and `npm publish --access public --provenance`; do not put a long-lived npm token in the repository.
