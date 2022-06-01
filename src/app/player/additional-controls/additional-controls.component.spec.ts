import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdditionalControlsComponent } from './additional-controls.component';

describe('AdditionalControlsComponent', () => {
  let component: AdditionalControlsComponent;
  let fixture: ComponentFixture<AdditionalControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdditionalControlsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdditionalControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
