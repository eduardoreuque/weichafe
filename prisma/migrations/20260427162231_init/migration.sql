-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "email" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "district" TEXT,
    "emergencyPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MonthlyPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAGADO',
    "monthCovered" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" DATETIME,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyClassSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT,
    "attendeeName" TEXT,
    "discipline" TEXT NOT NULL,
    "classDate" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyClassSale_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNumber" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "monthlyPaymentId" TEXT,
    "dailyClassSaleId" TEXT,
    CONSTRAINT "Receipt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Receipt_monthlyPaymentId_fkey" FOREIGN KEY ("monthlyPaymentId") REFERENCES "MonthlyPayment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Receipt_dailyClassSaleId_fkey" FOREIGN KEY ("dailyClassSaleId") REFERENCES "DailyClassSale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MonthlyPayment_studentId_monthCovered_idx" ON "MonthlyPayment"("studentId", "monthCovered");

-- CreateIndex
CREATE INDEX "DailyClassSale_classDate_idx" ON "DailyClassSale"("classDate");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_monthlyPaymentId_key" ON "Receipt"("monthlyPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_dailyClassSaleId_key" ON "Receipt"("dailyClassSaleId");

-- CreateIndex
CREATE INDEX "Receipt_studentId_issuedAt_idx" ON "Receipt"("studentId", "issuedAt");
