// ts-node main.ts

import { App } from './src/app';
import { SrcFile } from './src/srcfile';
import { Html } from './src/html';


let html = new Html();
let app = new App(new SrcFile(),html);

console.log("Starting...");
app.process('angular/projects/test1/src', 'main.ts', 'react-out/src');
console.log('Done!');
