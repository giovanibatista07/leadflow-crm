-- CreateTable
CREATE TABLE "failed_login_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "failed_login_attempts_email_created_at_idx" ON "failed_login_attempts"("email", "created_at");
