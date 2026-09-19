const configuredRepository = process.env.HYPED_GITHUB_WIKI_REPOSITORY?.trim();
export const GITHUB_WIKI_REPOSITORY = configuredRepository && /^Hyp-ed\/hyped-[a-z0-9-]+$/i.test(configuredRepository)
  ? configuredRepository
  : "Hyp-ed/hyped-2027";
