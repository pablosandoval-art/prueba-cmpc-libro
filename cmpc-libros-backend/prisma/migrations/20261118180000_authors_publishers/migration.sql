-- Autores y editoriales pasan de columnas de texto en `books` a tablas propias.
-- La migración conserva los datos: crea los registros a partir de los textos
-- existentes (sin distinguir mayúsculas ni espacios sobrantes), enlaza cada libro
-- y sólo entonces elimina las columnas antiguas.

-- CreateTable
CREATE TABLE "authors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- Unicidad sin distinguir mayúsculas (Prisma no puede expresar índices sobre expresiones).
CREATE UNIQUE INDEX "authors_name_lower_key" ON "authors" (lower("name"));
CREATE UNIQUE INDEX "publishers_name_lower_key" ON "publishers" (lower("name"));

-- CreateIndex (búsqueda parcial ILIKE '%texto%')
CREATE INDEX "authors_name_trgm_idx" ON "authors" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "publishers_name_trgm_idx" ON "publishers" USING GIN ("name" gin_trgm_ops);

-- AlterTable: columnas nuevas, nulas hasta completar el traspaso
ALTER TABLE "books" ADD COLUMN "author_id" INTEGER,
ADD COLUMN "publisher_id" INTEGER;

-- Traspaso de autores: una fila por nombre; si hay variantes de mayúsculas, gana la más usada.
WITH cleaned AS (
    SELECT btrim(regexp_replace("author", '\s+', ' ', 'g')) AS name FROM "books"
), counted AS (
    SELECT name, count(*) AS n FROM cleaned GROUP BY name
), ranked AS (
    SELECT name, row_number() OVER (PARTITION BY lower(name) ORDER BY n DESC, name) AS rn FROM counted
)
INSERT INTO "authors" ("name") SELECT name FROM ranked WHERE rn = 1 ORDER BY lower(name);

UPDATE "books" SET "author_id" = a."id"
FROM "authors" a
WHERE lower(a."name") = lower(btrim(regexp_replace("books"."author", '\s+', ' ', 'g')));

-- Traspaso de editoriales (misma lógica)
WITH cleaned AS (
    SELECT btrim(regexp_replace("publisher", '\s+', ' ', 'g')) AS name FROM "books"
), counted AS (
    SELECT name, count(*) AS n FROM cleaned GROUP BY name
), ranked AS (
    SELECT name, row_number() OVER (PARTITION BY lower(name) ORDER BY n DESC, name) AS rn FROM counted
)
INSERT INTO "publishers" ("name") SELECT name FROM ranked WHERE rn = 1 ORDER BY lower(name);

UPDATE "books" SET "publisher_id" = p."id"
FROM "publishers" p
WHERE lower(p."name") = lower(btrim(regexp_replace("books"."publisher", '\s+', ' ', 'g')));

-- Todos los libros quedaron enlazados: ahora sí son obligatorias.
ALTER TABLE "books" ALTER COLUMN "author_id" SET NOT NULL,
ALTER COLUMN "publisher_id" SET NOT NULL;

-- DropIndex / AlterTable: se eliminan las columnas de texto antiguas
DROP INDEX "books_author_trgm_idx";
DROP INDEX "books_publisher_trgm_idx";
ALTER TABLE "books" DROP COLUMN "author",
DROP COLUMN "publisher";

-- CreateIndex
CREATE INDEX "books_author_id_deleted_at_idx" ON "books"("author_id", "deleted_at");
CREATE INDEX "books_publisher_id_deleted_at_idx" ON "books"("publisher_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
