import type { BannerPage } from "@/domain/site-banners";

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
        backgroundImage: `url(${imageUrl || "/default-banner.webp"})`,
        backgroundPosition: imageUrl ? `center ${positionY}%` : "center bottom",
      }}
    >
      {canEdit && bannerPage && <BannerEditor key={`${bannerPage}:${imageUrl}:${positionY}`} hasImage={Boolean(imageUrl)} page={bannerPage} positionY={positionY} />}
    </div>
  );
}
