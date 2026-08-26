# Security notes

## 2026-08-10 dependency audit

`npm audit --omit=dev` reports six moderate findings for `uuid < 11.1.1` in the
current `firebase-admin@14.2.0` dependency tree:

```text
firebase-admin
└─ @google-cloud/storage
   ├─ gaxios 6.7.1 ─ uuid 9.0.1
   └─ teeny-request 9.0.0 ─ uuid 9.0.1
```

The advisory affects UUID v3/v5/v6 calls when a caller supplies a crafted
buffer. The installed Google libraries call UUID v4 without a caller-provided
buffer in the inspected paths. The automated force-fix would downgrade
`firebase-admin` to an old breaking version, so it has not been applied.

This is a tracked upstream dependency risk, not a declaration that the package
is generally safe. Re-run the production audit on every dependency update and
remove this exception as soon as Firebase Admin's storage dependency resolves
the advisory. Do not add direct UUID v3/v5/v6 use while the affected transitive
version remains installed.

Advisory: [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
