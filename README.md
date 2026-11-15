# CoConnect

Labour marketplace for Sri Lanka — coconut plantation and construction work first.
Read `CLAUDE.md` and `docs/00-decisions.md` before changing anything.

## Setup
```bash
nvm use            # Node 22 (see .nvmrc)
npm install
cp .env.example .env.local   # fill in values
npm run db:push && npm run db:seed
npm run dev
```
Make yourself an admin after signing up: `npm run db:make-admin -- you@example.com`.

## Checks
`npm run typecheck && npm run lint && npm run i18n:check && npm run db:test`

End-to-end (against a production build): `npm run build && npx next start`, then `npm run test:e2e`.

## Launch
Step-by-step deploy and pre-launch checklist: `docs/06-launch.md`.
