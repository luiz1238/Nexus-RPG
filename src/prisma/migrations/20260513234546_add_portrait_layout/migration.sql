-- CreateTable
CREATE TABLE "PortraitLayout" (
    "id" SERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "element" TEXT NOT NULL,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fontSize" DOUBLE PRECISION NOT NULL DEFAULT 48,

    CONSTRAINT "PortraitLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortraitLayout_player_id_element_key" ON "PortraitLayout"("player_id", "element");

-- AddForeignKey
ALTER TABLE "PortraitLayout" ADD CONSTRAINT "PortraitLayout_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
