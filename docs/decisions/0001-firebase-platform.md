# ADR 0001: Narrow Firebase to an optional public content source

Date: 2026-08-25  
Status: superseded in part on 2026-09-15

Update: the website now presents only the GitHub Wiki. Firebase is limited to
per-page banner storage and editor authentication. The standalone public
content readers described below have been removed; stored records are retained.

## Decision

Firebase App Hosting remains the deployment target. Firestore and Storage may
be used by the Next.js server to read already-published HYPED content and
images.

Firebase Authentication and the browser SDK are used only for approved editors
changing public page-cover images. Memberships, invitations, private
workspaces and general-purpose content editing remain outside the product.

The GitHub Wiki repository is the source of truth for technical documentation.
The application is its public reader and navigation layer.

## Consequences

- Public visitors do not need an account.
- A Firebase outage leaves the homepage, onboarding guide and Wiki reader
  usable. Team and people pages show honest empty states.
- Non-Wiki content must be changed in Firebase or code. The only in-app edit is
  an authenticated page-cover upload.
- The architecture can be reconsidered only when real committee workflow
  proves that another editing system is necessary.
