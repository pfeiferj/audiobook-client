import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, EMPTY, iif, switchMap, catchError } from 'rxjs';
import { db, Position } from '../db';
import { AudioEventType, AudioService } from './audio.service';

@Injectable({
  providedIn: 'root'
})
export class PositionService {

  public new_position_delay_ms = 5 * 1000;
  public sync_interval_ms = 10 * 1000;
  public current_position: Position = {
    book: '',
    position: 0,
    timestamp: Date.now(),
  };

  public get positions(): Position[] {
    return [...this.old_positions, this.current_position];
  };

  private last_sync: number = 0;
  private prepare_new: boolean = false;
  private prepare_timestamp: number = 0;
  private audioService?: AudioService;
  private old_positions: Position[] = [];
  private book: string = '';

  constructor(private http: HttpClient) {}

  /**
* Set the audio service to use when calculating the position.
*/
  public setAudio(audio: AudioService) {
    this.audioService = audio;
    this.audioService.subscribe(this.update.bind(this));
  }

  private reset() {
    this.last_sync = 0;
    this.prepare_new = false;
    this.prepare_timestamp = 0;
    this.old_positions = [];
    this.current_position = {
      book: '',
      position: 0,
      timestamp: Date.now(),
    }
  }
  public setBook(book: string) {
    this.book = book;
    this.reset();
    this.current_position.book = book;
    this.syncPositions(book).subscribe(() => {
      if(!this.current_position.id && this.old_positions.length) {
        this.old_positions.sort((a, b) => a.timestamp - b.timestamp);
        this.current_position = this.old_positions[this.old_positions.length - 1];
        this.old_positions = this.old_positions.slice(0, this.old_positions.length - 1);
        this.audioService?.setStartupPosition(this.current_position.position);
      }
    });
  }

  public createNewPosition(currentTime: number) {
    this.old_positions.push(this.current_position);
    this.current_position = {
      book: this.current_position.book,
      position: currentTime,
      timestamp: Date.now(),
    }
    this.prepare_new = false;
  }

  public updateCurrentPosition(currentTime: number) {
    this.current_position.position = currentTime;
    this.current_position.timestamp = Date.now();
  }

  private update(type: AudioEventType, currentTime: number) {
    if(type === AudioEventType.PAUSE) {
      this.syncPositions(this.book, this.current_position).subscribe(()=>{});
      this.createNewPosition(currentTime);
    } else if (
      type !== AudioEventType.PLAY
        && type !== AudioEventType.TIME_UPDATE
    ) {
      this.prepare_new = true;
      this.prepare_timestamp = Date.now();
    }

    if (!this.prepare_new) {
      this.updateCurrentPosition(currentTime);
      if(this.shouldSync()) {
        this.syncPositions(this.book, this.current_position).subscribe(()=>{});
      }
    } else if(this.prepare_timestamp + this.new_position_delay_ms < Date.now()) {
      this.createNewPosition(currentTime);
    }
  }

  private shouldSync(): boolean {
    return this.last_sync + this.sync_interval_ms < Date.now();
  }

  public syncPositions(book: string, position?: Position): Observable<Position[]> {
    this.last_sync = Date.now();
    let db_positions: Position[] = [];
    return from([position]).pipe<string | never>(switchMap(pos =>
      pos !== undefined ? from(db.positions.put(pos)) : from('noop')
    )).pipe<Position[]>(
        switchMap(() => from(db.positions.where({book}).toArray()))
      ).pipe<Position[]>(
        switchMap(positions => {
          //TODO: save bandwidth by not re-sending
          db_positions = positions;
          return this.http.patch<Position[]>(`/v1/books/${book}/positions`, positions, {headers: { 'Content-Type': 'application/json' }})
        })
      ).pipe<Position[]>(catchError(err => {
        console.warn(err);
        return from([db_positions]);
      })).pipe<string>(
        switchMap(positions => {
          if(positions.length === 0) {
            return from('noop');
          }
          this.old_positions = positions.filter(position => position.client_id !== this.current_position.client_id);
          const current_position = positions.find(position => position.client_id === this.current_position.client_id);
          if(current_position !== undefined) {
            this.current_position.id = current_position.id;
          }
          return from(db.positions.bulkPut(positions));
        })
      ).pipe<Position[]>(switchMap(() => [db_positions]));
  }
}
