import { Injectable } from '@angular/core';
import { Metadata } from '../book/book.service';

export type Subscription = (type: AudioEventType, current_time: number) => void;
export enum AudioEventType {
  PLAY = 'play',
  PAUSE = 'pause',
  TIME_UPDATE = 'time_update',
  JUMP = 'jump',
  SET_POSITION = 'set_position',
  SKIP_NEXT = 'skip_next',
  SKIP_PREVIOUS = 'skip_previous',
}



@Injectable({
  providedIn: 'root'
})
export class AudioService {

  public audio: HTMLAudioElement;
  // Separate current time from audio element so that
  // angular properly detects changes.
  public current_time: number;
  public metadata?: Metadata;
  public cover?: string;
  private subscriptions: Subscription[] = [];

  constructor() {
    this.audio = new Audio();
    this.current_time = 0;
    this.audio.ontimeupdate = () => this.timeUpdate();
    this.setMediaSession();
  }

  /**
    * Convenience getter to get title from metadata.
    */
  public get title(): string {
    return this.metadata?.format.tags.title ?? '';
  }

  /**
    * Convenience getter to get author (artist)
    * from metadata.
    */
  public get author(): string {
    return this.metadata?.format.tags.artist ?? '';
  }

  /**
    * Convenience getter to get series (album)
    * from metadata.
    */
  public get series(): string {
    return this.metadata?.format.tags.album ?? '';
  }

  /**
    * Convenience getter to get chapters from metadata.
    */
  public get chapters(): Metadata['chapters'] {
    return this.metadata?.chapters || [];
  }

  /**
    * Convenience getter to get current chapter from
    * metadata and current position.
    */
  public get current_chapter(): string {
    const currentChapter = this.chapters.find(
      chapter => Number(chapter.start_time) <= this.current_time
        && Number(chapter.end_time) > this.current_time
    );
    return currentChapter?.tags.title ?? '';
  }

  /**
    * Convenience getter to get playback state from
    * audio element.
    */
  public get paused(): boolean {
    return this.audio.paused;
  }

  ngOnDestroy() {
    this.reset();
  }

  /**
    * Updates the current time to the audio element time.
    */
  private timeUpdate() {
    this.current_time = this.audio.currentTime;
    this.callSubscriptions(AudioEventType.TIME_UPDATE);
  }

  /**
    * Sets the media session to give controls and book
    * details to the OS of the device playing the audio.
    */
  private setMediaSession() {
    if(navigator.mediaSession) {
      const artwork = this.cover
        ? [{ src: this.cover.toString() }]
        : [];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.title,
        artist: '',
        album: '',
        artwork
      });
      // setup os controls so that we can update the timestamp on events
      navigator.mediaSession.setActionHandler('pause', () => { this.togglePlay() })
      navigator.mediaSession.setActionHandler('seekto', (event) => { this.setPosition(event.seekTime ?? 0) })
      navigator.mediaSession.setActionHandler('seekforward', () => { this.jump(30) })
      navigator.mediaSession.setActionHandler('seekbackward', () => { this.jump(-30) })
      navigator.mediaSession.setActionHandler('nexttrack', () => { this.skipNext() })
      navigator.mediaSession.setActionHandler('previoustrack', () => { this.skipPrevious() })
    }
  }

  /**
    * Set the cover source.
    */
  public setCover(source: string) {
    this.cover = source;
    this.setMediaSession();
  }

  /**
    * Set the book metadata.
    */
  public setMetadata(metadata: Metadata) {
    this.metadata = metadata;
    this.setMediaSession();
  }

  /**
    * Resets back to the original blank state.
    */
  public reset() {
    this.audio.pause();
    this.audio.remove();
    this.audio = new Audio();
    this.metadata = undefined;
    this.current_time = 0;
    this.setMediaSession();
    this.subscriptions = [];
  }

  /**
    * Set the source url of the audio.
    */
  public setSrc(src: string) {
    this.audio.src = src;
  }

  /**
    * Jump to a specific time in the audio.
    */
  public setPosition(seconds: number) {
    let time = seconds;
    if(time < 0) {
      time = 0;
    } else if(time > this.audio.duration) {
      time = this.audio.duration;
    }
    this.audio.currentTime = time;
    this.callSubscriptions(AudioEventType.SET_POSITION);
  }

  /**
    * Skip to the next chapter. If there is no next chapter,
    * skip to the end of the audio.
    */
  public skipNext() {
    const nextChapter = this.chapters.find(
      chapter => Number(chapter.start_time) > this.current_time
    );
    if(nextChapter) {
      this.audio.currentTime = Number(nextChapter.start_time);
      this.current_time = this.audio.currentTime;
      return;
    }
    this.audio.currentTime = this.audio.duration;
    this.current_time = this.audio.currentTime;
    this.callSubscriptions(AudioEventType.SKIP_NEXT);
  }

  /**
    * Skip to the previous chapter. If there is no previous
    * chapter, skip to the beginning of the audio.
    */
  public skipPrevious() {
    const previousChapter = this.chapters.find(
      chapter => Number(chapter.end_time) > this.current_time - 5
    );
    if(previousChapter) {
      this.audio.currentTime = Number(previousChapter.start_time);
      this.current_time = this.audio.currentTime;
      return;
    }
    this.audio.currentTime = 0;
    this.current_time = this.audio.currentTime;
    this.callSubscriptions(AudioEventType.SKIP_PREVIOUS);
  }

  /**
    * Jump x seconds. X can be positive to jump forward,
    * or negative to jump backwards. Will not jump past
    * the beginning or end of the audio.
    */
  public jump(seconds: number) {
    let newTime = this.current_time + seconds;
    if(newTime < 0) {
      newTime = 0;
    } else if(newTime > this.audio.duration) {
      newTime = this.audio.duration;
    }
    this.audio.currentTime = newTime;
    this.current_time = this.audio.currentTime;
    this.callSubscriptions(AudioEventType.JUMP);
  }

  public play() {
    this.audio.play();
    this.callSubscriptions(AudioEventType.PLAY);
  }

  public pause() {
    this.audio.pause();
    this.callSubscriptions(AudioEventType.PAUSE);
  }

  /**
    * Toggle the play/pause state of the audio.
    */
  public togglePlay() {
    if(this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  public subscribe(callback: Subscription) {
    this.subscriptions.push(callback);
  }

  private callSubscriptions(type: AudioEventType) {
    this.subscriptions.forEach(subscription => {
      subscription(type, this.current_time);
    });
  }
}
