# Сборка Firefox-версии из исходников (для проверки AMO)

Build instructions for Mozilla Add-ons reviewers.

Requirements: Node.js 24, pnpm 11 (`corepack enable` picks the version from `package.json`).

```bash
pnpm install
pnpm --filter @vdp/extension build:firefox
```

The result is in `packages/extension/.output/firefox-mv2` and must match the uploaded package.

- `packages/extension` - the extension (WXT + Vue 3 + TypeScript).
- `packages/shared` - pure TypeScript used by the extension (VLESS link parser, sing-box config and PAC
  generation). It is imported as TypeScript source and bundled by WXT/Vite.
- The native helper (`packages/helper`) is a separate Windows program, not part of the extension package.

The extension talks only to: the user's own native helper (native messaging), `127.0.0.1` (the local
sing-box core it starts), and subscription URLs the user adds. It does not collect or send user data.
