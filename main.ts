// ts-node --skip-project main.ts

import { App } from './src/app';
import { SrcFile } from './src/srcfile';
import { Html } from './src/html';


let html = new Html();
let app = new App(new SrcFile(html),html);

console.log("Starting...");
app.process('angular/projects/test1/src','main.ts', 'react-out/src');
//app.process('angular/projects/test1/src/app/app.component.ts', 'react-out/src');
//app.process('tmp/test.tsx', './.out');
