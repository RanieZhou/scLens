-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Runner` (
    `id` VARCHAR(191) NOT NULL,
    `runnerName` VARCHAR(191) NULL,
    `deviceFingerprint` VARCHAR(191) NULL,
    `os` VARCHAR(191) NULL,
    `arch` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'offline',
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RunnerProfile` (
    `id` VARCHAR(191) NOT NULL,
    `runnerId` VARCHAR(191) NOT NULL,
    `hostname` VARCHAR(191) NULL,
    `cpuInfo` JSON NULL,
    `memoryInfo` JSON NULL,
    `gpuInfo` JSON NULL,
    `diskInfo` JSON NULL,
    `pythonEnvs` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RunnerProfile_runnerId_key`(`runnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RunnerPairingSession` (
    `id` VARCHAR(191) NOT NULL,
    `runnerId` VARCHAR(191) NOT NULL,
    `pairCodeHash` VARCHAR(191) NOT NULL,
    `pairNonce` VARCHAR(191) NOT NULL,
    `runnerSecretHash` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `pairedProjectId` VARCHAR(191) NULL,
    `pairedAt` DATETIME(3) NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectRunnerBinding` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `runnerId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `runnerId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `pipeline` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `config` JSON NOT NULL,
    `inputFileMeta` JSON NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `currentStage` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskLog` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResultFile` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `objectKey` VARCHAR(191) NOT NULL,
    `sizeBytes` BIGINT NULL,
    `checksum` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RunnerProfile` ADD CONSTRAINT `RunnerProfile_runnerId_fkey` FOREIGN KEY (`runnerId`) REFERENCES `Runner`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectRunnerBinding` ADD CONSTRAINT `ProjectRunnerBinding_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectRunnerBinding` ADD CONSTRAINT `ProjectRunnerBinding_runnerId_fkey` FOREIGN KEY (`runnerId`) REFERENCES `Runner`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_runnerId_fkey` FOREIGN KEY (`runnerId`) REFERENCES `Runner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskLog` ADD CONSTRAINT `TaskLog_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResultFile` ADD CONSTRAINT `ResultFile_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
