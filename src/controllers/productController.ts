import express, { NextFunction, Request, Response } from "express";
import auth from "../middlewares/auth";
import productService from "../services/productService";
import upload from "../middlewares/multer";

const productController = express.Router();

/**
 *  상품 생성
 */
productController.post(
  "/",
  auth.verifyAccessToken,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const authorId = (req as any).auth?.id;

      if (!authorId) {
        res.status(401).json({ message: "로그인이 필요합니다." });
        return;
      }

      // 필수 필드 검증
      if (!req.body.name) {
        res.status(400).json({ message: "상품명은 필수입니다." });
        return;
      }

      if (!req.body.price || isNaN(Number(req.body.price))) {
        res.status(400).json({ message: "유효한 가격을 입력해주세요." });
        return;
      }

      // presigned URL 방식 여부 체크
      let isPresigned = false;
      let presignedUrl: string | null = null;
      let images: string | null = null;
      // 1. presigned URL 방식: images 필드(string 또는 string[])
      if (req.body.images) {
        isPresigned = true;
        if (Array.isArray(req.body.images)) {
          presignedUrl = req.body.images[0];
        } else {
          presignedUrl = req.body.images;
        }
      }
      else if (req.file && (req.file as any).location) {
        images = (req.file as any).location;
      }
      else if (req.file) {
        images = `/uploads/${req.file.filename}`;
      }

      const productData = {
        name: req.body.name,
        description: req.body.description || "",
        price: Number(req.body.price),
        tags: req.body.tags
          ? Array.isArray(req.body.tags)
            ? req.body.tags
            : [req.body.tags]
          : [],
        images: isPresigned ? null : images,
        authorId,
      };

      console.log("Product data before creation:", productData);

      const createdProduct = await productService.create(productData);
      res.status(201).json({
        ...createdProduct,
        presignedUrl: presignedUrl || null,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 전체 상품 조회
 */
productController.get("/", async (req, res, next) => {
  try {
    const products = await productService.getAll();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

/**
 * 상품 단건 조회
 */
productController.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getById(Number(id));
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * 상품 수정
 */
productController.put(
  "/:id",
  auth.verifyAccessToken,
  async (req: Request<{ id: string }>, res, next) => {
    try {
      const { id } = req.params;
      const updated = await productService.updateById(Number(id), req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 상품 삭제
 */
productController.delete(
  "/:id",
  auth.verifyAccessToken,
  async (req: Request<{ id: string }>, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await productService.deleteById(Number(id));
      res.json(deleted);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 상품 좋아요 추가
 */
productController.post(
  "/:id/like",
  auth.verifyAccessToken,
  async (req, res, next) => {
    try {
      const userId = (req as any).auth?.id;
      if (!userId) {
        res.status(401).json({ message: "로그인이 필요합니다." });
        return;
      }
      const productId = Number(req.params.id);
      await productService.addLike(userId, productId);
      res.status(200).json({ message: "좋아요가 눌러졌습니다." });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 상품 좋아요 취소
 */
productController.delete(
  "/:id/like",
  auth.verifyAccessToken,
  async (req, res, next) => {
    try {
      const userId = (req as any).auth?.id;
      if (!userId) {
        res.status(401).json({ message: "로그인이 필요합니다." });
        return;
      }
      const productId = parseInt(req.params.id, 10);
      await productService.removeLike(userId, productId);
      res.status(200).json({ message: "좋아요가 취소되었습니다." });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 유저가 좋아요 눌렀는지 확인
 */
productController.get(
  "/:id/like",
  auth.verifyAccessToken,
  async (req, res, next) => {
    try {
      const userId = (req as any).auth?.id;
      if (!userId) {
        res.status(401).json({ message: "로그인이 필요합니다." });
        return;
      }
      const productId = parseInt(req.params.id, 10);
      const hasLiked = await productService.hasUserLiked(userId, productId);
      res.status(200).json({ liked: hasLiked });
    } catch (err) {
      next(err);
    }
  }
);

export default productController;
