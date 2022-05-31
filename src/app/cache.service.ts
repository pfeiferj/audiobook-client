import { Injectable } from '@angular/core';
import { Book, Cover, Position, db } from './db';

@Injectable({
  providedIn: 'root'
})
export class CacheService {

  constructor() {}

  async cacheBook(filename: string): Promise<Book> {
    const response = await fetch(`/v1/books/${filename}`);
    const blob = await response.blob();
    const book = {filename, data: blob};
    db.books.put(book);
    return book;
  }

  async cacheCover(book: string): Promise<Cover> {
    const response = await fetch(`/v1/books/${encodeURI(book)}/cover`);
      const blob = await response.blob();
      const cover = {book, data: blob};
      if(response.ok) {
        db.covers.put(cover);
      }
      return cover;
  }

  async getCover(book: string): Promise<Cover | undefined> {
    const cover = await db.covers.get(book);
    return cover;
  }

  async getBookKeys(): Promise<string[]> {
    return db.books.toCollection().primaryKeys();
  }

  async getBook(filename: string): Promise<Book | undefined> {
    const book = await db.books.get(filename);
    return book;
  }

  removeBook(filename: string): Promise<void> {
    return db.books.delete(filename);
  }

  async getCurrentPosition(book: string): Promise<Position | undefined> {
    const positions = await db.positions.where({book}).sortBy('timestamp');
    return positions[positions.length - 1];
  }

  async syncPositions(book: string, position?: Position): Promise<{positions: Position[], currentPosition?: Position}> {
    if(position) {
      await db.positions.put(position);
    }

    const positions = await db.positions.where({book}).toArray();

    try {
      //TODO: save bandwidth by not re-sending
      const response = await fetch(`/v1/books/${book}/positions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(positions),
      })
      const newPositions: Position[] = await response.json()
      const currentPosition = newPositions.find(p => p.timestamp === position?.timestamp) ?? newPositions[newPositions.length - 1];
      if(Array.isArray(newPositions) && newPositions.length) {
        await db.positions.where({book}).delete();
        const updates = newPositions.map(position => db.positions.put(position));
        await Promise.all(updates);
      }
      return {positions: (await db.positions.where({book}).toArray()), currentPosition};

    } catch(e) {
      console.warn(e);
      return {positions, currentPosition: position};
    }
  }
}
