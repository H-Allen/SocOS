import type { BannerPage } from "@/domain/site-banners";
import defaultBanner from "../../../public/default-banner.webp";

import { BannerEditor } from "./banner-editor";
import styles from "./society.module.css";

type SocietyDocumentCoverProps = {
  bannerPage?: BannerPage;
  canEdit?: boolean;
  imageUrl?: string | null;
  positionY?: number;
};

export function SocietyDocumentCover({ bannerPage, canEdit, imageUrl, positionY = 50 }: SocietyDocumentCoverProps) {
  return (
    <div
      className={styles.societyDocumentCover}
      data-has-image={imageUrl ? "true" : "false"}
      style={{
        // Importing makes the asset part of the build's hashed static output.
        // The second layer also survives a missing custom upload.
        backgroundImage: imageUrl ? `url(${imageUrl}), url(${defaultBanner.src})` : `url(${defaultBanner.src})`,
        backgroundPosition: imageUrl ? `center ${positionY}%, center bottom` : "center bottom",
      }}
    >
      {canEdit && bannerPage && <BannerEditor key={`${bannerPage}:${imageUrl}:${positionY}`} hasImage={Boolean(imageUrl)} page={bannerPage} positionY={positionY} />}
    </div>
  );
}
