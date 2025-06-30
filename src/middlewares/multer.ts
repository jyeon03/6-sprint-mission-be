import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME!,
    key: (req, file, cb) => {
      const isPrivate = (req as any).query?.access === "private";
      const folder = isPrivate ? "private/" : "public/";
      cb(null, `${folder}${Date.now()}_${file.originalname}`);
    },
  }),
});

export default upload;
