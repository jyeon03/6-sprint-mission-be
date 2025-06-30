import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import userController from "./controllers/userController";
import articleController from "./controllers/articleController";
import productController from "./controllers/productController";
import commentController from "./controllers/commentController";
import errorHandler from "./middlewares/errorHandler";
import upload from "./middlewares/multer";

import {
  S3Client as S3PresignClient,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();

dotenv.config();

app.use(
  cors({
    origin: "http://localhost:3000", 
    credentials: true, 
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/", userController);
app.use("/article", articleController);
app.use("/product", productController);
app.use("/comment", commentController);

app.post("/photos", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "파일이 업로드되지 않았습니다." });
    return;
  }

  const filename = req.file.filename;
  const path = `/profile/${filename}`;
  res.json({ path });
});

app.use("/photos", express.static("uploads"));

// presigned URL 방식 (S3 직접 업로드)
const s3Presign = new S3PresignClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

app.post("/presigned-url", async (req, res) => {
  const { fileName, fileType } = req.body;
  if (!fileName || !fileType) {
    return res
      .status(400)
      .json({ message: "fileName, fileType이 필요합니다." });
  }
  const key = `article/${Date.now()}_${fileName}`;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    ContentType: fileType,
  });
  try {
    const url = await getSignedUrl(s3Presign, command, { expiresIn: 60 * 5 });
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.ap-northeast-2.amazonaws.com/${key}`;
    res.json({ url, fileUrl, key });
  } catch (error) {
    res.status(500).json({ message: "Presigned URL 발급 실패", error });
  }
});

app.use(errorHandler);

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`Server started to listen at port number ${port}...`);
});
