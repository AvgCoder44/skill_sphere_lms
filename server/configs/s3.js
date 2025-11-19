import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;

/**
 * Generate presigned URL for video upload
 * @param {string} fileKey - S3 object key (path)
 * @param {string} contentType - MIME type (e.g., 'video/mp4')
 * @returns {Promise<string>} Presigned URL
 */
export const getVideoUploadUrl = async (fileKey, contentType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    // Optional: Add ACL or other metadata
  });

  // URL expires in 1 hour
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
};

/**
 * Generate presigned URL for video streaming (download)
 * @param {string} fileKey - S3 object key
 * @returns {Promise<string>} Presigned URL (valid for 1 hour)
 */
export const getVideoStreamUrl = async (fileKey) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  // URL expires in 1 hour
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
};

/**
 * Generate batch presigned URLs for multiple videos
 * @param {string[]} fileKeys - Array of S3 object keys
 * @returns {Promise<Object>} Object mapping fileKey to presigned URL
 */
export const getBatchVideoStreamUrls = async (fileKeys) => {
  const urlPromises = fileKeys.map(async (fileKey) => {
    const url = await getVideoStreamUrl(fileKey);
    return { fileKey, url };
  });

  const results = await Promise.all(urlPromises);
  return results.reduce((acc, { fileKey, url }) => {
    acc[fileKey] = url;
    return acc;
  }, {});
};

export default s3Client;

