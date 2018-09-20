import { Component, OnInit } from '@angular/core';

import { ApiService } from '../_services/api.service';

@Component({
  selector: 'app-devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss']
})
export class DevicesComponent implements OnInit {

  public client: {
    clientId: string,
    accessToken: string
  };

  constructor(
    private $api: ApiService
  ) { }

  ngOnInit() {
    this.getProfile();
  }

  getProfile() {
    this.$api.get('/profile').toPromise()
      .then((data) => {
        this.client = data;
      });
  }

}
