import type { GoogleAccountUser, LoreDatabase, RoadmapItem } from "../types";
import type { ArtBinderSlotCard } from "../components/ArtBinderPage";
import type { ImageManagerSlotDraft } from "../components/ImageManagerModal";
import {
  artBinderDriveContext,
  artBinderImageManagerSlot,
  updateDatabaseSlotImage
} from "../components/ArtBinderPage";
import { artVaultDriveFolderPathLabel, resolveArtVaultDriveFolder } from "./artVaultDriveFolders";
import { googleDriveFolderLink, uploadImageToDrive, type GoogleDriveFolder } from "./googlePicker";
import { googleDriveThumbnailUrl, googleDriveWebViewLink, normalizeImageFit } from "./imageFit";

export async function uploadRoadmapItemFile(options: {
  database: LoreDatabase;
  item: RoadmapItem;
  card: ArtBinderSlotCard;
  file: File;
  currentUser: GoogleAccountUser | null;
  approveImmediately: boolean;
}): Promise<LoreDatabase> {
  const { database, item, card, file, currentUser, approveImmediately } = options;
  const folder = await resolveRoadmapUploadFolder(card);
  const uploaded = await uploadImageToDrive(file, folder.id, {
    naming: {
      subjectName: card.subject.title,
      categoryName: card.section.title,
      slotName: card.slot.label,
      sourceType: card.subject.kind,
      purpose: "Roadmap",
      state: approveImmediately ? "final" : "wip"
    }
  });

  const slot = artBinderImageManagerSlot(card);
  const imageDraft: ImageManagerSlotDraft = {
    ...slot,
    imageUrl: googleDriveThumbnailUrl(uploaded.id),
    imageFit: normalizeImageFit(slot.imageFit),
    webViewLink: uploaded.webViewLink || googleDriveWebViewLink(uploaded.id),
    defaultFolderId: folder.id,
    defaultFolderLink: folder.url || googleDriveFolderLink(folder.id),
    defaultFolderName: folder.name,
    assetState: approveImmediately ? "final" : "wip"
  };
  const nextDatabase = updateDatabaseSlotImage(database, card, imageDraft);
  const timestamp = new Date().toISOString();
  const fileRef = {
    id: `roadmap-file-${uploaded.id}`,
    driveFileId: uploaded.id,
    fileName: uploaded.name || file.name,
    webViewLink: uploaded.webViewLink || googleDriveWebViewLink(uploaded.id),
    thumbnailUrl: googleDriveThumbnailUrl(uploaded.id),
    uploadedAt: timestamp,
    uploadedById: currentUser?.email || "",
    uploadedByName: currentUser?.name || "Unknown"
  };

  return {
    ...nextDatabase,
    roadmap: {
      ...nextDatabase.roadmap,
      items: (nextDatabase.roadmap.items || []).map((candidate) =>
        candidate.id === item.id
          ? {
              ...candidate,
              status: approveImmediately ? "approved" : "needs-review",
              googleDriveFolderId: folder.id,
              driveFolderPath: artVaultDriveFolderPathLabel(artBinderDriveContext(card)),
              uploadedFileIds: unique([...(candidate.uploadedFileIds || []), uploaded.id]),
              uploadedFiles: [...(candidate.uploadedFiles || []), fileRef],
              revisionHistory: [
                ...(candidate.revisionHistory || []),
                {
                  id: `revision-${Date.now()}`,
                  action: "uploaded",
                  note: approveImmediately ? "Uploaded and approved from Roadmap." : "Uploaded from Roadmap and sent to review.",
                  authorId: currentUser?.email || "",
                  authorName: currentUser?.name || "Unknown",
                  createdAt: timestamp
                }
              ],
              updatedAt: timestamp
            }
          : candidate
      ),
      updatedAt: timestamp
    }
  };
}

export async function resolveRoadmapUploadFolder(card: ArtBinderSlotCard): Promise<GoogleDriveFolder> {
  const sectionFolderId = card.section.driveFolderId?.trim();
  if (sectionFolderId) {
    return {
      id: sectionFolderId,
      name: card.section.driveFolderName || `${card.subject.title} / ${card.section.title}`,
      url: card.section.driveFolderLink || googleDriveFolderLink(sectionFolderId),
      mimeType: "application/vnd.google-apps.folder"
    };
  }
  return resolveArtVaultDriveFolder(artBinderDriveContext(card));
}

function unique(values: string[]) {
  return values.filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}
