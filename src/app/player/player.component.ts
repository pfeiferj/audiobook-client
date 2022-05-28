import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { CacheService } from '../cache.service';
import { Position } from '../db';
const BOOK = 'book';
const SYNC_INTERVAL = 10 * 1000;

enum CacheState {
  CACHED,
  NOT_CACHED,
  DOWNLOADING
};

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {

  @Input() public book!: string;
  @Input() public title!: string;
  @Input() public cover!: string;
  @Input() public book_length: string = "0";
  @Input() public current_chapter: string = "No Chapters";
  @Input() public display_time_remaining: boolean = true;
  @Input() public cache_state: CacheState = CacheState.DOWNLOADING;
  @Input() public current_position?: Position;
  @Input() public last_sync: number = 0;

  @Input() public get cache_state_icon(): string {
    switch (this.cache_state) {
      case CacheState.CACHED:
        return 'file_download_done';
      case CacheState.NOT_CACHED:
        return 'file_download';
      default:
        return 'downloading';
    }
  }

  @Input() public get cache_text(): string {
    switch (this.cache_state) {
      case CacheState.CACHED:
        return 'Remove book from player';
      case CacheState.NOT_CACHED:
        return 'Download book to player';
      default:
        return 'Downloading';
    }
  }

  @Input() public cover_url!: string | SafeUrl;


  @Input() public audio: HTMLAudioElement = new Audio();

  @Input() public get play_pause_icon() {
    return this.audio.paused ? "play_arrow" : "pause";
  }

  @Input() public current_time: number = 0;

  constructor(private route: ActivatedRoute, public cache: CacheService, private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.route.params.subscribe(async params => {
      const paramsMap = convertToParamMap(params);
      const book = paramsMap.get(BOOK);
      if(book !== null) {
        console.log(this.audio);
        const cachedBook = await this.cache.getBook(book);
        if(cachedBook) {
          this.cache_state = CacheState.CACHED;
          this.audio.src = URL.createObjectURL(cachedBook.data);
        } else {
          this.cache_state = CacheState.NOT_CACHED;
          this.audio.src = `/v1/books/${book}`;
        }
        this.audio.ontimeupdate = (e) => this.timeUpdate();
        this.book = book;
        const currentPosition = await this.cache.getCurrentPosition(book);
        if(currentPosition) {
          this.audio.currentTime = currentPosition.position;
          this.current_time = currentPosition.position;
        }

        const bookKeys = await this.cache.getBookKeys();
        if(bookKeys.includes(this.book)) {
          this.cache.cacheCover(this.book);
          const cover = await this.cache.getCover(this.book)
          if(cover) {
            this.cover_url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(cover.data));
          }
        }

      }
    });
  }

  ngOnDestroy(): void {
    this.audio.pause();
    this.audio.remove();
  }

  private timeUpdate(forceSync: boolean = false) {
    const isManualChange = this.current_time == this.audio.currentTime;
    this.current_time = this.audio.currentTime;

    if(
      this.current_position &&
      !isManualChange
    ) {
      this.current_position.position = this.current_time;
      this.current_position.timestamp = Date.now();
    } else {
      this.current_position = {
        book: this.book,
        position: this.current_time,
        timestamp: Date.now()
      };
    }

    if((
        Date.now() - this.last_sync > SYNC_INTERVAL &&
        this.current_position.position != 0
      ) || forceSync) {
      this.cache.syncPositions(this.book, this.current_position);
      this.last_sync = Date.now();
    }

  }

  public scrubbing(time: number | null, event:any) {
    console.log(event);
    this.current_time = time ?? 0;
    this.audio.currentTime = time ?? 0;
  }

  public togglePlay() {
    if(this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
      this.timeUpdate(true);
    }
  }

  public forward30() {
    this.audio.currentTime += 30;
    this.current_time = this.audio.currentTime;
  }

  public replay30() {
    this.audio.currentTime -= 30;
    this.current_time = this.audio.currentTime;
  }

  public skipNext() {
    this.audio.currentTime = this.audio.duration;
    this.current_time = this.audio.currentTime;
  }

  public skipPrevious() {
    this.audio.currentTime = 0;
    this.current_time = this.audio.currentTime;
  }

  public toggleDisplayType() {
    this.display_time_remaining = !this.display_time_remaining;
  }

  public cacheOrRemoveBook() {
    if(this.cache_state == CacheState.CACHED) {
      this.removeBook();
    } else if(this.cache_state == CacheState.NOT_CACHED){
      this.cacheBook();
    }
  }

  public async cacheBook() {
    this.cache_state = CacheState.DOWNLOADING;
    await this.cache.cacheBook(this.book);
    this.cache_state = CacheState.CACHED;
  }

  public removeBook() {
    this.cache.removeBook(this.book);
    this.cache_state = CacheState.NOT_CACHED;
  }
}
