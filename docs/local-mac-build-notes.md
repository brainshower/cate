# Local macOS Build Notes

These notes capture local setup details learned while building the forked Cate checkout on macOS. They are intended for development and test packaging, not public release signing.

## Repository Setup

This checkout is expected to use:

- `origin`: your fork, where local development branches are pushed.
- `upstream`: `https://github.com/0-AI-UG/cate.git`, used for pulling updates from the original project.

Local remote setup after cloning the fork:

```text
origin    https://github.com/brainshower/cate.git
upstream  https://github.com/0-AI-UG/cate.git
```

The local `upstream` push URL is set to `DISABLED` as a safety rail, so accidental pushes to the original repository fail locally.

Typical upstream sync:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Node Version

Cate declares:

```json
"engines": {
  "node": ">=20 <23"
}
```

The repo `.nvmrc` is `20`. Use Node 20 or 22 for the least surprising install and native-module behavior. Newer Node versions can install and build in this environment, but they print an `EBADENGINE` warning and are outside the supported range.

Observed local versions during this setup:

```text
node v26.0.0
npm 11.12.1
```

## Fresh Checkout Verification

From the repo root:

```bash
npm ci
npm run typecheck
GIT_TEST_DEFAULT_INITIAL_BRANCH_NAME=master npm test
npm run build
```

The `GIT_TEST_DEFAULT_INITIAL_BRANCH_NAME=master` prefix is currently needed because `src/main/ipc/git.test.ts` assumes temporary Git repos start on `master`. Without it, local Git installations that default to `main` fail those tests with:

```text
fatal: a branch named 'main' already exists
```

## Development Run

```bash
npm run dev
```

This starts Cate through `electron-vite` with hot reload.

## macOS Packaging

The normal packaging command is:

```bash
npm run package:mac
```

In this local Command Line Tools setup, native rebuild of `node-pty` failed until the C++ standard-library include path was provided explicitly. The working command was:

```bash
SDKROOT="$(xcrun --sdk macosx --show-sdk-path)" \
CPLUS_INCLUDE_PATH="$(xcrun --sdk macosx --show-sdk-path)/usr/include/c++/v1" \
npm run package:mac
```

The initial failure looked like:

```text
../node_modules/node-addon-api/napi.h:14:10: fatal error: 'functional' file not found
```

The header exists under the active macOS SDK, but `clang++` was not finding that SDK C++ include directory by default. If this reappears after Xcode or Command Line Tools updates, check:

```bash
xcode-select -p
xcrun --show-sdk-path
find /Library/Developer/CommandLineTools -path '*c++*' -name functional
```

## Generated Artifacts

Successful `package:mac` output lands in `release/`. A local test run generated:

```text
release/Cate-1.1.0.dmg
release/Cate-1.1.0.dmg.blockmap
release/Cate-1.1.0-mac.zip
release/Cate-1.1.0-mac.zip.blockmap
release/Cate-1.1.0-arm64.dmg
release/Cate-1.1.0-arm64.dmg.blockmap
release/Cate-1.1.0-arm64-mac.zip
release/Cate-1.1.0-arm64-mac.zip.blockmap
release/latest-mac.yml
release/mac/Cate.app
release/mac-arm64/Cate.app
```

`release/` and `dist/` are ignored by Git, so generated build artifacts should not be committed.

## Signing and Notarization

The local build can produce usable test artifacts without a trusted Apple Developer ID certificate, but it is not suitable for public distribution as-is.

Observed local behavior:

- x64 build: macOS application code signing was skipped because no valid Developer ID identity was available.
- arm64 build: `electron-builder` fell back to an ad-hoc signature.
- notarization was skipped because notarization options were not configured.

Observed verification:

```bash
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Cate.app
```

The arm64 app verified successfully. The x64 app did not verify because it was not signed:

```text
release/mac/Cate.app: code object is not signed at all
In architecture: x86_64
```

### Local ad-hoc signing pitfall

On macOS 26.3.1, the arm64 `1.1.0` app initially quit immediately when opened from Finder. Launching the executable directly showed a dyld error before Cate code started:

```text
Library not loaded: @rpath/Electron Framework.framework/Electron Framework
Reason: ... Electron Framework ... not valid for use in process: mapping process and mapped file (non-platform) have different Team IDs
```

The app executable had been ad-hoc signed with hardened runtime still enabled:

```text
flags=0x10002(adhoc,runtime)
```

For local-only test builds without a Developer ID certificate, re-sign the unpacked app without hardened runtime:

```bash
codesign --force --deep --sign - release/mac-arm64/Cate.app
codesign --verify --deep --strict release/mac-arm64/Cate.app
codesign -dv --verbose=4 release/mac-arm64/Cate.app/Contents/MacOS/Cate 2>&1 | rg 'flags|Signature|TeamIdentifier|Runtime'
```

The expected local signature shape is:

```text
flags=0x2(adhoc)
Signature=adhoc
TeamIdentifier=not set
```

If distributing a local ZIP or DMG after this fix, create it from the re-signed app bundle rather than using the original `electron-builder` archive:

```bash
ditto -c -k --sequesterRsrc --keepParent release/mac-arm64/Cate.app release/Cate-1.1.0-arm64-local.zip
hdiutil create -volname Cate -srcfolder release/mac-arm64/Cate.app -ov -format UDZO release/Cate-1.1.0-arm64-local.dmg
```

When launching the app executable from an agent or shell environment, make sure `ELECTRON_RUN_AS_NODE` is not set, otherwise Electron starts as a Node REPL instead of launching Cate:

```bash
env -u ELECTRON_RUN_AS_NODE ./release/mac-arm64/Cate.app/Contents/MacOS/Cate
```

For local testing, unsigned or ad-hoc signed builds may need Gatekeeper quarantine removed:

```bash
xattr -cr release/mac-arm64/Cate.app
```

For public distribution, configure a valid Developer ID Application certificate and Apple notarization credentials before publishing.
