// ts-node main.ts
import { AppBuilder } from './src/app-builder';

console.log("Starting...");
let app = AppBuilder.app();
app.process('angular/projects/test1/src', 'main.ts', 'react-out/src');
console.log('Done!');
