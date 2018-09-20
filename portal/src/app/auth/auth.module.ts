import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { JwtModule } from '@auth0/angular-jwt';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth-guard.service';

export function tokenGetter() {
  return localStorage.getItem(environment.jwt.tokenKey);
}

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        whitelistedDomains: environment.jwt.whitelistedDomains,
        blacklistedRoutes: environment.jwt.blacklistedRoutes,
        headerName: 'x-jwt',
        authScheme: ''
      }
    })
  ],
  providers: [
    AuthService,
    AuthGuard,
  ],
  declarations: []
})
export class AuthModule { }
