import "server-only";

import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";

type RepositoryPaths = { paths: string[]; available: boolean };
type RepositoryCache = {
  directory?: string;
  paths: string[];
  available: boolean;
  expiresAt: number;
  pending?: Promise<RepositoryPaths>;
};
const repositories = new Map<string, RepositoryCache>();

// GitHub's rendered page list loses directory names. Read the Git tree without
// checking out files, running hooks, or touching the user's working Wiki clone.
export async function getWikiRepositoryPaths(repository: string): Promise<RepositoryPaths> {
  if (!/^Hyp-ed\/hyped-[a-z0-9-]+$/i.test(repository)) throw new Error("Invalid Wiki repository");
  let state = repositories.get(repository);
  if (!state) {
    state = { paths: [], available: false, expiresAt: 0 };
    repositories.set(repository, state);
  }
  if (state.pending) return state.pending;
  if (Date.now() < state.expiresAt) return { paths: state.paths, available: state.available };
  const current = state;
  current.pending = refreshRepository(repository, current).finally(() => { current.pending = undefined; });
  return current.pending;
}

async function refreshRepository(repository: string, state: RepositoryCache): Promise<RepositoryPaths> {
  const signal = AbortSignal.timeout(10_000);
  const transport = { request: (request: Parameters<typeof http.request>[0]) => http.request({ ...request, signal, fetchOptions: { cache: "no-store" } }) };
  const url = `https://github.com/${repository}.wiki.git`;
  try {
    let ref: string;
    if (!state.directory) {
      const directory = await mkdtemp(join(tmpdir(), "hyped-wiki-"));
      try {
        await git.clone({ fs, http: transport, dir: directory, url, depth: 1, singleBranch: true, noCheckout: true, noTags: true });
        ref = await git.resolveRef({ fs, dir: directory, ref: "HEAD" });
        state.directory = directory;
      } catch (error) {
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
    } else {
      const result = await git.fetch({ fs, http: transport, dir: state.directory, url, depth: 1, singleBranch: true, tags: false });
      if (!result.fetchHead) throw new Error("Wiki repository has no default branch");
      ref = result.fetchHead;
    }
    state.paths = await git.listFiles({ fs, dir: state.directory, ref });
    state.available = true;
  } catch {
    // Keep a previously known section during a transient Git failure. A
    // successful empty tree always replaces it, including folder removals.
    state.available = false;
  }
  state.expiresAt = Date.now() + 60_000;
  return { paths: state.paths, available: state.available };
}
