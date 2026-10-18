import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  // Profile picture uploader
  profilePicture: f({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl, name: file.name, size: file.size, type: file.type };
  }),

  // File uploader for cohort files
  cohortFileUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 10 },
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    text: { maxFileSize: "4MB", maxFileCount: 10 },
    video: { maxFileSize: "256MB", maxFileCount: 2 },
    audio: { maxFileSize: "32MB", maxFileCount: 5 },
    blob: { maxFileSize: "32MB", maxFileCount: 10 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl, name: file.name, size: file.size, type: file.type };
  }),

  // Submission file uploader
  submissionUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    text: { maxFileSize: "4MB", maxFileCount: 5 },
    blob: { maxFileSize: "32MB", maxFileCount: 5 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl, name: file.name, size: file.size, type: file.type };
  }),

  // Message attachment uploader
  messageAttachment: f({
    image: { maxFileSize: "8MB", maxFileCount: 5 },
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    text: { maxFileSize: "4MB", maxFileCount: 5 },
    video: { maxFileSize: "64MB", maxFileCount: 2 },
    audio: { maxFileSize: "16MB", maxFileCount: 5 },
    blob: { maxFileSize: "16MB", maxFileCount: 5 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl, name: file.name, size: file.size, type: file.type };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
