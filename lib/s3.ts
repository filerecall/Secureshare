import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

// Cached singleton. AWS SDK clients are heavy to instantiate and the
// route-handler module is re-used across invocations within a warm Lambda.
let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: env.awsRegion(),
    credentials: {
      accessKeyId: env.awsAccessKeyId(),
      secretAccessKey: env.awsSecretAccessKey(),
    },
    // SDK >= 3.730 sets these to "WHEN_SUPPORTED" by default, which makes
    // the presigner bake a CRC32 of an empty body into the URL and S3 then
    // rejects the real upload with a checksum-mismatch error. We don't need
    // SDK-side checksums for browser uploads (TLS already protects integrity),
    // so set both to "WHEN_REQUIRED" to disable the auto-checksum behavior.
    // See https://github.com/aws/aws-sdk-js-v3/issues/6810
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return cachedClient;
}

/**
 * Compose the S3 object key for a document. Keeps user files namespaced so
 * a misconfigured policy can't leak across tenants.
 */
export function buildDocumentS3Key(userId: string, documentId: string): string {
  return `documents/${userId}/${documentId}`;
}

interface PresignPutOptions {
  key: string;
  contentType: string;
  /** Seconds before the URL expires. Default: 5 minutes. */
  expiresInSeconds?: number;
}

/**
 * Generate a short-lived presigned PUT URL the browser uses to upload
 * directly to S3. The Content-Type is part of the signature, so the client
 * must send the same value in its Content-Type header.
 */
export async function presignDocumentUpload(opts: PresignPutOptions): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.awsS3Bucket(),
    Key: opts.key,
    ContentType: opts.contentType,
    // Server-side encryption applied to every object regardless of bucket
    // default, so we don't rely on bucket config to be correct.
    ServerSideEncryption: "AES256",
  });
  return getSignedUrl(getS3Client(), cmd, {
    expiresIn: opts.expiresInSeconds ?? 300,
  });
}

/**
 * Hard-delete an object. Used when a row is being removed or the client-side
 * upload step failed and we need to roll back.
 */
export async function deleteDocumentObject(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: env.awsS3Bucket(),
      Key: key,
    }),
  );
}
