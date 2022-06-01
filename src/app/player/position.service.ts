import { Injectable } from '@angular/core';
import { Position } from '../db';
import { AudioEventType, AudioService } from './audio.service';

@Injectable({
  providedIn: 'root'
})
export class PositionService {

  private audioService?: AudioService;

  private old_positions: Position[] = [];

  public get positions(): Position[] {
    return [...this.old_positions, this.current_position];
  };

  public current_position: Position = {
    book: '',
    position: 0,
    timestamp: Date.now(),
  };

  public new_position_delay_ms = 5000;
  private prepare_new: boolean = false;
  private prepare_timestamp: number = 0;

  constructor() { }

  /**
    * Set the audio service to use when calculating the position.
    */
  public setAudio(audio: AudioService) {
    this.audioService = audio;
    this.audioService.subscribe(this.update.bind(this));
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
    } else if(this.prepare_timestamp + this.new_position_delay_ms < Date.now()) {
      this.createNewPosition(currentTime);
    }
  }
}
