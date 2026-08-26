# ADR 0001: Narrow Firebase to an optional public content source

Date: 2026-08-25  
Status: accepted

## Decision

Firebase App Hosting remains the deployment target. Firestore and Storage may
be used by the Next.js server to read already-published HYPED content and
images.

Firebase Authentication, browser SDK access, memberships, invitations,
private workspaces, Firestore mutations and Storage uploads are outside the
current product.

The GitHub Wiki repository is the source of truth for technical documentation.
The application is its public reader and navigation layer.

## Consequences

- The public site has no account or permission system to operate.
- A Firebase outage does not remove the core public pages because they have
  built-in fallback content.
- Non-Wiki content must currently be changed in Firebase or code, not through
  an in-app editor.
- The architecture can be reconsidered only when real committee workflow
  proves that another editing system is necessary.

