import { BaseFeature } from './features/base';
import { IterateFeature } from './features/iterate';
import { ComponentFeature } from './features/component';
import { InputFeature } from './features/input';
import { DependencyInjectionFeature } from './features/dependency-injection';
import { Feature } from './features/feature';
import { App } from './app';
import { SrcFile } from './srcfile';
import { Html } from './html';

export let AppBuilder = {
    app: function() {
        let html = new Html();
        let features : Feature[] = [
            new BaseFeature(),
            new ComponentFeature(html),
            new InputFeature(),
            new DependencyInjectionFeature(),
            new IterateFeature()
        ]
        let srcFile = new SrcFile();

        let app = new App(srcFile,html,features);
        return app;
    }
}
