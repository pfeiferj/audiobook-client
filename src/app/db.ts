import Dexie, { Table } from 'dexie';

export interface Book {
  filename: string;
  data: Blob;
}

export interface Cover {
  book: string;
  data: Blob;
}

export interface Position {
  id?: number;
  book: string;
  position: number;
  timestamp: number;
}

export const DB_VERSION = 1;
export const DB_NAME = "audiobook-client";

export const DB_OBJECTS = {
  books: '&filename',
  covers: '&book',
  positions: '++id,book'
};


export class AppDB extends Dexie {
  covers!: Table<Cover, string>;
  books!: Table<Book, string>;
  positions!: Table<Position, string>;


  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores(DB_OBJECTS);
  }

}

export const db = new AppDB();

try {
  navigator.storage.persist()
} catch(e) {
  console.warn('Could not persist storage.');
}
