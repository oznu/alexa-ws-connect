import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private $auth: AuthService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    if (this.$auth.isLoggedIn()) {
      return true;
    } else {
      // store desired route in session storage
      window.sessionStorage.setItem('target_route', state.url);

      // try login with amazon
      this.$auth.loginWithAmazon();

      return false;
    }
  }
}
