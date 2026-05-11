import { S3Client } from "@aws-sdk/client-s3";

import { env } from "@/lib/env";

export const s3Client = new S3Client({
  region: env.awsRegion(),
  credentials: {
    accessKeyId: env.awsAccessKeyId(),
    secretAccessKey: env.awsSecretAccessKey(),
  },
});

export const s3Bucket = env.awsS3Bucket();
