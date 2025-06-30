import express, { NextFunction, Request, Response } from "express";
import auth from "../middlewares/auth";
import articleService from "../services/articleService";
import upload from "../middlewares/multer";
import { Article } from "@prisma/client";
import { ValidationError } from "../types/errors";

const articleController = express.Router();

/**
 * 자유게시글 생성
 */
articleController.post(
  "/",
  auth.verifyAccessToken,
  upload.single("image"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authorId = (req as any).auth?.id;
      if (!authorId) {
        res.status(401).json({ message: "로그인이 필요합니다." });
        return;
      }

      const { title, content, image: imageFromBody, presignedUrl } = req.body;
      let image: string | null = null;
      // 1. multer-s3 방식: S3 location
      if (req.file && (req.file as any).location) {
        image = (req.file as any).location;
      }
      // 2. presigned URL 방식: image 필드
      else if (imageFromBody) {
        image = imageFromBody;
      }
      // 3. fallback: multer 로컬 업로드
      else if (req.file) {
        image = `/uploads/${req.file.filename}`;
      }

      if (!title || !content) {
        const error = new ValidationError("제목과 내용은 필수입니다.");
        throw error;
      }

      const article = await articleService.create({
        title,
        content,
        image,
        authorId,
      });

      res.status(201).json({ ...article, presignedUrl: presignedUrl || null });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 전체 자유게시글 조회
 */
articleController.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const articles = await articleService.getAll();
      res.status(200).json(articles);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 자유게시글 단건 조회
 */
articleController.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        const error = new ValidationError("유효하지 않은 ID입니다.");
        throw error;
      }

      const article = await articleService.getById(id);
      if (!article) {
        res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
        return;
      }

      res.status(200).json(article);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 자유게시글 수정
 */
articleController.put(
  "/:id",
  auth.verifyAccessToken,
  auth.checkPostOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        const error = new ValidationError("유효하지 않은 ID입니다.");
        throw error;
      }

      const { title, content, image } = req.body;
      if (!title || !content) {
        const error = new ValidationError("제목과 내용은 필수입니다.");
        throw error;
      }

      const article = await articleService.updateById(id, {
        title,
        content,
        image,
      });

      res.status(200).json(article);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 자유게시글 삭제
 */
articleController.delete(
  "/:id",
  auth.verifyAccessToken,
  auth.checkPostOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        const error = new ValidationError("유효하지 않은 ID입니다.");
        throw error;
      }

      await articleService.deleteById(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 자유게시글 좋아요 추가
 */
articleController.post(
  "/:id/like",
  auth.verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const articleId = parseInt(req.params.id);
      const userId = (req as any).auth?.id;

      if (isNaN(articleId)) {
        const error = new ValidationError("유효하지 않은 게시글 ID입니다.");
        throw error;
      }

      if (!userId) {
        res.status(401).json({ message: "로그인이 필요합니다." });
        return;
      }

      const hasLiked = await articleService.hasUserLiked(userId, articleId);
      if (hasLiked) {
        await articleService.removeLike(userId, articleId);
        res.status(200).json({ message: "좋아요가 취소되었습니다." });
      } else {
        await articleService.addLike(userId, articleId);
        res.status(200).json({ message: "좋아요가 추가되었습니다." });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 자유게시글 좋아요 취소
 */
articleController.get(
  "/:id/like",
  auth.verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const articleId = parseInt(req.params.id);
      const userId = (req as any).auth?.id;

      if (isNaN(articleId)) {
        const error = new ValidationError("유효하지 않은 게시글 ID입니다.");
        throw error;
      }

      if (!userId) {
        res.status(401).json({ message: "로그인이 필요합니다." });
        return;
      }

      const hasLiked = await articleService.hasUserLiked(userId, articleId);
      res.status(200).json({ hasLiked });
    } catch (error) {
      next(error);
    }
  }
);

export const createWithImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, content } = req.body;
    const authorId = (req as any).auth?.id;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const article = await articleService.create({
      title,
      content,
      image,
      authorId,
    });

    res.status(201).json(article);
  } catch (error) {
    next(error);
  }
};

export default articleController;
