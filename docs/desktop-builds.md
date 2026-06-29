# Water9 Desktop Builds

Water9 uses Tauri v2 to package the existing Vite production build as an offline desktop app. Tauri runs `npm run build` first, then bundles `dist` through `src-tauri/tauri.conf.json` using local app assets instead of a remote URL.

## Local Linux Build

Install the Linux system packages required by Tauri on Ubuntu:

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Then build the AppImage:

```sh
npm ci
npm run desktop:linux
```

The desktop wrapper defaults heavyweight local Rust output to:

```text
/mnt/nxt-dev/water9/.desktop-build
```

Specifically, `tools/desktop_tauri.mjs` sets `CARGO_HOME` to `.desktop-build/cargo-home` and `CARGO_TARGET_DIR` to `.desktop-build/target` unless those environment variables are already set. Override `WATER9_DESKTOP_BUILD_DIR`, `CARGO_HOME`, or `CARGO_TARGET_DIR` when building somewhere other than Alex's `/mnt/nxt-dev` checkout.

## Checks

Use the non-bundling Tauri build check when validating config without producing installers:

```sh
npm run desktop:check
```

If this fails with a missing `libsoup-3.0.pc`, install `libsoup-3.0-dev`; that package is required by the Tauri v2 WebKit stack on Ubuntu.

Use `npm run desktop:build -- --bundles <target>` for explicit native bundles. Useful targets are:

- Linux: `appimage`
- Windows: `nsis`
- macOS: `dmg`

## CI Artifacts

`.github/workflows/desktop-builds.yml` builds native artifacts on GitHub-hosted runners:

- Ubuntu: AppImage
- Windows: NSIS `.exe`
- macOS: `.dmg`

The workflow uploads artifacts for each matrix entry. It does not publish releases or push tags.
