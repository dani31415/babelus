// ts-node --skip-project main.ts

import { App } from './src/app';
import { SrcFile } from './src/srcfile';
import { Html } from './src/html';


let html = new Html();
let app = new App(new SrcFile(html),html);

//app.process('src/main.ts', './.out');
app.process('angular/projects/test1/src/app/app.component.ts', './.out');
//app.process('tmp/test.tsx', './.out');
