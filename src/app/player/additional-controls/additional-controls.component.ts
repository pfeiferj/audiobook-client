import { Component, Input, OnInit } from '@angular/core';
import { AudioService } from '../audio.service';
import { PositionService } from '../position.service';

@Component({
  selector: 'app-additional-controls',
  templateUrl: './additional-controls.component.html',
  styleUrls: ['./additional-controls.component.scss']
})
export class AdditionalControlsComponent implements OnInit {

  public Number = Number;
  @Input() public positionService!: PositionService;
  @Input() public audioService!: AudioService;

  constructor() { }

  ngOnInit(): void {}
}
