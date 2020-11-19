import { NgxIndexedDBService } from './ngx-indexed-db/indexed-db.service';
import * as meta from './ngx-indexed-db/indexed-db.meta';

export type DBConfig = meta.DBConfig

export class NgxIndexedDBModule {
    static forRoot(dbConfig:DBConfig) : {ngxIndexedDBService:NgxIndexedDBService} {
        return {ngxIndexedDBService:new NgxIndexedDBService(dbConfig)};
    }
}

export { NgxIndexedDBService };
