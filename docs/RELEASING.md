# Publishing a release to npm

The public package is `@jdlar/siigo-mcp`. GitHub Actions publishes stable releases
when a `v*` tag is pushed. npm authenticates the workflow with OpenID Connect (OIDC)
and attaches provenance; no npm token secret is needed.

## Workflows

- [CI](../.github/workflows/ci.yml) runs frozen-lockfile installation, lint, tests
  (including the build), and a package preview on pull requests and `master` pushes.
- [Publish to npm](../.github/workflows/publish.yml) runs the same checks on a fresh
  GitHub-hosted runner, verifies the tag against the package and server versions,
  and inspects the package's exported files before publishing that exact tarball.
  Release jobs are serialized and are not cancelled by a later run.
- A manual run of `publish.yml` performs a dry run only. It never publishes, even
  when a tag is selected. Dry runs do not verify npm's OIDC authorization.

Node comes from `.nvmrc`, pnpm from `package.json`, and the publishing workflow
installs an npm CLI version with trusted-publishing support. Actions are pinned to
commit hashes. All accounting tests use mocked upstream calls.

## One-time npm trusted publisher setup

Authorize the following publisher in the package's
[npm settings](https://www.npmjs.com/package/@jdlar/siigo-mcp/access):

| Setting | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization or user | `jdlar1` |
| Repository | `siigo-mcp` |
| Workflow filename | `publish.yml` |
| Environment | Leave empty; the job does not specify an environment |
| Allowed action | Direct publishing with `npm publish` |

With npm 11.15.0 or newer and an authenticated package maintainer account, the
same relationship can be configured from the CLI (npm may require browser 2FA):

```bash
npm trust github @jdlar/siigo-mcp --repo jdlar1/siigo-mcp --file publish.yml --allow-publish
npm trust list @jdlar/siigo-mcp
```

See npm's [trusted publishing guide](https://docs.npmjs.com/trusted-publishers/)
and [npm trust reference](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

## Release process

1. Update `package.json`, `src/version.ts`, the changelog, and the README's release
   summary. Keep the package and server versions identical.
2. Commit and push the changes to `master`. Wait for CI to pass.
3. Create an annotated tag for the package version and push it:

   ```bash
   release_version=$(node -p "require('./package.json').version")
   git tag -a "v$release_version" -m "Release v$release_version"
   git push origin "v$release_version"
   ```

4. Follow the **Publish to npm** run in GitHub Actions. After npm finishes
   processing the package, verify the version and `latest` tag:

   ```bash
   npm view "@jdlar/siigo-mcp@$release_version" version dist-tags --json
   ```

The workflow supports stable `major.minor.patch` versions only. An invalid or
mismatched tag fails before publication. npm versions are immutable: do not move
an existing release tag or retry a successfully published version. A rerun can
retry a failed publication only after confirming that npm did not accept it.
Existing tags, including `v5.0.1`, are not republished when the workflow is added.

To exercise the release pipeline without publishing, select **Run workflow** on
**Publish to npm**, or use:

```bash
gh workflow run publish.yml --ref master
```

## Manual fallback

From a clean checkout of the release tag, use Node 24 and the pinned pnpm version:

```bash
npm login
pnpm install --frozen-lockfile
pnpm lint
pnpm test
npm pack --dry-run --ignore-scripts
pnpm publish --access public
```

The manual publication lifecycle repeats lint and tests and rebuilds the package.
It requires npm authentication and any account-required 2FA. Coordinate with the
Actions run so only one publication attempt is active.
