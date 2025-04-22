require("dotenv").config();
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

async function testS3Connection() {
  console.log("Testing S3 connection with the following config:");
  console.log("AWS_REGION:", process.env.AWS_REGION);
  console.log("AWS_BUCKET_NAME:", process.env.AWS_BUCKET_NAME);
  console.log("AWS_Access_key_ID exists:", !!process.env.AWS_Access_key_ID);
  console.log(
    "AWS_Secret_Access_Key exists:",
    !!process.env.AWS_Secret_Access_Key
  );

  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_Access_key_ID,
        secretAccessKey: process.env.AWS_Secret_Access_Key,
      },
    });

    // Test basic functionality - list buckets
    console.log("Attempting to list S3 buckets...");
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    console.log("Success! Found buckets:");
    response.Buckets.forEach((bucket) => {
      console.log(`- ${bucket.Name}`);
    });

    // Verify the target bucket exists
    const bucketExists = response.Buckets.some(
      (bucket) => bucket.Name === process.env.AWS_BUCKET_NAME
    );

    if (bucketExists) {
      console.log(
        `✅ Target bucket "${process.env.AWS_BUCKET_NAME}" exists and is accessible`
      );
    } else {
      console.log(
        `❌ WARNING: Target bucket "${process.env.AWS_BUCKET_NAME}" was not found!`
      );
    }
  } catch (error) {
    console.error("Error testing S3 connection:", error);
  }
}

testS3Connection();
