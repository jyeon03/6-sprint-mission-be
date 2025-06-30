import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. 테스트 사용자 생성
  const testUser = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "테스트사용자",
      password: "hashedpassword123",
    },
  });

  // 2. 자유게시판 글 10개 생성
  for (let i = 1; i <= 10; i++) {
    await prisma.article.create({
      data: {
        title: `자유게시판 글 ${i}`,
        content: `이것은 자유게시판의 ${i}번째 글입니다.`,
        authorId: testUser.id,
      },
    });
  }

  // 3. 상품 10개 생성
  for (let i = 1; i <= 10; i++) {
    await prisma.product.create({
      data: {
        name: `상품 ${i}`,
        description: `이것은 상품 ${i}의 상세 설명입니다.`,
        price: 10000 + i * 500,
        tags: [`태그${i}`, `카테고리${i}`],
        authorId: testUser.id,
      },
    });
  }

  // 4. 각 게시글에 댓글 추가
  const articles = await prisma.article.findMany();

  for (const article of articles) {
    const commentCount = Math.floor(Math.random() * 4) + 2;

    for (let i = 1; i <= commentCount; i++) {
      await prisma.comment.create({
        data: {
          content: `${article.title}에 대한 ${i}번째 댓글입니다. 좋은 게시글이네요!`,
          articleId: article.id,
          authorId: testUser.id,
        },
      });
    }
  }

  // 5. 각 상품에 댓글 추가
  const products = await prisma.product.findMany();

  for (const product of products) {
    const commentCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 1; i <= commentCount; i++) {
      await prisma.comment.create({
        data: {
          content: `${product.name}에 대한 ${i}번째 댓글입니다. 좋은 상품이네요!`,
          productId: product.id,
          authorId: testUser.id,
        },
      });
    }
  }
}

main()
  .then(async () => {
    console.log("✅ Seed 완료!");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
