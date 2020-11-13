import { Component, OnInit } from '@angular/core';
import { UserService } from './user.service';

// My component
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(public userService : UserService) 
  {
    this.show = true;
    this.className = 'blue';
  }

  ngOnInit() {
    
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
  show: boolean;
  items: ['1','2'];
  className: string;

}

export let pepe = new String();
