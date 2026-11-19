/**
 * Seed idempotente: usuario inicial, géneros, autores, editoriales y libros de ejemplo.
 * Ejecutar con `npm run db:seed` (o automáticamente tras `prisma migrate reset`).
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { BcryptPasswordHasher } from '../src/auth/infrastructure/bcrypt-password-hasher.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const GENRES = [
  'Ficción',
  'Ciencia ficción',
  'Fantasía',
  'Misterio',
  'Romance',
  'Historia',
  'Biografía',
  'Poesía',
  'Infantil',
  'Ensayo',
] as const;

type GenreName = (typeof GENRES)[number];

// [título, autor, editorial, género, precio CLP, stock]
const BOOKS: [string, string, string, GenreName, number, number][] = [
  ['Cien años de soledad', 'Gabriel García Márquez', 'Sudamericana', 'Ficción', 18990, 14],
  ['La casa de los espíritus', 'Isabel Allende', 'Plaza & Janés', 'Ficción', 16990, 8],
  ['Rayuela', 'Julio Cortázar', 'Alfaguara', 'Ficción', 15990, 0],
  ['Pedro Páramo', 'Juan Rulfo', 'RM', 'Ficción', 11990, 6],
  ['Ficciones', 'Jorge Luis Borges', 'Debolsillo', 'Ficción', 12990, 10],
  ['La ciudad y los perros', 'Mario Vargas Llosa', 'Alfaguara', 'Ficción', 14990, 3],
  ['Los detectives salvajes', 'Roberto Bolaño', 'Anagrama', 'Ficción', 21990, 5],
  ['2666', 'Roberto Bolaño', 'Anagrama', 'Ficción', 27990, 2],
  ['Patria', 'Fernando Aramburu', 'Tusquets', 'Ficción', 19990, 0],
  ['Fahrenheit 451', 'Ray Bradbury', 'Minotauro', 'Ciencia ficción', 13990, 11],
  ['Fundación', 'Isaac Asimov', 'Debolsillo', 'Ciencia ficción', 14990, 7],
  ['Dune', 'Frank Herbert', 'Debolsillo', 'Ciencia ficción', 22990, 4],
  ['Un mundo feliz', 'Aldous Huxley', 'Debolsillo', 'Ciencia ficción', 11990, 9],
  ['1984', 'George Orwell', 'Debolsillo', 'Ciencia ficción', 12990, 15],
  ['El problema de los tres cuerpos', 'Liu Cixin', 'Nova', 'Ciencia ficción', 20990, 0],
  ['El Señor de los Anillos', 'J. R. R. Tolkien', 'Minotauro', 'Fantasía', 34990, 6],
  ['El nombre del viento', 'Patrick Rothfuss', 'Plaza & Janés', 'Fantasía', 24990, 5],
  ['Harry Potter y la piedra filosofal', 'J. K. Rowling', 'Salamandra', 'Fantasía', 17990, 20],
  ['La historia interminable', 'Michael Ende', 'Alfaguara', 'Fantasía', 18990, 3],
  ['El nombre de la rosa', 'Umberto Eco', 'Lumen', 'Misterio', 19990, 4],
  ['Asesinato en el Orient Express', 'Agatha Christie', 'Planeta', 'Misterio', 12990, 12],
  ['La sombra del viento', 'Carlos Ruiz Zafón', 'Planeta', 'Misterio', 18990, 9],
  ['El código Da Vinci', 'Dan Brown', 'Planeta', 'Misterio', 15990, 0],
  ['Orgullo y prejuicio', 'Jane Austen', 'Alba', 'Romance', 13990, 7],
  ['El amor en los tiempos del cólera', 'Gabriel García Márquez', 'Sudamericana', 'Romance', 16990, 5],
  ['Como agua para chocolate', 'Laura Esquivel', 'Debolsillo', 'Romance', 11990, 8],
  ['Sapiens', 'Yuval Noah Harari', 'Debate', 'Historia', 23990, 10],
  ['Historia de Chile 1808-2017', 'Sofía Correa Sutil', 'Universitaria', 'Historia', 29990, 2],
  ['Las venas abiertas de América Latina', 'Eduardo Galeano', 'Siglo XXI', 'Historia', 16990, 6],
  ['Steve Jobs', 'Walter Isaacson', 'Debate', 'Biografía', 25990, 3],
  ['Confieso que he vivido', 'Pablo Neruda', 'Seix Barral', 'Biografía', 17990, 4],
  ['Veinte poemas de amor y una canción desesperada', 'Pablo Neruda', 'Pehuén', 'Poesía', 9990, 18],
  ['Desolación', 'Gabriela Mistral', 'Universitaria', 'Poesía', 10990, 0],
  ['Altazor', 'Vicente Huidobro', 'Cátedra', 'Poesía', 12990, 5],
  ['El principito', 'Antoine de Saint-Exupéry', 'Salamandra', 'Infantil', 9990, 25],
  ['Papelucho', 'Marcela Paz', 'Universitaria', 'Infantil', 8990, 30],
  ['Matilda', 'Roald Dahl', 'Alfaguara', 'Infantil', 10990, 7],
  ['El laberinto de la soledad', 'Octavio Paz', 'FCE', 'Ensayo', 14990, 4],
  ['Breve historia del tiempo', 'Stephen Hawking', 'Crítica', 'Ensayo', 15990, 6],
  ['Pensar rápido, pensar despacio', 'Daniel Kahneman', 'Debate', 'Ensayo', 21990, 0],
];

/** Quita espacios sobrantes y colapsa los repetidos (igual que la API). */
function normalize(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
  });

  try {
    const hasher = new BcryptPasswordHasher();
    const email = requireEnv('SEED_USER_EMAIL').toLowerCase();
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: process.env.SEED_USER_NAME ?? 'Administrador',
        passwordHash: await hasher.hash(requireEnv('SEED_USER_PASSWORD')),
      },
    });
    console.log(`Usuario seed: ${email}`);

    for (const name of GENRES) {
      await prisma.genre.upsert({ where: { name }, update: {}, create: { name } });
    }
    const genres = await prisma.genre.findMany();
    const genreIdByName = new Map(genres.map((g) => [g.name, g.id]));
    console.log(`Géneros: ${genres.length}`);

    // Autores y editoriales: un registro por nombre, sin distinguir mayúsculas.
    for (const name of new Set(BOOKS.map((book) => normalize(book[1])))) {
      const found = await prisma.author.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (!found) await prisma.author.create({ data: { name } });
    }
    for (const name of new Set(BOOKS.map((book) => normalize(book[2])))) {
      const found = await prisma.publisher.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (!found) await prisma.publisher.create({ data: { name } });
    }
    const authorIdByName = new Map(
      (await prisma.author.findMany()).map((a) => [a.name.toLowerCase(), a.id]),
    );
    const publisherIdByName = new Map(
      (await prisma.publisher.findMany()).map((p) => [p.name.toLowerCase(), p.id]),
    );
    console.log(
      `Autores: ${authorIdByName.size} · Editoriales: ${publisherIdByName.size}`,
    );

    if ((await prisma.book.count()) === 0) {
      await prisma.book.createMany({
        data: BOOKS.map(([title, author, publisher, genre, price, stock]) => ({
          title,
          authorId: authorIdByName.get(normalize(author).toLowerCase())!,
          publisherId: publisherIdByName.get(normalize(publisher).toLowerCase())!,
          price,
          stock,
          genreId: genreIdByName.get(genre)!,
        })),
      });
      console.log(`Libros de ejemplo creados: ${BOOKS.length}`);
    } else {
      console.log('Ya existen libros: se omite la carga de ejemplos');
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
