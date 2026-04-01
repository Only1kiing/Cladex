-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receiptData" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReceipt_userId_idx" ON "PaymentReceipt"("userId");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
