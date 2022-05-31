import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { MatMenu } from '@angular/material/menu';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable } from 'rxjs';
import { BookService, Metadata } from '../book/book.service';
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

  public Number = Number;
  @Input() public book!: string;
  @Input() public metadata$!: Observable<Metadata>;
  @Input() public chapters: Metadata["chapters"] = [];
  @Input() public title!: string;
  @Input() public cover!: string;
  @Input() public book_length: string = "0";
  @Input() public positions: Position[] = [];
  @Input() public get current_chapter(): string {
    if(this.chapters && this.chapters.length > 0) {
      const currentChapter = this.chapters.find(chapter => Number(chapter.start_time) <= this.current_time && Number(chapter.end_time) > this.current_time);
      if(currentChapter) {
        if(currentChapter.tags.title) {
          return currentChapter.tags.title;
        }
      }
    }
    return "";
  };
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

  @ViewChild('positionsMenu') positionsMenu!: MatMenu;

  constructor(private route: ActivatedRoute, public cache: CacheService, private sanitizer: DomSanitizer, private bookService: BookService) { }

  ngOnInit(): void {
    this.route.params.subscribe(async params => {
      const paramsMap = convertToParamMap(params);
      const book = paramsMap.get(BOOK);
      if(book !== null) {
        this.book = book;
        this.title = book;

        this.metadata$ = this.bookService.getMetadata(book);
        this.metadata$.subscribe(metadata => {
          if(metadata.format.tags.title) {
            this.title = metadata.format.tags.title;
          }
          this.chapters = metadata.chapters;
        });

        const cachedBook = await this.cache.getBook(book);
        if(cachedBook) {
          this.cache_state = CacheState.CACHED;
          this.audio.src = URL.createObjectURL(cachedBook.data);
        } else {
          this.cache_state = CacheState.NOT_CACHED;
          this.audio.src = `/v1/books/${book}`;
        }
        this.audio.ontimeupdate = (e) => this.timeUpdate();
        const currentPosition = await this.cache.getCurrentPosition(book);
        if(currentPosition) {
          this.audio.currentTime = currentPosition.position || 0;
          this.current_time = currentPosition.position;
        }

        const bookKeys = await this.cache.getBookKeys();
        if(bookKeys.includes(this.book)) {
          this.cache.cacheCover(this.book);
          const cover = await this.cache.getCover(this.book)
          if(cover) {
            this.cover_url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(cover.data));
          }
        } else {
          this.cover_url = `/v1/books/${this.book}/cover`;
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
        Date.now() - this.last_sync > SYNC_INTERVAL
      ) || forceSync) {
      this.cache.syncPositions(this.book, this.current_position).then((newPositions) => {
        this.positions = newPositions.positions;
        if(this.current_position) {
          if(newPositions.currentPosition) {
            this.current_position = newPositions.currentPosition;
          }
        }
      });
      this.last_sync = Date.now();
    }

  }

  public scrubbing(time: number | null) {
    this.current_time = time ?? 0;
    this.audio.currentTime = time ?? 0;
  }

  public togglePlay() {
    if(navigator.mediaSession) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.title,
        artist: '',
        album: '',
        artwork: [
          { src: this.cover_url.toString() }
        ]
      });
      // setup os controls so that we can update the timestamp on events
      navigator.mediaSession.setActionHandler('pause', () => { this.togglePlay() })
      navigator.mediaSession.setActionHandler('seekto', (event) => { this.scrubbing(event.seekTime ?? 0) })
      navigator.mediaSession.setActionHandler('seekforward', () => { this.forward30() })
      navigator.mediaSession.setActionHandler('seekbackward', () => { this.replay30() })
      navigator.mediaSession.setActionHandler('nexttrack', () => { this.skipNext() })
      navigator.mediaSession.setActionHandler('previoustrack', () => { this.skipPrevious() })
    }
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
    if(this.chapters.length) {
      const nextChapter = this.chapters.find(chapter => Number(chapter.start_time) > this.current_time);
      if(nextChapter) {
        this.audio.currentTime = Number(nextChapter.start_time);
        this.current_time = this.audio.currentTime;
      }
    } else {
      this.audio.currentTime = this.audio.duration;
      this.current_time = this.audio.currentTime;
    }
  }

  public skipPrevious() {
    if(this.chapters.length) {
      const previousChapter = this.chapters.find(chapter => Number(chapter.end_time) > this.current_time - 5);
      if(previousChapter) {
        this.audio.currentTime = Number(previousChapter.start_time);
        this.current_time = this.audio.currentTime;
      }
    } else {
      this.audio.currentTime = 0;
      this.current_time = this.audio.currentTime;
    }
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
