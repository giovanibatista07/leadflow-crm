-- CreateTable
CREATE TABLE "import_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_mappings_company_id_idx" ON "import_mappings"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_mappings_company_id_source_key" ON "import_mappings"("company_id", "source");

-- AddForeignKey
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
