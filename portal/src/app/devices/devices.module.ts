import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DevicesRoutingModule } from './device-routing.module';
import { DevicesComponent } from './devices.component';

@NgModule({
  imports: [
    CommonModule,
    DevicesRoutingModule
  ],
  declarations: [
    DevicesComponent
  ]
})
export class DevicesModule { }
