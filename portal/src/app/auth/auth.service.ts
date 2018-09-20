import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

import { environment } from '../../environments/environment';
import { ApiService } from '../_services/api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public loginInProgress: Boolean = false;
  private token: string;
  private amazon;

  public user: {
    user_id: string
  };

  constructor(
    private $router: Router,
    private $api: ApiService,
    private $jwtHelper: JwtHelperService
  ) {
    // load the token (if present) from local storage on page init
    this.loadToken();

    if ((<any>window).amazon) {
      this.amazon = (<any>window).amazon;
      this.setClientId();
    }

    (<any>window).onAmazonLoginReady = () => {
      this.amazon = (<any>window).amazon;
      this.setClientId();
    };
  }

  setClientId() {
    this.amazon.Login.setClientId(environment.amazon.clientId);
  }

  loginWithAmazon() {
    return new Promise((resolve, reject) => {
      this.amazon.Login.authorize({
        scope: 'profile:user_id'
      }, (response) => {
        if (response.access_token) {
          this.loginInProgress = true;
          return resolve(this.login(response));
        } else {
          return reject(response);
        }
      });
    })
    .then(() => {
      this.loginInProgress = false;
      return true;
    })
    .catch((err) => {
      if (err) {
        console.log(err);
      }
      this.loginInProgress = false;
      return false;
    });
  }

  login(lwaResponse) {
    return this.$api.post('/login', lwaResponse)
      .toPromise()
      .then((resp: { expires_in: number, access_token: string }) => {
        if (!this.validateToken(resp.access_token)) {
          throw new Error('Invalid username or password.');
        } else {
          window.localStorage.setItem(environment.jwt.tokenKey, resp.access_token);
        }
      });
  }

  logout() {
    this.user = null;
    this.token = null;
    window.localStorage.removeItem(environment.jwt.tokenKey);
    this.amazon.Login.logout();
    this.$router.navigate(['']);
  }

  loadToken() {
    const token = window.localStorage.getItem(environment.jwt.tokenKey);
    if (token) {
      this.validateToken(token);
    }
  }

  validateToken(token: string) {
    try {
      this.user = this.$jwtHelper.decodeToken(token);
      this.token = token;
      return true;
    } catch (e) {
      window.localStorage.removeItem(environment.jwt.tokenKey);
      this.token = null;
      return false;
    }

  }

  isLoggedIn() {
    return this.user && this.token && !this.$jwtHelper.isTokenExpired(this.token);
  }

}
