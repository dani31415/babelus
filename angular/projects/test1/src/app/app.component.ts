import { Component } from '@angular/core';

// My component
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  f() {
    //a = <span>24</span>
    return 24;
  }
  title = 'test1';
  // Declaration of a
  a =  4 ;
}
