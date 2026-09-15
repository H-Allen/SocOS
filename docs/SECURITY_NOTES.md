# Security notes

## 2026-09-15 dependency check

Adding `isomorphic-git@1.42.2` for read-only Wiki directory discovery did not
introduce an advisory for that package in `npm audit --omit=dev`. The audit
reported eight production dependency findings: six moderate in the existing
Firebase dependency chain, one high for `sharp <0.35.4`, and one critical
package finding for the installed Next.js 16.3.0.

The Next.js finding includes [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36)
and [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4),
with affected versions below 16.3.3. The sharp finding is
[GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
These existing framework/image dependencies were not upgraded as part of the
navigation feature. They need a separate tested security update before deployment.

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
