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
      style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundPosition: `center ${positionY}%` } : undefined}
    >
      {canEdit && bannerPage && <BannerEditor key={`${bannerPage}:${imageUrl}:${positionY}`} hasImage={Boolean(imageUrl)} page={bannerPage} positionY={positionY} />}
    </div>
  );
}
