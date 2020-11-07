import { Component } from '@angular/core';
import { UserService } from './user.service';

// My component
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(public userService : UserService) 
  {
  }

  f() {
    //a = <span>24</span>
    return 24;
  }
  // Declaration of user
  user = {
    name: 'John'
  };
  // Declaration of title
  title = 'test1';

}

export let pepe = new String();
