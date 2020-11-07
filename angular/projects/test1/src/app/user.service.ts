import { Injectable } from '@angular/core';

import { RoleService } from './role.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  public name : string = 'Your name';
  public role: string;

  constructor(private roleService:RoleService) {
    this.role =  this.roleService.roleName;
   }
}
